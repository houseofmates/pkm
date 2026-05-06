// example plugin demonstrating the plugin system
import { PluginManifest } from './plugin-types';

export const examplePluginManifest: PluginManifest = {
  id: 'example-hello-world',
  name: 'Hello World Example',
  version: '1.0.0',
  description: 'A simple example plugin that demonstrates the PKM plugin system',
  author: 'PKM Team',
  homepage: 'https://github.com/yourusername/pkm',
  repository: 'https://github.com/yourusername/pkm',
  license: 'MIT',
  pkmVersion: '0.0.0', // compatible with all versions
  main: './example-plugin.ts',
  ui: {
    sidebar: {
      component: 'ExampleSidebar',
      position: 'bottom',
      icon: 'Smile'
    },
    toolbar: {
      component: 'ExampleToolbar',
      position: 'left'
    }
  },
  capabilities: {
    storage: true,
    sync: false,
    ai: false,
    database: false,
    canvasTools: false,
    importExport: false
  },
  permissions: ['read:ui', 'write:ui'],
  dependencies: {},
  configSchema: {
    greeting: {
      type: 'string',
      default: 'Hello from PKM Plugin!',
      description: 'The greeting message to display'
    },
    showIcon: {
      type: 'boolean',
      default: true,
      description: 'Whether to show the icon in the sidebar'
    }
  }
};

// in a real implementation, this would be a separate file that gets dynamically loaded
export async function initializeExamplePlugin(context: any): Promise<void> {
  console.log('Example plugin initialized');
  
  // register ui components
  context.registerComponent('ExampleSidebar', () => {
    const greeting = context.getState<string>('example-plugin-greeting') || 
                    'Hello from PKM Plugin!';
    const showIcon = context.getState<boolean>('example-plugin-showIcon') ?? true;
    
    return (
      <div className="p-4 border-t border-white/10">
        {showIcon && (
          <div className="flex items-center gap-2 mb-2">
            <Smile className="h-5 w-5 text-primary" />
            <span className="font-medium">{greeting.split(' ')[0]}</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {greeting}
        </p>
      </div>
    );
  });
  
  context.registerComponent('ExampleToolbar', () => {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
        <button 
          className="hover:bg-white/10 transition-colors rounded-lg p-1.5"
          onClick={() => {
            context.notify('Example Plugin', 'Hello from the toolbar!', 'info');
          }}
        >
          <Smile className="h-4 w-4" />
        </button>
      </div>
    );
  });
  
  // set default configuration
  context.setState('example-plugin-greeting', 'Hello from PKM Plugin!');
  context.setState('example-plugin-showIcon', true);
  
  // listen for configuration changes
  context.subscribeToState('example-plugin-greeting', (value) => {
    console.log(`Example plugin greeting changed to: ${value}`);
  });
  
  context.subscribeToState('example-plugin-showIcon', (value) => {
    console.log(`Example plugin showIcon changed to: ${value}`);
  });
}

export async function destroyExamplePlugin(): Promise<void> {
  console.log('Example plugin destroyed');
  // cleanup would happen here
}