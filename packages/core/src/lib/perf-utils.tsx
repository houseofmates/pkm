{/* eslint-disable */}
import { lazy, Suspense, ComponentType, useMemo, useCallback, useState, useEffect, useRef } from 'react'

export interface PaginationConfig {
  pageSize: number
  initialPage?: number
}

export interface PaginatedResult<T> {
  data: T[]
  currentPage: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  next: () => void
  prev: () => void
  goTo: (page: number) => void
}

export function usePagination<T>(
  items: T[],
  config: PaginationConfig
): PaginatedResult<T> {
  const { pageSize, initialPage = 0 } = config
  const [currentPage, setCurrentPage] = useState(initialPage)

  const totalPages = useMemo(() =>
    Math.ceil(items.length / pageSize),
    [items.length, pageSize]
  )

  const data = useMemo(() => {
    const start = currentPage * pageSize
    return items.slice(start, start + pageSize)
  }, [items, currentPage, pageSize])

  const hasNext = currentPage < totalPages - 1
  const hasPrev = currentPage > 0

  const next = useCallback(() => {
    if (hasNext) setCurrentPage(p => p + 1)
  }, [hasNext])

  const prev = useCallback(() => {
    if (hasPrev) setCurrentPage(p => p - 1)
  }, [hasPrev])

  const goTo = useCallback((page: number) => {
    const clamped = Math.max(0, Math.min(page, totalPages - 1))
    setCurrentPage(clamped)
  }, [totalPages])

  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
  // eslint-disable-next-line
      setCurrentPage(totalPages - 1)
    }
  }, [currentPage, totalPages])

  return {
    data,
    currentPage,
    totalPages,
    hasNext,
    hasPrev,
    next,
    prev,
    goTo
  }
}

export function lazyLoad<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(factory)

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback || <div className="p-4 text-center">loading...</div>}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

export function useVirtualizedList<T>(
  items: T[],
  itemHeight: number,
  overscan = 5
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateHeight = () => {
      setContainerHeight(container.clientHeight)
    }

    updateHeight()

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [])

  const visibleRange = useMemo(() => {
    const startIdx = Math.floor(scrollTop / itemHeight)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const endIdx = Math.min(startIdx + visibleCount + overscan, items.length)
    const start = Math.max(0, startIdx - overscan)

    return { start, end: endIdx }
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan])

  const visibleItems = useMemo(() =>
    items.slice(visibleRange.start, visibleRange.end).map((item, idx) => ({
      item,
      index: visibleRange.start + idx,
      style: {
        position: 'absolute' as const,
        top: (visibleRange.start + idx) * itemHeight,
        height: itemHeight,
        left: 0,
        right: 0
      }
    })),
    [items, visibleRange, itemHeight]
  )

  const totalHeight = items.length * itemHeight

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    containerRef,
    visibleItems,
    totalHeight,
    onScroll,
    scrollTop
  }
}

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay])
}

export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const lastCallRef = useRef(0)

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCallRef.current >= limit) {
      lastCallRef.current = now
      callback(...args)
    }
  }, [callback, limit])
}

export interface CanvasVirtualizationConfig {
  itemWidth: number
  itemHeight: number
  gap: number
  containerWidth: number
  containerHeight: number
}

export interface VirtualCanvasItem {
  id: string
  x: number
  y: number
  width: number
  height: number
  visible: boolean
}

export function useVirtualizedCanvas(
  items: Array<{ id: string; x: number; y: number }>,
  config: CanvasVirtualizationConfig
) {
  const { itemWidth, itemHeight, gap, containerWidth, containerHeight } = config

  const visibleItems = useMemo(() => {
    return items
      .map(item => {
        const pixelX = item.x * (itemWidth + gap)
        const pixelY = item.y * (itemHeight + gap)
        const visible =
          pixelX + itemWidth >= -gap &&
          pixelX <= containerWidth + gap &&
          pixelY + itemHeight >= -gap &&
          pixelY <= containerHeight + gap

        return {
          id: item.id,
          x: pixelX,
          y: pixelY,
          width: itemWidth,
          height: itemHeight,
          visible
        }
      })
      .filter(item => item.visible)
  }, [items, itemWidth, itemHeight, gap, containerWidth, containerHeight])

  return visibleItems
}

export function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) {
  const observerRef = useRef<IntersectionObserver | null>(null)

  const observe = useCallback((element: Element) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(callback, options)
    }
    observerRef.current.observe(element)
  }, [callback, options])

  const unobserve = useCallback((element: Element) => {
    observerRef.current?.unobserve(element)
  }, [])

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  return { observe, unobserve }
}

export function prefetchComponent<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): Promise<{ default: T }> {
  return factory()
}

export function usePrefetchOnHover<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  const prefetchedRef = useRef(false)

  const onMouseEnter = useCallback(() => {
    if (!prefetchedRef.current) {
      prefetchedRef.current = true
      prefetchComponent(factory)
    }
  }, [factory])

  return onMouseEnter
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export function useChunkedData<T>(
  data: T[],
  chunkSize: number,
  visibleChunks: number
) {
  const [loadedChunks, setLoadedChunks] = useState(1)

  const chunks = useMemo(() =>
    chunkArray(data, chunkSize),
    [data, chunkSize]
  )

  const visibleData = useMemo(() =>
    chunks.slice(0, loadedChunks).flat(),
    [chunks, loadedChunks]
  )

  const hasMore = loadedChunks < chunks.length

  const loadMore = useCallback(() => {
    if (hasMore) {
      setLoadedChunks(c => Math.min(c + visibleChunks, chunks.length))
    }
  }, [hasMore, visibleChunks, chunks.length])

  return {
    data: visibleData,
    hasMore,
    loadMore,
    loadedChunks,
    totalChunks: chunks.length
  }
}

export function useMeasure() {
  const ref = useRef<HTMLElement>(null)
  const [bounds, setBounds] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const updateBounds = () => {
      const rect = element.getBoundingClientRect()
      setBounds({ width: rect.width, height: rect.height })
    }

    updateBounds()

    const resizeObserver = new ResizeObserver(updateBounds)
    resizeObserver.observe(element)

    return () => resizeObserver.disconnect()
  }, [])

  return { ref, bounds }
}
