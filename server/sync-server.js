import { Server } from "socket.io";
import express from "express";
import http from "http";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust for production security
        methods: ["GET", "POST"]
    }
});

// Store active users per room for presence
const presence = {}; // { recordId: { socketId: lastActive } }

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join a record's room
    socket.on("join_room", (recordId) => {
        socket.join(recordId);
        console.log(`Socket ${socket.id} joined room ${recordId}`);

        // Notify others of new presence
        socket.to(recordId).emit("presence_update", { count: countUsers(recordId), action: "joined" });
    });

    // Leave room
    socket.on("leave_room", (recordId) => {
        socket.leave(recordId);
        console.log(`Socket ${socket.id} left room ${recordId}`);
        socket.to(recordId).emit("presence_update", { count: countUsers(recordId), action: "left" });
    });

    // Handle Updates
    socket.on("update_record", ({ recordId, content, senderId }) => {
        // Broadcast to everyone ELSE in the room
        socket.to(recordId).emit("receive_update", {
            content,
            senderId,
            timestamp: Date.now()
        });
    });

    // Handle Typing/Cursor Presence (Ephemeral)
    socket.on("typing", ({ recordId, isTyping }) => {
        socket.to(recordId).emit("remote_typing", { isTyping, senderId: socket.id });
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        // Ideally we'd track which rooms they were in and notify, 
        // but socket.io handles room auto-leave. 
        // We would need a custom tracker if we want to emit "left" for specific rooms on disconnect.
    });
});

function countUsers(room) {
    const clients = io.sockets.adapter.rooms.get(room);
    return clients ? clients.size : 0;
}

const PORT = 3456;
server.listen(PORT, () => {
    console.log(`Sync Server listening on port ${PORT}`);
});
