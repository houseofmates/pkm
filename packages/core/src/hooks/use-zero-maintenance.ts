/**
 * React hook for zero-maintenance service
 * provides reactive state management for zero-maintenance features
 */

import { useState, useEffect } from 'react'
import { zeroMaintenance } from '@/services/zero-maintenance.service'
import type { MaintenanceStatus } from '@/services/zero-maintenance.service'

export function useZeroMaintenance() {
  const [status, setStatus] = useState<MaintenanceStatus>(zeroMaintenance.getStatus())

  useEffect(() => {
    const updateStatus = () => {
      setStatus(zeroMaintenance.getStatus())
    }

    updateStatus()
    const interval = setInterval(updateStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  return {
    status,
    forceSave: () => zeroMaintenance.forceSave(),
    forceBackup: () => zeroMaintenance.forceBackup(),
    forceRecovery: (id?: string) => zeroMaintenance.forceRecovery(id)
  }
}