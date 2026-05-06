import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SwipeNavigationOptions {
  threshold?: number; // minimum distance for swipe to trigger
  timeout?: number; // maximum time for swipe gesture
}

export function useSwipeNavigation(options: SwipeNavigationOptions = {}) {
  const { threshold = 50, timeout = 300 } = options;
  const navigate = useNavigate();
  
  useEffect(() => {
    let startX: number | null = null;
    let startY: number | null = null;
    let startTime: number | null = null;
    
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startTime = Date.now();
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      if (startX === null || startY === null || startTime === null) return;
      
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const duration = endTime - startTime;
      
      // check if it's a swipe (not just a tap)
      if (duration <= timeout && Math.abs(deltaX) > threshold && Math.abs(deltaY) < 50) {
        // horizontal swipe
        if (deltaX > 0) {
          // swipe right - go to previous tab
          navigateToPreviousTab();
        } else {
          // swipe left - go to next tab
          navigateToNextTab();
        }
      }
      
      // reset
      startX = null;
      startY = null;
      startTime = null;
    };
    
    const navigateToPreviousTab = () => {
      const path = window.location.pathname;
      if (path === '/databases' || path.startsWith('/databases/')) {
        navigate('/journal');
      } else if (path === '/journal') {
        navigate('/calendar');
      } else if (path === '/calendar') {
        navigate('/headmates');
      } else if (path === '/headmates') {
        navigate('/captures');
      } else if (path === '/captures') {
        navigate('/home');
      } else {
        // default to home for other paths
        navigate('/');
      }
    };
    
    const navigateToNextTab = () => {
      const path = window.location.pathname;
      if (path === '/home') {
        navigate('/captures');
      } else if (path === '/captures') {
        navigate('/headmates');
      } else if (path === '/headmates') {
        navigate('/calendar');
      } else if (path === '/calendar') {
        navigate('/journal');
      } else if (path === '/journal') {
        navigate('/databases');
      } else {
        // default to home for other paths
        navigate('/');
      }
    };
    
    // add event listeners
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // cleanup
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate, threshold, timeout]);
}