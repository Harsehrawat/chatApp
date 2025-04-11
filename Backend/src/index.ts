import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import http from "http";
import cors from "cors";

// Create Express app
const app = express();
const PORT = 8080;

app.use(cors());

// Add a test route to confirm server is live
app.get("/", (req, res) => {
  res.send("Backend is up and running!");
});

// Create HTTP server from Express
const server = http.createServer(app);

// Attach WebSocket server
const wss = new WebSocketServer({ server });

interface userInterface {
  socket: WebSocket;
  room: string;
  username: string;
}

const allSockets: userInterface[] = [];

wss.on("connection", (socket) => {
  console.log("✅ WebSocket connection established!");

  socket.on("message", (message) => {
    const parsedMessage = JSON.parse(message.toString());
    console.log(`📨 message received: ${parsedMessage.type}`);

    if (parsedMessage.type === "join") {
      const room = parsedMessage.payload.roomId;
      const username = parsedMessage.payload.username;

      allSockets.push({ socket, room, username });
      console.log(`👤 ${username} joined ${room}`);

      broadcastToRoom(room, `${username} has joined the room!`, socket);
      featureUsernames(room);
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

      broadcastToRoom(user.room, `${user.username} is typing...`, socket); // exclude sender
    }
  });
});

function broadcastToRoom(room: string, message: string, excludeSocket?: WebSocket) {
  allSockets
    .filter((u) => u.room === room && u.socket !== excludeSocket)
    .forEach((u) => u.socket.send(message));
}

function featureUsernames(room: string) {
  const usernames = allSockets
    .filter((u) => u.room === room)
    .map((u) => u.username);

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

// Start server
server.listen(PORT, () => {
  console.log(` Server is running on port ${PORT}`);
});
