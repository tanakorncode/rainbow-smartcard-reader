// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
const { ipcRenderer } = require("electron");
// const { dialog } = require("electron").remote;
const axios = require("axios").default;
const { EVENTS } = require("./lib/index");
const toastr = require("toastr");
const io = require("socket.io-client");
const { v4: uuidv4 } = require("uuid");
const NodeRSA = require("node-rsa");
const key = new NodeRSA({ b: 512 });
let lastMsgId = 0;
// const { SerialPort } = require("serialport");
// const { ReadlineParser } = require("@serialport/parser-readline");
const _ = require("lodash");

axios.defaults.baseURL = "https://rainbow-clinic.andamandev.com";
// Add a request interceptor
axios.interceptors.request.use(
  function (config) {
    // Do something before request is sent
    return config;
  },
  function (error) {
    // Do something with request error
    return Promise.reject(error);
  }
);

// Add a response interceptor
axios.interceptors.response.use(
  function (response) {
    return _.get(response, "data.data", response);
  },
  function (error) {
    return Promise.reject(_.get(error, "response.data.data", _.get(error, "response", error)));
  }
);

// console.log("\nPUBLIC:");
// console.log(key.exportKey("pkcs8-public-pem"));
// console.log("\nPRIVATE:");
// console.log(key.exportKey("pkcs1-pem"));

const publicKey = `-----BEGIN PUBLIC KEY-----
MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBANTfxYalbw3kXUS/i4BZ6qPq9JXB0/zI
5KW8iIQ9ucqvizyTSB5gYHMlfEuP/NL78+hnaEvrGeJ8JBeqLQxrpqUCAwEAAQ==
-----END PUBLIC KEY-----`;

key.importKey(publicKey, "pkcs8-public-pem");

// const algorithm = "aes-256-cbc";

// // generate 16 bytes of random data
// const initVector = crypto.randomBytes(16);

// // secret key generate 32 bytes of random data
// const secretKey = "04130667c155ea386676790fbfa32648"; // crypto.randomBytes(16).toString("hex")

// const encrypt = (text) => {
//   const cipher = crypto.createCipheriv(algorithm, secretKey, initVector);

//   const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

//   return {
//     iv: initVector.toString("hex"),
//     content: encrypted.toString("hex"),
//   };
// };

// const decrypt = (hash) => {
//   const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(hash.iv, "hex"));

//   const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, "hex")), decipher.final()]);

//   return decrpyted.toString();
// };

ipcRenderer.on(EVENTS.DEVICE_CONNECTED, onDeviceConnected);
ipcRenderer.on(EVENTS.CARD_INSERTED, onCardInserted);
ipcRenderer.on(EVENTS.READING_START, onReadingStart);
ipcRenderer.on(EVENTS.READING_PROGRESS, onReadingProgress);
ipcRenderer.on(EVENTS.READING_COMPLETE, onReadingComplete);
ipcRenderer.on(EVENTS.READING_FAIL, onReadingFail);
ipcRenderer.on(EVENTS.CARD_REMOVED, onCardRemove);
ipcRenderer.on(EVENTS.DEVICE_DISCONNECTED, onDeviceDisConnected);
ipcRenderer.on("version", (event, data) => {
  const messagesContainer = document.getElementById("version");
  messagesContainer.innerHTML = `v.${data}`;
});
ipcRenderer.on("message", (event, data) => {
  showMessage(data.msg, data.hide, data.replaceAll);
});
ipcRenderer.on("save-path", (event, data) => {
  document.getElementById("save-path").value = data;
});
ipcRenderer.on("DRIVING_READ_COMPLETE", (event, data) => {
  app.sendSocketData("DRIVING_READ_COMPLETE", data);
});

function showMessage(message, hide = true, replaceAll = false) {
  const msgId = lastMsgId++ + 1;
  toastr.warning(message, `#ID ${msgId}`, {
    closeButton: true,
    progressBar: true,
  });
}

moment.locale("th");

var app = new Vue({
  el: "#app",
  data: {
    message: "Hello Vue!",
    profile: null,
    loading: false,
    deviceConnect: false,
    socket: null,
    clientId: uuidv4(),
    socketURL: "http://localhost:3000",
    socketPath: "/socket.io",
    socket: null,
    clientIP: "0.0.0.0",
    serialPortPath: "",
    sport: null,
  },
  computed: {
    avatar: function () {
      if (!this.profile) return "";
      return this.profile.photo;
    },
  },
  beforeMount() {
    if (window.localStorage.getItem("socketURL")) {
      this.socketURL = window.localStorage.getItem("socketURL");
    }
    if (window.localStorage.getItem("socketPath")) {
      this.socketPath = window.localStorage.getItem("socketPath");
    }
    if (window.localStorage.getItem("serial-port-path")) {
      this.serialPortPath = window.localStorage.getItem("serial-port-path");
    }
  },
  watch: {
    socketURL: function (newVal, oldVal) {
      window.localStorage.setItem("socketURL", newVal);
    },
    socketPath: function (newVal, oldVal) {
      window.localStorage.setItem("socketPath", newVal);
    },
    serialPortPath: function (newVal, oldVal) {
      window.localStorage.setItem("serial-port-path", newVal);
    },
  },
  mounted() {
    this.$nextTick(function () {
      this.getClientIP();
      // this.initSerialPort();
    });
  },
  methods: {
    initSerialPort() {
      if (this.serialPortPath) {
        this.sport = new SerialPort({
          path: this.serialPortPath,
          baudRate: 9600,
        });
        this.handelSerialPort();
      }
    },
    getProfile: function (attr, defaultValue = "") {
      if (!this.profile) return defaultValue;
      return this.profile[attr] || defaultValue;
    },
    initSocket: function () {
      const socket = io(this.socketURL, { transports: ["websocket"], path: this.socketPath, forceNew: true });
      socket
        .on("connect", () => {
          console.log(socket.id);
          toastr.success("Connect", `สถานะการเชื่อมต่อ socket`, {
            timeOut: 3000,
            closeButton: true,
            progressBar: true,
          });
        })
        .on("connect_error", (error) => {
          toastr.error(error, `สถานะการเชื่อมต่อ socket`, {
            timeOut: 3000,
            closeButton: true,
            progressBar: true,
          });
        })
        .on("disconnect", (reason) => {
          if (reason === "io server disconnect") {
            // the disconnection was initiated by the server, you need to reconnect manually
            socket.connect();
          }
        });
      // socket.emit("join-room", { ip: this.clientIP });
      this.socket = socket;
    },
    onSaveSetting: function () {
      console.log("onSaveSetting", this.socket);
      // this.socketURL = document.getElementById("socket-host").value;
      // this.socketPath = document.getElementById("socket-path").value;
      if (this.socket) {
        this.socket.close();
      }
      this.socket = null;
      this.initSocket();
      // console.log(this.socket);
      // setTimeout(() => {
      //   this.socket.connect();
      // }, 1000);
    },
    getClientIP: async function () {
      try {
        const data = await axios.get("/api/v1/kiosk/client-ip");
        console.log(data);
        this.clientIP = data;
        this.initSocket();
      } catch (error) {
        toastr.error(error.message, `Get Client IP error.`, {
          timeOut: 3000,
          closeButton: true,
          progressBar: true,
        });
      }
    },
    sendSocketData: function (event, data = null) {
      if (!this.socket) return;
      this.socket.emit(event, { data: data, ipAddress: this.clientIP });
    },
    onChangeSelectPort(e) {
      const path = e.target.value;
      if (path) {
        if (this.sport) {
          this.sport.close();
        }
        this.initSerialPort();
      }
    },
    handelSerialPort() {
      if (!this.sport) return;
      const sport = this.sport;
      const parser = sport.pipe(new ReadlineParser({ delimiter: "\r\n" }));
      parser.on("data", function (data) {
        console.log(data);
        data = data.replace(/ /g, "");
        const name = data
          .substring(data.indexOf("^"), data.indexOf("."))
          .substring(data.indexOf("^"))
          .split("$")
          .reverse()
          .join(" ");
        const cid = data.substring(data.indexOf("?"), data.indexOf("=")).replace(/\D/g, "").substring(6);
        app.sendSocketData("DRIVING_READ_COMPLETE", {
          name,
          cid,
        });
      });
    },
  },
  filters: {
    mask: function (str) {
      if (!str) return "";
      return str ? str.replace(/^(\d{1})(\d{4})(\d{5})(\d{2})(\d{1}).*/, "$1 $2 $3 $4 $5") : "";
    },
    birthdateFormat: function (str) {
      if (!str) return "";
      return moment(str).format("DD MMM ") + (parseInt(moment(str).format("YYYY")) + 543);
    },
  },
});

function onDeviceConnected(event, data) {
  app.deviceConnect = true;
  toastr.clear();
  toastr.success("อุปรกรณ์เชื่อมต่อ", EVENTS.DEVICE_CONNECTED, {
    closeButton: true,
    progressBar: true,
  });
  app.sendSocketData(EVENTS.DEVICE_CONNECTED, data);
}

function onCardInserted(event, data) {
  app.loading = true;
  toastr.clear();
  toastr.warning("เสียบบัตร", EVENTS.CARD_INSERTED, {
    closeButton: true,
    progressBar: true,
  });
  app.sendSocketData(EVENTS.CARD_INSERTED, data);
}

function onReadingStart(event, data) {
  app.profile = null;
  app.loading = true;
  toastr.clear();
  toastr.warning("กำลังอ่านข้อมูล...", EVENTS.READING_START, {
    closeButton: true,
    progressBar: true,
  });
  app.sendSocketData(EVENTS.READING_START, data);
}

function onReadingProgress(event, data) {
  app.sendSocketData(EVENTS.READING_PROGRESS, data);
}

function onReadingComplete(event, profile) {
  app.profile = profile;
  app.loading = false;
  toastr.clear();
  toastr.success("อ่านข้อมูลสำเร็จ!", EVENTS.READING_COMPLETE, {
    closeButton: true,
    progressBar: true,
  });

  const encrypted = key.encrypt(JSON.stringify(profile), "base64");

  // key.importKey(privatePem, "pkcs1-pem");
  // const decryptedString = key.decrypt(encrypted, "utf8");
  // console.log("Decrypted:", decryptedString);
  app.sendSocketData(EVENTS.READING_COMPLETE, { encrypted: encrypted });
}

function onReadingFail(event, data) {
  app.profile = null;
  app.loading = false;
  toastr.clear();
  toastr.error("เกิดข้อผิดพลาดในการอ่านข้อมูล.", EVENTS.READING_FAIL, {
    closeButton: true,
    progressBar: true,
  });
  app.sendSocketData(EVENTS.READING_FAIL, data);
}

function onCardRemove(event, data) {
  app.profile = null;
  app.loading = false;
  toastr.clear();
  toastr.warning("ถอดบัตร.", EVENTS.CARD_REMOVED, {
    closeButton: true,
    progressBar: true,
  });
  app.sendSocketData(EVENTS.CARD_REMOVED, data);
}

function onDeviceDisConnected(event, data) {
  app.deviceConnect = false;
  toastr.clear();
  toastr.warning("อุปกรณ์ไม่เชื่อมต่อ.", EVENTS.DEVICE_DISCONNECTED, {
    closeButton: true,
    progressBar: true,
  });
  app.sendSocketData(EVENTS.DEVICE_DISCONNECTED, data);
}

// document.getElementById("save-path").value = localStorage.getItem('savePath') || '';

// window.addEventListener("DOMContentLoaded", () => {
//   console.log("DOMContentLoaded");
//   app.initSocket();
// });

async function listSerialPorts() {
  await SerialPort.list().then((ports, err) => {
    if (err) {
      toastr.error(err.message, `listSerialPorts`, {
        timeOut: 3000,
        closeButton: true,
        progressBar: true,
      });
      return;
    }
    console.log("ports", ports);

    // if (ports.length === 0) {
    //   document.getElementById('error').textContent = 'No ports discovered'
    // }
    var selectport = document.getElementById("selectport");
    for (let i = 0; i < ports.length; i++) {
      const element = ports[i];
      var option = document.createElement("option");
      option.value = element.path;
      if (element.manufacturer) {
        option.text = element.path + " (" + element.manufacturer + ")";
      } else {
        option.text = element.path;
      }

      selectport.add(option);

      if (element.path === app.serialPortPath) {
        option.setAttribute("selected", true);
      }
    }
  });
}

function listPorts() {
  listSerialPorts();
  setTimeout(listPorts, 2000);
}

// Set a timeout that will check for new serialPorts every 2 seconds.
// This timeout reschedules itself.
// setTimeout(listPorts, 2000);

// listSerialPorts();
