// plugin system type definitions
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  // pkm specific fields
  pkmVersion: string; // minimum pkm version required
  main: string; // entry point
  ui?: {
    // ui extensions
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
  // capabilities
  capabilities?: {
    // data storage
    storage?: boolean;
    // sync capabilities
    sync?: boolean;
    // ai/ml capabilities
    ai?: boolean;
    // custom database tables
    database?: boolean;
    // custom canvas tools
    canvasTools?: boolean;
    // custom import/export formats
    importExport?: boolean;
  };
  // permissions
  permissions?: string[]; // e.g., ['read:database', 'write:canvas']
  // dependencies
  dependencies?: Record<string, string>; // package name -> version
  peerDependencies?: Record<string, string>;
  // configuration schema
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
  // core services
  api: any; // nocobase client
  storage: any; // local storage/indexeddb
  eventBus: any; // event emission/subscription
  canvas: any; // canvas api (if available)
  ui: any; // ui utilities
  // lifecycle methods
  registerComponent: (type: string, component: React.ComponentType<any>) => void;
  unregisterComponent: (type: string) => void;
  registerRoute: (path: string, component: React.ComponentType<any>) => void;
  unregisterRoute: (path: string) => void;
  registerStyle: (css: string) => void;
  unregisterStyle: (css: string) => void;
  // state management
  getState: <T>(key: string) => T | undefined;
  setState: <T>(key: string, value: T) => void;
  subscribeToState: <T>(key: string, callback: (value: T) => void) => () => void;
  // data access
  getDatabase: <T>() => Promise<T>;
  saveDatabase: (data: any) => Promise<void>;
  // file operations
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  // notification system
  notify: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  // progress reporting
  setProgress: (percentage: number, message?: string) => void;
  // logging
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any) => void;
}

export interface Plugin {
  manifest: PluginManifest;
  context: PluginContext;
  // lifecycle hooks
  initialize?: (context: PluginContext) => Promise<void> | void;
  destroy?: () => Promise<void> | void;
  // optional hooks
  onStateChange?: (key: string, value: any) => void;
  onCanvasChange?: (data: any) => void;
  onApiReady?: (api: any) => void;
  // ui rendering (if plugin provides ui components)
  renderUI?: () => React.ReactElement | null;
}

// plugin manager interface
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