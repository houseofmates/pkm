// getsidebarcolors.ts// utility to fetch sidebar colors from api, fallback to local json
export async function getSidebarColors(): Promise<any> {
  // try api first  try {
    const res = await fetch('/api/sidebar-colors'); // adjust endpoint as needed
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // api failed, fallback to local json  }
  // fallback: local file  try {
    const res = await fetch('/sidebar-colors.json');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // both sources failed  }
  // final fallback: hardcoded default  return {
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
