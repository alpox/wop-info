require("dotenv").config();
const express = require("express");
const app = express();
var server = require("http").Server(app);
const io = require("socket.io")(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        credentials: true
    }
});
const ServerInfoCache = require("./cache");

const cache = new ServerInfoCache(5000);

let numClients = 0;

let addresses = [];

cache.on("updated", (serverInfo) => {
  io.sockets.emit("updated", serverInfo);
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.emit("updated", cache.getServerInfo());

  const address = socket.request.connection.remoteAddress;

  numClients++;

  addresses.push(address);

  cache.startUpdating();

  socket.on("disconnect", () => {
    console.log("a user disconnected");
    numClients--;

    const index = addresses.indexOf(address);
    addresses.splice(index, 1);

    if (!numClients) cache.stopUpdating();
  });
});

// respond with "hello world" when a GET request is made to the homepage
app.get("/", (req, res) => {
  res.json(cache.getServerInfo());
});

app.get("/users", (req, res) => {
  res.json({
    numClients,
    addresses,
  });
});

server.listen(process.env.PORT || 8080, function () {
  console.log(`Example app listening on port ${process.env.PORT || 8080}!`);
});
