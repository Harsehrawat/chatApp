"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
const allSockets = []; // will store sockets info here
wss.on("connection", (socket) => {
    console.log("connection established!");
    socket.on("message", (message) => {
        // message received by server
        // now handle different events
        // first : join event
        const parsedMessage = JSON.parse(message);
        console.log(`message received : ${parsedMessage}`);
        if (parsedMessage.type === "join") {
            // make him join the room and send alert to existing users about the new joinee
            const room = parsedMessage.payload.roomId;
            const username = parsedMessage.payload.username;
            console.log("inside room");
            // add socket to allSockets first
            allSockets.push({ socket, room, username });
            console.log(`${username} has joined ${room}`);
            // now track down the currRoom
            broadcastToRoom(room, `${username} has joined the room !`, socket);
            // feature : people could see currUsers present in room
            featureUsernames(room);
        }
        if (parsedMessage.type === "chat") {
            const user = allSockets.find((u) => u.socket === socket);
            if (!user)
                return;
            const timestamp = new Date().toLocaleTimeString();
            const formattedMessage = `${user.username} [${timestamp}]: ${parsedMessage.payload.message}`;
            broadcastToRoom(user.room, formattedMessage);
        }
        // === 📌 Handle TYPING event ===
        if (parsedMessage.type === "typing") {
            const user = allSockets.find((u) => u.socket === socket);
            if (!user)
                return;
            broadcastToRoom(user.room, `${user.username} is typing...`, user.socket); // exclude sender
        }
    });
});
function broadcastToRoom(room, message, excludeSocket) {
    // find the room 
    // share the message 
    // if excludeSocket mentioned .. ignore that
    allSockets.filter((u) => u.room === room && u.socket != excludeSocket)
        .forEach((u) => {
        u.socket.send(message);
    });
}
function featureUsernames(room) {
    // select the room
    const usernames = allSockets.filter((u) => u.room === room).map((u) => u.username);
    const userListMessage = JSON.stringify({
        type: "user-list",
        payload: {
            users: usernames,
        },
    });
    // send to socket 
    allSockets
        .filter((u) => u.room === room)
        .forEach((u) => u.socket.send(userListMessage));
}
