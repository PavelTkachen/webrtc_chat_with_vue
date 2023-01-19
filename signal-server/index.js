const express = require("express");
const WebSocket = require("ws");
const http = require("http");
const { v4 } = require("uuid");

const app = express();

const port = process.env.PORT || 9000;
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });
let users = {};

const sendTo = (connection, message) => {
  connection.send(JSON.stringify(message));
};

const sendToAll = (clients, type, { id, name: username }) => {
  Object.values(clients).forEach(client => {
    if (client.name !== username) {
      client.send(JSON.stringify({
        type,
        user: { id, username }
      }));
    }
  });
};

wss.on("connection", ws => {
  ws.on("message", msg => {
    let data;
    console.log("Message: %s", msg);
    try {
      data = JSON.parse(msg);
    } catch (error) {
      alert('Invalid JSON');
      data = {};
    }
    switch (data.type) {
      case "login":
        if (users[data.name]) {
          sendTo(ws, {
            type: 'login',
            success: false,
            message: "Пользователь с таким именем уже существует"
          });
        } else {
          const id = v4();
          const loggedUsers = Object.values(
            users
          ).map(({ id, name: username }) => ({ id, username }));
          users[data.name] = ws;
          ws.name = data.name;
          ws.id = id;
          sendTo(ws, {
            type: 'login',
            success: true,
            users: loggedUsers
          });
          sendToAll(users, "updateUsers", ws);
        }
        break;

      case "offer":
        const objectConnection = users[data.name];
        if (!!objectConnection) {
          ws.otherName = data.name;
          sendTo(objectConnection, {
            type: "offer",
            offer: data.offer,
            name: ws.name
          });
        } else {
          sendTo(ws, {
            type: "error",
            message: `Пользователь ${data.name} не найден`
          });
        }
        break;

      case "answer":
        const objectAnswer = users[data.name];
        if (!!objectAnswer) {
          ws.otherName = data.name;
          sendTo(objectAnswer, {
            type: "answer",
            answer: data.answer,
          });
        } else {
          sendTo(ws, {
            type: "error",
            message: `Пользователь ${data.name} не найден`
          });
        }
        break;

      case "candidate":
        const objectCandidate = users[data.name];
        if (!!objectCandidate) {
          sendTo(objectCandidate, {
            type: "candidate",
            candidate: data.candidate,
          });
        } else {
          sendTo(ws, {
            type: "error",
            message: `Пользователь ${data.name} не найден`
          });
        }
        break;

      case "leave":
        const recipient = users[data.name];
        if (!!recipient) {
          recipient.otherName = null;
          sendTo(recipient, {
            type: "leave"
          });
        }
        break;

      default:
        sendTo(ws, {
          type: 'error',
          message: `Not found command: ${type}`
        });
        break;
    }
  });
  ws.on("close", ws => {
    delete users[ws.name];
    if (ws.otherName) {
      console.log("Disconnecting from ", ws.otherName);
      const recipient = users[ws.otherName];
      if (!!recipient) {
        recipient.otherName = null;
      }
    }
    sendToAll(users, "leave", ws);
  });
  ws.send(
    JSON.stringify({
      type: "connect",
      message: "Success connection"
    })
  );
});

server.listen(port, () => {
  console.log(`Signal Server running on port ${port} `);
});