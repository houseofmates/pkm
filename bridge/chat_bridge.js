#!/usr/bin/env node
// pkm chat bridge - routes messages between pkm ui and hermes agent
// runs as a websocket server that the pkm frontend connects to

import { WebSocketServer, WebSocket } from 'ws';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// config
const CONFIG = {
  port: parseInt(process.env.PKM_BRIDGE_PORT || '3101'),
  hermesCommand: process.env.HERMES_COMMAND || 'hermes',
  hermesArgs: (process.env.HERMES_ARGS || 'chat').split(' '),
  contextServerUrl: 'http://localhost:3100',
};

// active hermes sessions
const sessions = new Map<string, { ws: WebSocket; hermes: any; buffer: string }>();

// ws server
const wss = new WebSocketServer({ port: CONFIG.port });

console.log(`pkm chat bridge listening on ws://localhost:${CONFIG.port}`);

wss.on('connection', (ws) => {
  const sessionId = uuidv4();
  let hermesProcess: any = null;
  let responseBuffer = '';

  console.log(`[${sessionId}] client connected`);

  // helper: send json to client
  const sendToClient = (type: string, data: any) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, ...data }));
    }
  };

  // helper: spawn hermes process
  const startHermes = () => {
    if (hermesProcess) {
      hermesProcess.kill();
    }

    console.log(`[${sessionId}] starting hermes...`);
    hermesProcess = spawn(CONFIG.hermesCommand, CONFIG.hermesArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    hermesProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      responseBuffer += text;
      
      // stream chunks to client
      sendToClient('stream', { content: text });
    });

    hermesProcess.stderr.on('data', (data: Buffer) => {
      console.error(`[${sessionId}] hermes stderr:`, data.toString());
    });

    hermesProcess.on('close', (code: number) => {
      console.log(`[${sessionId}] hermes exited with code ${code}`);
      sendToClient('end', { reason: code === 0 ? 'complete' : 'error' });
      hermesProcess = null;
    });

    hermesProcess.on('error', (err: Error) => {
      console.error(`[${sessionId}] hermes error:`, err);
      sendToClient('error', { message: err.message });
    });
  };

  // handle messages from pkm ui
  ws.on('message', async (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      
      switch (msg.type) {
        case 'start': {
          // start a new hermes session
          startHermes();
          sendToClient('ready', { sessionId });
          break;
        }

        case 'message': {
          // send message to hermes
          if (!hermesProcess) {
            startHermes();
            // wait a bit for process to start
            await new Promise(r => setTimeout(r, 500));
          }

          if (hermesProcess && hermesProcess.stdin.writable) {
            console.log(`[${sessionId}] sending to hermes:`, msg.content?.substring(0, 50));
            hermesProcess.stdin.write(msg.content + '\n');
            responseBuffer = '';
            sendToClient('ack', { timestamp: Date.now() });
          } else {
            sendToClient('error', { message: 'hermes not ready' });
          }
          break;
        }

        case 'context': {
          // update context (stored in case hermes needs it)
          console.log(`[${sessionId}] context update:`, msg.context);
          break;
        }

        case 'stop': {
          // end the session
          if (hermesProcess) {
            hermesProcess.kill();
            hermesProcess = null;
          }
          sendToClient('end', { reason: 'user_stop' });
          break;
        }

        default:
          console.log(`[${sessionId}] unknown message type:`, msg.type);
      }
    } catch (err) {
      console.error(`[${sessionId}] error processing message:`, err);
      sendToClient('error', { message: 'failed to process message' });
    }
  });

  ws.on('close', () => {
    console.log(`[${sessionId}] client disconnected`);
    if (hermesProcess) {
      hermesProcess.kill();
    }
    sessions.delete(sessionId);
  });

  ws.on('error', (err) => {
    console.error(`[${sessionId}] websocket error:`, err);
    if (hermesProcess) {
      hermesProcess.kill();
    }
    sessions.delete(sessionId);
  });
});

// also expose a simple http endpoint for health checks
import http from 'http';

const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', connections: sessions.size }));
  } else {
    res.writeHead(404);
    res.end('not found');
  }
});

httpServer.listen(CONFIG.port + 1, () => {
  console.log(`health check available at http://localhost:${CONFIG.port + 1}/health`);
});
