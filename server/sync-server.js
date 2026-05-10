import { Server } from "socket.io";
import express from "express";
import http from "http";

const app = express();
const server = http.createServer(app);

// auth middleware for socket.io handshake
const SYNC_TOKEN = process.env.SYNC_TOKEN;

function validateSyncToken(req) {
  if (!SYNC_TOKEN) return true; // skip if env not set
  const token = req.headers["x-sync-token"] || req.handshake?.headers?.["x-sync-token"];
  return token === SYNC_TOKEN;
}

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  allowRequest: (req, callback) => {
    const ok = validateSyncToken(req);
    callback(null, ok);
  }
});

// store active users per room for presence
const presence = {}; // { recordId: { socketId: lastActive } }

// track which rooms each socket is in for proper cleanup
const socketRooms = new Map(); // socketId -> Set(recordId)

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socketRooms.set(socket.id, new Set());

  // join a record's room
  socket.on("join_room", (recordId) => {
    socket.join(recordId);
    const rooms = socketRooms.get(socket.id);
    if (rooms) rooms.add(recordId);
    console.log(`Socket ${socket.id} joined room ${recordId}`);

    // update presence tracking
    if (!presence[recordId]) presence[recordId] = {};
    presence[recordId][socket.id] = Date.now();

    // notify others of new presence
    socket.to(recordId).emit("presence_update", { count: countUsers(recordId), action: "joined" });
  });

  // leave room
  socket.on("leave_room", (recordId) => {
    socket.leave(recordId);
    const rooms = socketRooms.get(socket.id);
    if (rooms) rooms.delete(recordId);
    console.log(`Socket ${socket.id} left room ${recordId}`);

    // cleanup presence tracking
    if (presence[recordId]) {
      delete presence[recordId][socket.id];
      if (Object.keys(presence[recordId]).length === 0) {
        delete presence[recordId];
      }
    }

    socket.to(recordId).emit("presence_update", { count: countUsers(recordId), action: "left" });
  });

  // handle updates
  socket.on("update_record", ({ recordId, content, senderId }) => {
    // broadcast to everyone else in the room
    socket.to(recordId).emit("receive_update", {
      content,
      senderId,
      timestamp: Date.now()
    });
  });

  // handle typing/cursor presence (ephemeral)
  socket.on("typing", ({ recordId, isTyping }) => {
    socket.to(recordId).emit("remote_typing", { isTyping, senderId: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    // emit presence_update for every room this socket was in
    const rooms = socketRooms.get(socket.id);
    if (rooms) {
      for (const recordId of rooms) {
        if (presence[recordId]) {
          delete presence[recordId][socket.id];
          if (Object.keys(presence[recordId]).length === 0) {
            delete presence[recordId];
          }
        }
        socket.to(recordId).emit("presence_update", { count: countUsers(recordId), action: "left" });
      }
      socketRooms.delete(socket.id);
    }
  });
});

function countUsers(room) {
  const clients = io.sockets.adapter.rooms.get(room);
  return clients ? clients.size : 0;
}

// health endpoint
app.get("/health", (req, res) => {
  const roomNames = Object.keys(presence);
  res.json({
    status: "ok",
    uptime: process.uptime(),
    connections: io.engine.clientsCount,
    rooms: roomNames.length
  });
});

const PORT = 3456;
server.listen(PORT, () => {
  console.log(`Sync Server listening on port ${PORT}`);
});

// graceful shutdown
function shutdown(signal) {
  console.log(`[SyncServer] received ${signal}, shutting down gracefully...`);

  // clear all presence data
  for (const recordId of Object.keys(presence)) {
    delete presence[recordId];
  }
  socketRooms.clear();

  // close the server
  server.close(() => {
    console.log("[SyncServer] server closed");
    process.exit(0);
  });

  // force exit after 10s if hanging
  setTimeout(() => {
    console.error("[SyncServer] forced exit after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
