#!/usr/bin/env node
// pkm-hermes mcp bridge server
// bidirectional bridge between pkm app and hermes agent via mcp

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import pg from 'pg';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// config
const CONFIG = {
  contextServerUrl: 'http://localhost:3100',
  pkmRoot: '/home/house/pkm',
  postgres: {
    host: '192.168.4.233',
    port: 5432,
    database: 'nocobase',
    user: 'nocobase',
    // password loaded from env or .env file
  },
  screenshotDir: '/home/house/pkm/screenshots',
};

// load postgres password from pkm .env
function loadDbPassword() {
  const envPath = path.join(CONFIG.pkmRoot, '.env');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    const match = envContent.match(/DB_PASSWORD=["']?([^"'\n]+)["']?/);
    if (match) return match[1];
    const match2 = envContent.match(/NOCOBASE_DB_PASSWORD=["']?([^"'\n]+)["']?/);
    if (match2) return match2[1];
  }
  return process.env.DB_PASSWORD || process.env.NOCOBASE_DB_PASSWORD || '';
}

CONFIG.postgres.password = loadDbPassword();

// postgres pool
let pgPool = null;

function getPgPool() {
  if (!pgPool) {
    pgPool = new Pool({
      host: CONFIG.postgres.host,
      port: CONFIG.postgres.port,
      database: CONFIG.postgres.database,
      user: CONFIG.postgres.user,
      password: CONFIG.postgres.password,
    });
  }
  return pgPool;
}

// fetch context from electron context-server
async function fetchPkmContext() {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${CONFIG.contextServerUrl}/context`);
    if (!response.ok) {
      throw new Error(`context server returned ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    return { error: err.message, status: 'unavailable' };
  }
}

// capture screenshot of pkm window
async function captureScreenshot() {
  const timestamp = Date.now();
  const screenshotPath = path.join(CONFIG.screenshotDir, `pkm-${timestamp}.png`);
  
  // ensure dir exists
  if (!existsSync(CONFIG.screenshotDir)) {
    execSync(`mkdir -p ${CONFIG.screenshotDir}`);
  }
  
  try {
    // try to find and screenshot the pkm electron window
    // uses import from gnome-shell or xdotool fallback
    const windowId = execSync(
      "xdotool search --name 'pkm' | head -1",
      { encoding: 'utf-8' }
    ).trim();
    
    if (windowId) {
      execSync(`xdotool windowactivate --sync ${windowId} 2>/dev/null || true`);
      execSync(`gnome-screenshot -w -f ${screenshotPath} 2>/dev/null || ` +
               `import -window ${windowId} ${screenshotPath} 2>/dev/null || ` +
               `scrot -u ${screenshotPath} 2>/dev/null`);
      
      if (existsSync(screenshotPath)) {
        return { path: screenshotPath, success: true };
      }
    }
    
    // fallback: fullscreen screenshot
    execSync(`gnome-screenshot -f ${screenshotPath} 2>/dev/null || ` +
             `scrot ${screenshotPath} 2>/dev/null || ` +
             `import -window root ${screenshotPath}`);
    
    if (existsSync(screenshotPath)) {
      return { path: screenshotPath, success: true, note: 'fullscreen fallback' };
    }
    
    return { error: 'screenshot failed', success: false };
  } catch (err) {
    return { error: err.message, success: false };
  }
}

// mcp server instance
const server = new Server(
  {
    name: 'pkm-hermes-bridge',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_pkm_state',
        description: 'returns the current active note, tags, and metadata from the pkm app. ' +
                     'fetches context from the electron context-server on port 3100.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'capture_ui_context',
        description: 'triggers a screenshot of the pkm app window and returns the path ' +
                     'for multimodal analysis. useful when hermes needs to "see" what ' +
                     'the user is looking at.',
        inputSchema: {
          type: 'object',
          properties: {
            base64: {
              type: 'boolean',
              description: 'if true, return image as base64 instead of path',
            },
          },
          required: [],
        },
      },
      {
        name: 'manage_nocobase',
        description: 'execute sql or structured commands against the nocobase postgres ' +
                     'database at 192.168.4.233. supports queries, schema modifications, ' +
                     'and record operations. use with caution.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['query', 'execute', 'schema'],
              description: 'query: select/read-only. execute: write operations. ' +
                           'schema: ddl operations.',
            },
            sql: {
              type: 'string',
              description: 'raw sql statement to execute',
            },
            collection: {
              type: 'string',
              description: 'nocobase collection name for structured operations',
            },
            action: {
              type: 'string',
              enum: ['list', 'get', 'create', 'update', 'delete', 'describe'],
              description: 'action to perform on collection',
            },
            data: {
              type: 'object',
              description: 'data for create/update operations',
            },
            filter: {
              type: 'object',
              description: 'filter conditions for get/update/delete',
            },
            limit: {
              type: 'number',
              description: 'limit results (default: 100)',
            },
          },
          required: ['type'],
        },
      },
    ],
  };
});

// call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_pkm_state': {
      const context = await fetchPkmContext();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(context, null, 2),
          },
        ],
      };
    }

    case 'capture_ui_context': {
      const result = await captureScreenshot();
      
      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `error: ${result.error}`,
            },
          ],
          isError: true,
        };
      }

      if (args && args.base64) {
        // return as base64
        const imageBuffer = readFileSync(result.path);
        const base64 = imageBuffer.toString('base64');
        return {
          content: [
            {
              type: 'image',
              data: base64,
              mimeType: 'image/png',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `screenshot saved to: ${result.path}`,
          },
        ],
      };
    }

    case 'manage_nocobase': {
      const { type, sql, collection, action, data, filter, limit } = args || {};

      if (sql) {
        // raw sql mode
        try {
          const pool = getPgPool();
          const result = type === 'query'
            ? await pool.query(sql)
            : await pool.query(sql);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  rows: result.rows,
                  rowCount: result.rowCount,
                  fields: result.fields?.map(f => f.name),
                }, null, 2),
              },
            ],
          };
        } catch (err) {
          return {
            content: [
              {
                type: 'text',
                text: `sql error: ${err.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      if (collection && action) {
        // structured collection operation
        try {
          const pool = getPgPool();
          const table = `c_${collection.replace(/-/g, '_')}`;
          let query;
          let params = [];

          switch (action) {
            case 'describe': {
              query = `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position
              `;
              params = [table];
              break;
            }

            case 'list': {
              const lim = limit || 100;
              query = `SELECT * FROM "${table}" LIMIT ${lim}`;
              break;
            }

            case 'get': {
              if (!filter) {
                return {
                  content: [{ type: 'text', text: 'error: filter required for get action' }],
                  isError: true,
                };
              }
              const conditions = Object.keys(filter).map((k, i) => `"${k}" = $${i + 1}`).join(' AND ');
              params = Object.values(filter);
              query = `SELECT * FROM "${table}" WHERE ${conditions} LIMIT 1`;
              break;
            }

            case 'create': {
              if (!data) {
                return {
                  content: [{ type: 'text', text: 'error: data required for create action' }],
                  isError: true,
                };
              }
              const cols = Object.keys(data).map(k => `"${k}"`).join(', ');
              const placeholders = Object.keys(data).map((_, i) => `$${i + 1}`).join(', ');
              params = Object.values(data);
              query = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING *`;
              break;
            }

            case 'update': {
              if (!filter || !data) {
                return {
                  content: [{ type: 'text', text: 'error: filter and data required for update action' }],
                  isError: true,
                };
              }
              const setClauses = Object.keys(data).map((k, i) => `"${k}" = $${i + 1}`).join(', ');
              const whereClauses = Object.keys(filter).map((k, i) => `"${k}" = $${Object.keys(data).length + i + 1}`).join(' AND ');
              params = [...Object.values(data), ...Object.values(filter)];
              query = `UPDATE "${table}" SET ${setClauses} WHERE ${whereClauses} RETURNING *`;
              break;
            }

            case 'delete': {
              if (!filter) {
                return {
                  content: [{ type: 'text', text: 'error: filter required for delete action' }],
                  isError: true,
                };
              }
              const conditions = Object.keys(filter).map((k, i) => `"${k}" = $${i + 1}`).join(' AND ');
              params = Object.values(filter);
              query = `DELETE FROM "${table}" WHERE ${conditions} RETURNING *`;
              break;
            }

            default:
              return {
                content: [{ type: 'text', text: `error: unknown action: ${action}` }],
                isError: true,
              };
          }

          const result = await pool.query(query, params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  action,
                  collection,
                  rows: result.rows,
                  rowCount: result.rowCount,
                }, null, 2),
              },
            ],
          };
        } catch (err) {
          return {
            content: [
              {
                type: 'text',
                text: `database error: ${err.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: 'error: provide either sql or collection+action parameters',
          },
        ],
        isError: true,
      };
    }

    default:
      return {
        content: [
          {
            type: 'text',
            text: `unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
  }
});

// start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('pkm-hermes mcp bridge started');
}

main().catch((err) => {
  console.error('fatal error:', err);
  process.exit(1);
});
