// Modules to control application life and create native browser window
require("dotenv").config();
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const url = require("url");
const { ThaiCardReader, EVENTS, MODE } = require("./lib/index");
const pkg = require("./package");
const autoUpdater = require("./auto-updater");
const AutoLaunch = require("auto-launch");
const fs = require("fs");
const { utf8ToAnsi } = require("utf8-to-ansi");
const Store = require("./store.js");

const updateObject = (oldObject, updatedProperties) => {
  return {
    ...oldObject,
    ...updatedProperties,
  };
};

const store = new Store({
  // We'll call our data file 'user-preferences'
  configName: "user-preferences",
  defaults: {
    // 800x600 is the default size of our window
    windowBounds: { width: 850, height: 600 },
    autoLaunch: false,
    // savePath: app.isPackaged
    //   ? path.join(app.getAppPath().replace("app.asar", ""), "output")
    //   : path.join(app.getAppPath(), "output"),
  },
});

const writeFile = async (data, filename, encoding = "utf8") => {
  try {
    let savePath = path.join(store.get("savePath"), filename);
    if (!fs.existsSync(path.dirname(savePath))) {
      fs.mkdirSync(path.dirname(savePath));
    }
    fs.writeFileSync(savePath, data, { encoding: encoding });
  } catch (err) {
    throw err;
  }
};

const clearFile = async (filename) => {
  try {
    let filePath = path.join(store.get("savePath"), filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    throw err;
  }
};

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

const appReader = {
  init: function () {
    const reader = new ThaiCardReader();
    reader.readMode = MODE.PERSONAL_PHOTO;
    reader.autoRecreate = true;
    reader.startListener();
    this.handleEvents(reader);
  },
  handleEvents: function (reader) {
    reader.on(EVENTS.DEVICE_CONNECTED, () => {
      win.webContents.send(EVENTS.DEVICE_CONNECTED);
      writeFile(
        "status=1\nstatus_name=" + EVENTS.DEVICE_CONNECTED,
        "event.ini",
        "utf8"
      );
    });

    reader.on(EVENTS.CARD_INSERTED, () => {
      win.webContents.send(EVENTS.CARD_INSERTED);
      writeFile(
        "status=2\nstatus_name=" + EVENTS.CARD_INSERTED,
        "event.ini",
        "utf8"
      );
    });

    reader.on(EVENTS.READING_START, () => {
      win.webContents.send(EVENTS.READING_START);
      writeFile(
        "status=3\nstatus_name=" + EVENTS.READING_START,
        "event.ini",
        "utf8"
      );
    });

    reader.on(EVENTS.READING_PROGRESS, (progress) => {
      writeFile(
        "status=4\nstatus_name=" + EVENTS.READING_PROGRESS,
        "event.ini",
        "utf8"
      );
    });

    reader.on(EVENTS.READING_COMPLETE, async (profile) => {
      try {
        profile = updateObject(profile, {
          fullNameThai: this.getFullNameThai(profile),
          fullNameEng: this.getFullNameEng(profile),
        });
        win.webContents.send(EVENTS.READING_COMPLETE, profile);

        let base64Image = profile.photo.split(";base64,").pop();
        const txtContent = `${profile.citizenId};${profile.fullNameThai};${profile.address}`;
        await writeFile(base64Image, "cid.jpg", "base64");
        await writeFile(JSON.stringify(profile), "cid.json", "utf8");
        await writeFile(utf8ToAnsi(txtContent), "cid.txt", "latin1");
        await writeFile(
          "status=5\nstatus_name=" + EVENTS.READING_COMPLETE,
          "event.ini",
          "utf8"
        );
        /* ipcMain.on('synchronous-message', (event, arg) => {
          event.returnValue = profile
        }) */
      } catch (err) {
        throw err;
      }
    });

    reader.on(EVENTS.READING_FAIL, () => {
      win.webContents.send(EVENTS.READING_FAIL);
      writeFile(
        "status=6\nstatus_name=" + EVENTS.READING_FAIL,
        "event.ini",
        "utf8"
      );
    });

    reader.on(EVENTS.CARD_REMOVED, async () => {
      win.webContents.send(EVENTS.CARD_REMOVED);
      await writeFile(
        "status=7\nstatus_name=" + EVENTS.CARD_REMOVED,
        "event.ini",
        "utf8"
      );
      await clearFile("cid.jpg");
      await clearFile("cid.json");
      await clearFile("cid.txt");
    });

    reader.on(EVENTS.DEVICE_DISCONNECTED, () => {
      win.webContents.send(EVENTS.DEVICE_DISCONNECTED);
      writeFile(
        "status=8\nstatus_name=" + EVENTS.DEVICE_DISCONNECTED,
        "event.ini",
        "utf8"
      );
    });
  },
  getFullNameThai: function (profile) {
    return `${profile.fullname}`;
  },
  getFullNameEng: function (profile) {
    return `${profile.titleEN} ${profile.firstNameEN} ${profile.lastNameEN}`;
  },
};

function createWindow() {
  let { width, height } = store.get("windowBounds");
  // Create the browser window.
  win = new BrowserWindow({
    width: width,
    height: height,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      // webSecurity: false,
    },
  });

  // and load the index.html of the app.
  // win.loadFile('index.html')
  win.loadFile("index.html");
  // win.loadURL(
  //   url.format({
  //     pathname: path.join(__dirname, "index.html"),
  //     protocol: "file:",
  //     slashes: true,
  //   })
  // );

  win.webContents.on("did-finish-load", () => {
    // setTimeout(() => {
    //   appReader.init();
    // }, 1500);
    // win.webContents.send("version", pkg.version);
    // win.webContents.send("app-ready", "");
    // win.webContents.send("save-path", store.get("savePath"));
    // if (app.isPackaged) autoUpdater.init(win);
  });

  if (app.isPackaged) {
    let autoLaunch = new AutoLaunch({
      name: pkg.name,
      path: app.getPath("exe"),
    });
    autoLaunch.isEnabled().then((isEnabled) => {
      if (!isEnabled) autoLaunch.enable();
    });
  }

  ipcMain.on("save-path", (event, arg) => {
    store.set("savePath", arg);
    event.returnValue = "pong";
  });

  // Open the DevTools.
  if (!app.isPackaged) {
    win.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  win.on("closed", function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed.
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
// ./node_modules/.bin/electron-rebuild
app.allowRendererProcessReuse = false;
