/**
 * Example plugin demonstrating the PKM plugin system
 */
import {
  PKMPlugin,
  PluginContext,
  DataSourceType,
  ViewDefinition,
  NodeType
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ExamplePlugin implements PKMPlugin {
  id = 'example';
  name = 'Example Plugin';
  version = '1.0.0';
  dataSources = [
    {
      type: DataSourceType.LOCAL,
      name: 'Example Local Source',
      config: { path: './example-data' }
    }
  ];

  views: ViewDefinition[] = [
    {
      id: 'example-default',
      name: 'Default View',
      component: 'ExampleView',
      default: true
    },
    {
      id: 'example-table',
      name: 'Table View',
      component: 'ExampleTableView'
    }
  ];

  nodeTypes: NodeType[] = [
    {
      id: 'example-note',
      name: 'Example Note',
      fields: [
        { id: 'title', name: 'Title', type: 'text', required: true },
        { id: 'content', name: 'Content', type: 'markdown', required: false }
      ],
      defaultView: 'example-default'
    }
  ];

  async activate(context: PluginContext): Promise<void> {
    // Register data sources
    for (const dataSource of this.dataSources) {
      await context.registerDataSource(dataSource);
    }

    // Register views
    for (const view of this.views) {
      await context.registerView(view);
    }

    // Register node types
    for (const nodeType of this.nodeTypes) {
      await context.registerNodeType(nodeType);
    }

    // Register commands
    context.registerCommand({
      id: 'example.create-note',
      name: 'Create Example Note',
      shortcut: 'Ctrl+Shift+E',
      handler: () => {
        const note = {
          id: uuidv4(),
          type: 'example-note',
          title: 'New Example Note',
          content: '',
          createdAt: new Date()
        };
        context.emit('node:created', note);
      }
    });
  }

  async deactivate(context: PluginContext): Promise<void> {
    // Cleanup
    context.unregisterCommand('example.create-note');
  }
}

// Export factory function
export function createExamplePlugin(): PKMPlugin {
  return new ExamplePlugin();
}
