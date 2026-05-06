import { Plugin, PluginManifest, PluginContext, PluginManager } from './plugin-types';
import { EventEmitter } from 'events';

class PluginManagerImpl extends EventEmitter implements PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private initializedPlugins: Set<string> = new Set();
  
  constructor() {
    super();
    this.setMaxListeners(0); // remove warning limit
  }
  
  async registerPlugin(plugin: Plugin): Promise<void> {
    // validate plugin manifest
    this.validateManifest(plugin.manifest);
    
    // check if already registered
    if (this.plugins.has(plugin.manifest.id)) {
      throw new Error(`Plugin ${plugin.manifest.id} is already registered`);
    }
    
    // check dependencies
    await this.checkDependencies(plugin.manifest);
    
    // store plugin
    this.plugins.set(plugin.manifest.id, plugin);
    
    // emit event
    this.emit('pluginRegistered', plugin.manifest.id);
    
    // auto-initialize if desired
    // await this.initializeplugin(plugin.manifest.id);
  }
  
  async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    // destroy if initialized
    if (this.initializedPlugins.has(pluginId)) {
      await this.destroyPlugin(pluginId);
    }
    
    // remove from map
    this.plugins.delete(pluginId);
    
    // emit event
    this.emit('pluginUnregistered', pluginId);
  }
  
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  
  async initializePlugin(pluginId: string): Promise<void> {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (this.initializedPlugins.has(pluginId)) {
      return; // already initialized
    }
    
    try {
      // create plugin context
      const context = this.createPluginContext(plugin);
      
      // initialize plugin
      if (plugin.initialize) {
        await plugin.initialize(context);
      }
      
      this.initializedPlugins.add(pluginId);
      this.emit('pluginInitialized', pluginId);
    } catch (error) {
      this.emit('pluginInitializeError', { pluginId, error });
      throw error;
    }
  }
  
  async destroyPlugin(pluginId: string): Promise<void> {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (!this.initializedPlugins.has(pluginId)) {
      return; // not initialized
    }
    
    try {
      // destroy plugin
      if (plugin.destroy) {
        await plugin.destroy();
      }
      
      this.initializedPlugins.delete(pluginId);
      this.emit('pluginDestroyed', pluginId);
    } catch (error) {
      this.emit('pluginDestroyError', { pluginId, error });
      throw error;
    }
  }
  
  async initializeAll(): Promise<void> {
    const pluginIds = Array.from(this.plugins.keys());
    for (const pluginId of pluginIds) {
      try {
        await this.initializePlugin(pluginId);
      } catch (error) {
        console.error(`Failed to initialize plugin ${pluginId}:`, error);
        // continue with other plugins
      }
    }
  }
  
  async destroyAll(): Promise<void> {
    const pluginIds = Array.from(this.initializedPlugins.values());
    for (const pluginId of pluginIds) {
      try {
        await this.destroyPlugin(pluginId);
      } catch (error) {
        console.error(`Failed to destroy plugin ${pluginId}:`, error);
        // continue with other plugins
      }
    }
  }
  
  private validateManifest(manifest: PluginManifest): void {
    // required fields
    if (!manifest.id) throw new Error('Plugin manifest missing id');
    if (!manifest.name) throw new Error('Plugin manifest missing name');
    if (!manifest.version) throw new Error('Plugin manifest missing version');
    if (!manifest.pkmVersion) throw new Error('Plugin manifest missing pkmVersion');
    if (!manifest.main) throw new Error('Plugin manifest missing main entry point');
    
    // validate version format (semver)
    const versionRegex = /^\d+\.\d+\.\d+(-.+)?$/;
    if (!versionRegex.test(manifest.version)) {
      throw new Error('Plugin version must be in semver format');
    }
  }
  
  private async checkDependencies(manifest: PluginManifest): Promise<void> {
    // check pkm version
    const requiredVersion = manifest.pkmVersion;
    const currentVersion = process.env.PKM_VERSION || '0.0.0';
    // simple version check - in production use semver library
    if (this.compareVersions(currentVersion, requiredVersion) < 0) {
      throw new Error(`Plugin requires PKM version ${requiredVersion}, but ${currentVersion} is installed`);
    }
    
    # 
    if (manifest.dependencies) {
      for (const [depName, depVersion] of Object.entries(manifest.dependencies)) {
        // in a real implementation, check package.json or node_modules
        # this is a placeholder - actual implementation would check installed packages
        console.warn(`Dependency check for ${depName}@${depVersion} not implemented`);
      }
    }
  }
  
  private compareVersions(current: string, required: string): number {
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const requiredPart = requiredParts[i] || 0;
      
      if (currentPart < requiredPart) return -1;
      if (currentPart > requiredPart) return 1;
    }
    
    return 0;
  }
  
  private createPluginContext(plugin: Plugin): PluginContext {
    // this would be implemented with actual service instances
    // for now, returning a mock context
    return {
      api: {}, // would be nocobase client
      storage: {}, // would be indexeddb/localstorage wrapper
      eventBus: new EventEmitter(),
      canvas: {}, // would be canvas api
      ui: {}, // would be ui utilities
      registerComponent: (type: string, component: React.ComponentType<any>) => {
        console.log(`Registering component ${type} from plugin ${plugin.manifest.id}`);
      },
      unregisterComponent: (type: string) => {
        console.log(`Unregistering component ${type} from plugin ${plugin.manifest.id}`);
      },
      registerRoute: (path: string, component: React.ComponentType<any>) => {
        console.log(`Registering route ${path} from plugin ${plugin.manifest.id}`);
      },
      unregisterRoute: (path: string) => {
        console.log(`Unregistering route ${path} from plugin ${plugin.manifest.id}`);
      },
      registerStyle: (css: string) => {
        console.log(`Registering style from plugin ${plugin.manifest.id}`);
      },
      unregisterStyle: (css: string) => {
        console.log(`Unregistering style from plugin ${plugin.manifest.id}`);
      },
      getState: <T>(key: string): T | undefined => {
        console.log(`Getting state ${key} for plugin ${plugin.manifest.id}`);
        return undefined;
      },
      setState: <T>(key: string, value: T) => {
        console.log(`Setting state ${key} for plugin ${plugin.manifest.id}`);
      },
      subscribeToState: <T>(key: string, callback: (value: T) => void) => {
        console.log(`Subscribing to state ${key} for plugin ${plugin.manifest.id}`);
        return () => {};
      },
      getDatabase: async <T>(): Promise<T> => {
        console.log(`Getting database for plugin ${plugin.manifest.id}`);
        return {} as T;
      },
      saveDatabase: async (data: any): Promise<void> => {
        console.log(`Saving database for plugin ${plugin.manifest.id}`);
      },
      readFile: async (path: string): Promise<string> => {
        console.log(`Reading file ${path} for plugin ${plugin.manifest.id}`);
        return '';
      },
      writeFile: async (path: string, content: string): Promise<void> => {
        console.log(`Writing file ${path} for plugin ${plugin.manifest.id}`);
      },
      notify: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => {
        console.log(`[${type || 'info'}] ${title}: ${message}`);
      },
      setProgress: (percentage: number, message?: string) => {
        console.log(`Progress: ${percentage}% - ${message || ''}`);
      },
      log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any) => {
        console.log(`[${level}] ${message}`, meta || '');
      }
    } as PluginContext;
  }
}

// export singleton instance
export const pluginManager = new PluginManagerImpl();