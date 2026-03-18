// getSidebarColors.ts
// Utility to fetch sidebar colors from API, fallback to local JSON

export async function getSidebarColors(): Promise<any> {
  // Try API first
  try {
    const res = await fetch('/api/sidebar-colors'); // Adjust endpoint as needed
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // API failed, fallback to local JSON
  }
  // Fallback: local file
  try {
    const res = await fetch('/sidebar-colors.json');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Both sources failed
  }
  // Final fallback: hardcoded default
  return {
    primary: '#f6b012',
    secondary: '#252525',
    accent: '#ef4444',
    background: '#0a0a0a',
    sidebar: {
      default: '#252525',
      active: '#f6b012',
      hover: '#f6b01299'
    }
  };
}
