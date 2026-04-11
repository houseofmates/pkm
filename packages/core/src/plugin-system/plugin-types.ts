// Plugin System Type Definitions
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  // PKM specific fields
  pkmVersion: string; // minimum PKM version required
  main: string; // entry point
  ui?: {
    // UI extensions
    sidebar?: {
      component: string; // path to component
      position?: 'top' | 'bottom';
      icon?: string; // lucide icon name
    };
    toolbar?: {
      component: string;
      position?: 'left' | 'right' | 'center';
    };
    contextMenu?: {
      component: string;
      when?: string; // condition when to show
    };
  };
  // Capabilities
  capabilities?: {
    // Data storage
    storage?: boolean;
    // Sync capabilities
    sync?: boolean;
    // AI/ML capabilities
    ai?: boolean;
    // Custom database tables
    database?: boolean;
    // Custom canvas tools
    canvasTools?: boolean;
    // Custom import/export formats
    importExport?: boolean;
  };
  // Permissions
  permissions?: string[]; // e.g., ['read:database', 'write:canvas']
  // Dependencies
  dependencies?: Record<string, string>; // package name -> version
  peerDependencies?: Record<string, string>;
  // Configuration schema
  configSchema?: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      default?: any;
      description?: string;
      options?: any[]; // for enum types
    };
  };
}

export interface PluginContext {
  // Core services
  api: any; // NocoBase client
  storage: any; // Local storage/indexeddb
  eventBus: any; // Event emission/subscription
  canvas: any; // Canvas API (if available)
  ui: any; // UI utilities
  // Lifecycle methods
  registerComponent: (type: string, component: React.ComponentType<any>) => void;
  unregisterComponent: (type: string) => void;
  registerRoute: (path: string, component: React.ComponentType<any>) => void;
  unregisterRoute: (path: string) => void;
  registerStyle: (css: string) => void;
  unregisterStyle: (css: string) => void;
  // State management
  getState: <T>(key: string) => T | undefined;
  setState: <T>(key: string, value: T) => void;
  subscribeToState: <T>(key: string, callback: (value: T) => void) => () => void;
  // Data access
  getDatabase: <T>() => Promise<T>;
  saveDatabase: (data: any) => Promise<void>;
  // File operations
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  // Notification system
  notify: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  // Progress reporting
  setProgress: (percentage: number, message?: string) => void;
  // Logging
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any) => void;
}

export interface Plugin {
  manifest: PluginManifest;
  context: PluginContext;
  // Lifecycle hooks
  initialize?: (context: PluginContext) => Promise<void> | void;
  destroy?: () => Promise<void> | void;
  // Optional hooks
  onStateChange?: (key: string, value: any) => void;
  onCanvasChange?: (data: any) => void;
  onApiReady?: (api: any) => void;
  // UI rendering (if plugin provides UI components)
  renderUI?: () => React.ReactElement | null;
}

// Plugin manager interface
export interface PluginManager {
  registerPlugin: (plugin: Plugin) => Promise<void>;
  unregisterPlugin: (pluginId: string) => Promise<void>;
  getPlugin: (pluginId: string) => Plugin | undefined;
  getPlugins: () => Plugin[];
  initializePlugin: (pluginId: string) => Promise<void>;
  destroyPlugin: (pluginId: string) => Promise<void>;
  initializeAll: () => Promise<void>;
  destroyAll: () => Promise<void>;
}