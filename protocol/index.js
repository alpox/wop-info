const dgram = require("dgram");
const utils = require("../utils");

class Message {
  constructor(msg) {
    this.setMessage(msg);
  }

  _writeBody() {
    this.buffer.write(this.message, 4, this.message.length);
  }

  _writeHeader() {
    this.buffer.writeUInt32LE(0xffffffff, 0);
  }

  setMessage(msg) {
    this.message = msg;
    this.buffer = Buffer.alloc(4 + msg.length);
    this._writeHeader();
    this._writeBody();
  }

  getBuffer() {
    return this.buffer;
  }

  getMessage() {
    return this.message;
  }
}

class Response {
  constructor(request, waitForEOT) {
    this.buffer = Buffer.alloc(0);
    this.request = request;
    this.waitForEOT = waitForEOT;
  }

  _requestCommand() {
    if (!this.request) return 0;
    return this.request.slice(0, this.request.indexOf(" ")) + "Response";
  }

  _sliceNew(buffer, start, end) {
    if (end < 0) end = buffer.length + end;
    if (!end) end = buffer.length;
    const newBuffer = Buffer.alloc(
      buffer.length - start - (buffer.length - end)
    );
    buffer.copy(newBuffer, 0, start, end);
    return newBuffer;
  }

  readFromBuffer(buffer) {
    if (this.waitForEOT) {
      this.ended = buffer.includes("\\EOT\0\0\0");
      if (this.ended) buffer = this._sliceNew(buffer, 0, -6);
    }

    buffer = this._sliceNew(buffer, 4 + this._requestCommand().length);
    const newBufferLength = this.buffer.length + buffer.length;
    this.buffer = Buffer.concat([this.buffer, buffer], newBufferLength);
  }

  getBuffer() {
    return this.buffer;
  }
}

class Client {
  constructor(url, port, messageTimeout) {
    this.url = url;
    this.port = port;
    this.messageTimeout = messageTimeout;

    this.init();
  }

  init() {
    this.connection = dgram.createSocket("udp4");

    return this;
  }

  start() {
    this.connection.bind(this.port);
    return this;
  }

  close() {
    this.connection.close();
    return this;
  }

  request(msg, waitForEOT = false) {
    const message = new Message(msg);
    const buffer = message.getBuffer();

    return new Promise((resolve, reject) => {
      const response = new Response(msg, waitForEOT);

      const onMessage = buffer => {
        clearTimeout(this.timeout);

        this.timeout = setTimeout(() => {
          reject(new Error("Reached timeout"));
        }, this.messageTimeout);

        response.readFromBuffer(buffer);
        if (!waitForEOT || response.ended) {
          this.connection.close();
          resolve(response.getBuffer());
        }
      };

      const onError = err => {
        this.connection.close();
        reject(err);
      };

      this.connection.on("message", onMessage);

      this.connection.on("error", onError);

      this.timeout = setTimeout(() => {
        reject(new Error("Reached timeout"));
      }, this.messageTimeout);

      this.connection.send(buffer, 0, buffer.length, this.port, this.url);
    });
  }
}

class Master {
  constructor(url = "master.worldofpadman.com", protocol = 71, port = 27955) {
    this.url = url;
    this.port = port;
    this.protocol = protocol;
  }

  async getServerInfo(address, port) {
    const client = new Client(address, port, 5000);

    const responseBuffer = await client.request("getinfo xx x");

    const info = responseBuffer.toString("ascii");

    return utils.reduce2(
      info.split("\\"),
      (acc, [key, value]) => ({
        ...acc,
        [key]: value
      }),
      {}
    );
  }

  async getServerStatus(address, port) {
    const client = new Client(address, port, 5000);

    const responseBuffer = await client.request("getstatus xx x");

    const info = responseBuffer.toString("ascii");

    return utils.reduce2(
      info.split("\\"),
      (acc, [key, value]) => ({
        ...acc,
        [key]: value
      }),
      {}
    );
  }

  async getServers() {
    const client = new Client(this.url, this.port, 5000);

    let responseBuffer = await client.request(
      `getservers WorldofPadman ${this.protocol} empty`,
      true
    );

    const addresses = [];

    // Remove leading backspace (\)
    responseBuffer = responseBuffer.slice(1);

    while (responseBuffer.length) {
      let address = {
        address: [
          responseBuffer.readUInt8(0),
          responseBuffer.readUInt8(1),
          responseBuffer.readUInt8(2),
          responseBuffer.readUInt8(3)
        ].join("."),
        port: responseBuffer.readUInt16BE(4)
      };

      addresses.push(address);

      responseBuffer = responseBuffer.slice(7);
    }

    return addresses;
  }
}

module.exports = Master;
