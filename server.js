require("dotenv").config();
const express = require("express");
const app = express();
var server = require("http").Server(app);
const io = require("socket.io")(server);
const ServerInfoCache = require("./cache");

const cache = new ServerInfoCache(5000);

let numClients = 0;

cache.on("updated", serverInfo => {
  io.sockets.emit("updated", serverInfo);
});

io.on("connection", socket => {
  console.log("a user connected");

  socket.emit("updated", cache.getServerInfo());

  numClients++;

  cache.startUpdating();

  socket.on("disconnect", () => {
    console.log("a user disconnected");
    numClients--;

    if (!numClients) cache.stopUpdating();
  });
});

// respond with "hello world" when a GET request is made to the homepage
app.get("/", (req, res) => {
  res.json(cache.getServerInfo());
});

server.listen(process.env.PORT, function() {
  console.log("Example app listening on port 8080!");
});
