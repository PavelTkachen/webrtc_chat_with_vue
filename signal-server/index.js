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
    console.log("Message: %s from client", msg);
    try {
      data = JSON.parse(msg);
    } catch (error) {
      console.log(`Error: ${error}`);
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

      case "offerConnect":
        const objectConnection = users[data.name];
        if (!!objectConnection) {
          sendTo(objectConnection, {
            type: "offerConnect",
            offerConnect: data.offerConnect,
            name: ws.name
          });
        } else {
          sendTo(ws, {
            type: "error",
            message: `Пользователь ${data.name} не найден`
          });
        }
        break;

      case "answerConnect":
        const objectAnswer = users[data.name];
        if (!!objectAnswer) {
          sendTo(objectAnswer, {
            type: "answerConnect",
            answerConnect: data.answerConnect,
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
        sendToAll(users, "leave", ws);
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