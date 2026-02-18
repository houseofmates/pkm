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

// store active users per room for presence
const presence = {}; // { recordId: { socketId: lastActive } }

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // join a record's room
    socket.on("join_room", (recordId) => {
        socket.join(recordId);
        console.log(`Socket ${socket.id} joined room ${recordId}`);

        // notify others of new presence
        socket.to(recordId).emit("presence_update", { count: countUsers(recordId), action: "joined" });
    });

    // leave room
    socket.on("leave_room", (recordId) => {
        socket.leave(recordId);
        console.log(`Socket ${socket.id} left room ${recordId}`);
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
        // ideally we'd track which rooms they were in and notify, 
        // but socket.io handles room auto-leave. 
        // we would need a custom tracker if we want to emit "left" for specific rooms on disconnect.
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
