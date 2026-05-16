#!/usr/bin/env node
/* eslint-disable */
// pkm chat bridge - routes messages between pkm ui and hermes agent
// runs as a websocket server that the pkm frontend connects to

import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';

// config
const CONFIG = {
  port: parseInt(process.env.PKM_BRIDGE_PORT || '3101'),
  hermesHost: process.env.HERMES_HOST || process.env.HERMES_HOST || '192.168.4.233',
  hermesUser: process.env.HERMES_USER || process.env.USERNAME || 'house',
  hermesKey: process.env.HERMES_KEY || process.env.USER_SSH_KEY_PATH || '/home/house/.ssh/hermes_key',
  hermesArgs: process.env.HERMES_ARGS || 'chat --yolo',
};

// ws server
const wss = new WebSocketServer({ port: CONFIG.port });

console.log(`pkm chat bridge listening on ws://localhost:${CONFIG.port}`);

wss.on('connection', (ws) => {
  const sessionId = uuidv4();
  let hermesProcess = null;
  let responseBuffer = '';

  console.log(`[${sessionId}] client connected`);

  // helper: send json to client
  const sendToClient = (type, data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type, ...data }));
    }
  };

  // helper: spawn hermes process
  const startHermes = () => {
    if (hermesProcess) {
      hermesProcess.kill();
    }

    console.log(`[${sessionId}] starting hermes on ${CONFIG.hermesHost}...`);

    // ssh to desktop and run hermes
    const sshCommand = `ssh -i ${CONFIG.hermesKey} -t ${CONFIG.hermesUser}@${CONFIG.hermesHost} "/home/house/.hermes/hermes-agent/hermes ${CONFIG.hermesArgs}"`;

    hermesProcess = spawn('bash', ['-c', sshCommand], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    hermesProcess.stdout.on('data', (data) => {
      const text = data.toString();
      responseBuffer += text;

      // stream chunks to client
      sendToClient('stream', { content: text });
    });

    hermesProcess.stderr.on('data', (data) => {
      const errText = data.toString();
      console.error(`[${sessionId}] hermes stderr:`, errText);
      // detect ssh auth failures and send helpful message
      if (errText.includes('Permission denied') || errText.includes('Host key verification failed')) {
        sendToClient('error', { message: 'ssh connection to hermes failed: check ssh key permissions' });
      }
    });

    // kill hermes if it takes too long (120s no output)
    let hermesTimeout = setTimeout(() => {
      if (hermesProcess) {
        console.log(`[${sessionId}] hermes timeout, killing`);
        hermesProcess.kill();
      }
    }, 120000);

    hermesProcess.stdout.on('data', () => {
      clearTimeout(hermesTimeout);
      hermesTimeout = setTimeout(() => {
        if (hermesProcess) {
          console.log(`[\${sessionId}] hermes timeout, killing`);
          hermesProcess.kill();
        }
      }, 120000);
    });

    hermesProcess.on('close', (code) => {
      clearTimeout(hermesTimeout);
      console.log(`[\${sessionId}] hermes exited with code \${code}`);
      sendToClient('end', { reason: code === 0 ? 'complete' : 'error' });
      hermesProcess = null;
    });

    hermesProcess.on('error', (err) => {
      console.error(`[${sessionId}] hermes error:`, err);
      sendToClient('error', { message: err.message });
    });
  };

  // handle messages from pkm ui
  ws.on('message', async (data) => {
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
  });

  ws.on('error', (err) => {
    console.error(`[${sessionId}] websocket error:`, err);
    if (hermesProcess) {
      hermesProcess.kill();
    }
  });
});

// also expose a simple http endpoint for health checks
const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404);
    res.end('not found');
  }
});

httpServer.listen(CONFIG.port + 1, () => {
  console.log(`health check available at http://localhost:${CONFIG.port + 1}/health`);
});
