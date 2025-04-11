import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import path from "path";

const app = express();
const PORT = process.env.PORT || 8080;

// Simple HTTP GET route
app.get("/", (req, res) => {
  res.send("Backend is up and running!");
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// === Your WebSocket logic ===
interface userInterface {
  socket: WebSocket;
  room: string;
  username: string;
}
const allSockets: userInterface[] = [];

wss.on("connection", (socket) => {
  console.log("WebSocket connection established!");

  socket.on("message", (message) => {
    const parsedMessage = JSON.parse(message.toString());

    if (parsedMessage.type === "join") {
      const { roomId, username } = parsedMessage.payload;
      allSockets.push({ socket, room: roomId, username });
      console.log(`${username} joined room: ${roomId}`);

      broadcastToRoom(roomId, `${username} has joined the room!`, socket);
      featureUsernames(roomId);
    }

    if (parsedMessage.type === "chat") {
      const user = allSockets.find((u) => u.socket === socket);
      if (!user) return;

      const timestamp = new Date().toLocaleTimeString();
      const formattedMessage = `${user.username} [${timestamp}]: ${parsedMessage.payload.message}`;
      broadcastToRoom(user.room, formattedMessage);
    }

    if (parsedMessage.type === "typing") {
      const user = allSockets.find((u) => u.socket === socket);
      if (!user) return;

      broadcastToRoom(user.room, `${user.username} is typing...`, user.socket);
    }
  });
});

function broadcastToRoom(room: string, message: string, excludeSocket?: WebSocket) {
  allSockets
    .filter((u) => u.room === room && u.socket !== excludeSocket)
    .forEach((u) => u.socket.send(message));
}

function featureUsernames(room: string) {
  const usernames = allSockets.filter((u) => u.room === room).map((u) => u.username);

  const userListMessage = JSON.stringify({
    type: "user-list",
    payload: {
      users: usernames,
    },
  });

  allSockets
    .filter((u) => u.room === room)
    .forEach((u) => u.socket.send(userListMessage));
}

// Start the HTTP + WebSocket server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
