/**
 * backend health monitoring hook
 * provides real-time connection status and health metrics
 * integrates with the /api/health endpoint for comprehensive monitoring
 */

import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface HealthData {
  status: 'ok' | 'degraded'
  timestamp: string
  uptime: number
  memory: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
  connections: {
    websocket: number
    http: string
  }
  services: {
    database: string
    filesystem: string
  }
  version: string
  nodeVersion: string
  platform: string
  error?: string
}

interface BackendHealthState {
  isConnected: boolean
  isHealthy: boolean
  isLoading: boolean
  error: string | null
  lastCheck: number
  healthData: HealthData | null
  latency: number
  reconnectAttempts: number
}

interface UseBackendHealthOptions {
  checkInterval?: number
  enableWebSocket?: boolean
  timeout?: number
  maxRetries?: number
}

export function useBackendHealth(options: UseBackendHealthOptions = {}) {
  const {
    checkInterval = 30000, // 30 seconds
    enableWebSocket = true,
    timeout = 5000, // 5 seconds
    maxRetries = 3
  } = options

  const [state, setState] = useState<BackendHealthState>({
    isConnected: false,
    isHealthy: false,
    isLoading: true,
    error: null,
    lastCheck: 0,
    healthData: null,
    latency: 0,
    reconnectAttempts: 0
  })

  const [socket, setSocket] = useState<Socket | null>(null)

  const checkHealth = useCallback(async () => {
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(timeout)
      })

      const latency = Date.now() - startTime
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const healthData: HealthData = await response.json()
      
      setState(prev => ({
        ...prev,
        isConnected: true,
        isHealthy: healthData.status === 'ok',
        isLoading: false,
        error: null,
        lastCheck: Date.now(),
        healthData,
        latency,
        reconnectAttempts: 0
      }))

      return healthData
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isHealthy: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: Date.now(),
        healthData: null,
        latency: 0,
        reconnectAttempts: prev.reconnectAttempts + 1
      }))
      
      throw error
    }
  }, [timeout])

  const connectWebSocket = useCallback(() => {
    if (!enableWebSocket || socket?.connected) return

    const wsUrl = process.env.VITE_WS_URL || window.location.origin
    const newSocket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: false // we handle reconnection ourselves
    })

    newSocket.on('connect', () => {
      console.log('[BackendHealth] WebSocket connected')
      setState(prev => ({
        ...prev,
        isConnected: true,
        reconnectAttempts: 0
      }))
    })

    newSocket.on('disconnect', (reason) => {
      console.log('[BackendHealth] WebSocket disconnected:', reason)
      setState(prev => ({
        ...prev,
        isConnected: false
      }))
    })

    newSocket.on('connect_error', (error) => {
      console.error('[BackendHealth] WebSocket connection error:', error)
      setState(prev => ({
        ...prev,
        isConnected: false,
        reconnectAttempts: prev.reconnectAttempts + 1
      }))
    })

    // ping for latency measurement
    newSocket.on('ping', (callback) => {
      if (typeof callback === 'function') {
        callback({ timestamp: Date.now() })
      }
    })

    setSocket(newSocket)
  }, [enableWebSocket, socket])

  const disconnectWebSocket = useCallback(() => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
    }
  }, [socket])

  const reconnect = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      await checkHealth()
      if (enableWebSocket) {
        connectWebSocket()
      }
    } catch (error) {
      console.error('[BackendHealth] Reconnection failed:', error)
    }
  }, [checkHealth, connectWebSocket, enableWebSocket])

  // initial health check
  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  // periodic health checks
  useEffect(() => {
    if (checkInterval <= 0) return

    const interval = setInterval(() => {
      checkHealth()
    }, checkInterval)

    return () => clearInterval(interval)
  }, [checkInterval, checkHealth])

  // websocket connection management
  useEffect(() => {
    if (enableWebSocket && state.isConnected) {
      connectWebSocket()
    }

    return () => {
      disconnectWebSocket()
    }
  }, [enableWebSocket, state.isConnected, connectWebSocket, disconnectWebSocket])

  // auto-reconnection logic
  useEffect(() => {
    if (!state.isConnected && state.reconnectAttempts > 0 && state.reconnectAttempts < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000) // exponential backoff
      
      const timer = setTimeout(() => {
        console.log(`[BackendHealth] Attempting reconnection (${state.reconnectAttempts + 1}/${maxRetries})`)
        reconnect()
      }, delay)

      return () => clearTimeout(timer)
    }
  }, [state.isConnected, state.reconnectAttempts, maxRetries, reconnect])

  return {
    ...state,
    checkHealth,
    reconnect,
    isOnline: state.isConnected && state.isHealthy,
    hasWarnings: state.isConnected && !state.isHealthy,
    isCritical: !state.isConnected || state.reconnectAttempts >= maxRetries
  }
}

// convenience hook for simple connection status
export function useConnectionStatus() {
  const { isConnected, isHealthy, isLoading, error, latency } = useBackendHealth({
    checkInterval: 15000,
    enableWebSocket: false
  })

  return {
    status: isConnected ? (isHealthy ? 'online' : 'degraded') : 'offline',
    isLoading,
    error,
    latency,
    isConnected
  }
}