import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  overscan?: number;
  groupBy?: (item: T) => string;
  renderGroupHeader?: (group: string) => ReactNode;
}

/**
 * Virtual scrolling list component
 * Renders only visible items for performance with large lists
 */
export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  className,
  overscan = 5,
  groupBy,
  renderGroupHeader,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, start - overscan);
    const endIndex = Math.min(items.length, start + visibleCount + overscan);
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Update container height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Group items if groupBy is provided
  const groupedItems = useMemo(() => {
    if (!groupBy) return null;
    
    const groups: Record<string, { items: T[]; startIndex: number }> = {};
    let currentIndex = 0;
    
    items.forEach((item) => {
      const groupKey = groupBy(item);
      if (!groups[groupKey]) {
        groups[groupKey] = { items: [], startIndex: currentIndex };
      }
      groups[groupKey].items.push(item);
      currentIndex++;
    });
    
    return groups;
  }, [items, groupBy]);

  // Calculate total height
  const totalHeight = items.length * itemHeight;

  // Render visible items
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    const result: ReactNode[] = [];

    if (groupedItems && renderGroupHeader) {
      // Handle grouped virtual list
      let currentIndex = 0;
      let currentGroup: string | null = null;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const groupKey = groupBy!(item);
        
        // Add group header when group changes
        if (groupKey !== currentGroup) {
          currentGroup = groupKey;
          if (i >= startIndex && i < endIndex) {
            result.push(
              <div
                key={`group-${groupKey}`}
                style={{
                  position: 'absolute',
                  top: currentIndex * itemHeight,
                  height: itemHeight,
                  left: 0,
                  right: 0,
                }}
              >
                {renderGroupHeader(groupKey)}
              </div>
            );
          }
          currentIndex++;
        }
        
        // Add item if in visible range
        if (i >= startIndex && i < endIndex) {
          result.push(
            <div
              key={i}
              style={{
                position: 'absolute',
                top: currentIndex * itemHeight,
                height: itemHeight,
                left: 0,
                right: 0,
              }}
            >
              {renderItem(item, i)}
            </div>
          );
        }
        currentIndex++;
      }
    } else {
      // Simple virtual list
      for (let i = startIndex; i < endIndex; i++) {
        result.push(
          <div
            key={i}
            style={{
              position: 'absolute',
              top: i * itemHeight,
              height: itemHeight,
              left: 0,
              right: 0,
            }}
          >
            {renderItem(items[i], i)}
          </div>
        );
      }
    }

    return result;
  }, [visibleRange, items, itemHeight, renderItem, groupedItems, groupBy, renderGroupHeader]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn('overflow-y-auto relative', className)}
      style={{ contain: 'strict' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}

/**
 * Simplified virtual list without grouping
 */
export function SimpleVirtualList<T>({
  items,
  itemHeight,
  renderItem,
  className,
  overscan = 3,
}: Omit<VirtualListProps<T>, 'groupBy' | 'renderGroupHeader'>) {
  return (
    <VirtualList
      items={items}
      itemHeight={itemHeight}
      renderItem={renderItem}
      className={className}
      overscan={overscan}
    />
  );
}
