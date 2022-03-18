// Modules to control application life and create native browser window
const { app, BrowserWindow } = require("electron");
const path = require("path");
const url = require("url");
const AutoLaunch = require("auto-launch");
const autoUpdater = require("./auto-updater");
const { ThaiCardReader, EVENTS, MODE } = require("./lib/index");
const pkg = require("./package");
const Store = require("./store.js");
const { menubar } = require("menubar");

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
  },
});

const appReader = {
  init: function (win) {
    const reader = new ThaiCardReader();
    reader.readMode = MODE.PERSONAL_PHOTO;
    reader.autoRecreate = true;
    reader.startListener();
    this.handleEvents(reader, win);
  },
  handleEvents: function (reader, win) {
    reader.on(EVENTS.DEVICE_CONNECTED, () => {
      win.webContents.send(EVENTS.DEVICE_CONNECTED);
    });

    reader.on(EVENTS.CARD_INSERTED, () => {
      win.webContents.send(EVENTS.CARD_INSERTED);
    });

    reader.on(EVENTS.READING_START, () => {
      win.webContents.send(EVENTS.READING_START);
    });

    reader.on(EVENTS.READING_PROGRESS, (progress) => {
      win.webContents.send(EVENTS.READING_PROGRESS, progress);
    });

    reader.on(EVENTS.READING_COMPLETE, async (profile) => {
      try {
        const profileUpdated = updateObject(profile, {
          fullNameThai: this.getFullNameThai(profile),
          fullNameEng: this.getFullNameEng(profile),
        });
        win.webContents.send(EVENTS.READING_COMPLETE, profileUpdated);
      } catch (err) {
        throw err;
      }
    });

    reader.on(EVENTS.READING_FAIL, () => {
      win.webContents.send(EVENTS.READING_FAIL);
    });

    reader.on(EVENTS.CARD_REMOVED, async () => {
      win.webContents.send(EVENTS.CARD_REMOVED);
    });

    reader.on(EVENTS.DEVICE_DISCONNECTED, () => {
      win.webContents.send(EVENTS.DEVICE_DISCONNECTED);
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
  const mainWindow = new BrowserWindow({
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
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "index.html"),
      protocol: "file:",
      slashes: true,
    })
  );

  // Open the DevTools.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  if (app.isPackaged) {
    let autoLaunch = new AutoLaunch({
      name: pkg.name,
      path: app.getPath("exe"),
    });
    autoLaunch.isEnabled().then((isEnabled) => {
      if (!isEnabled) autoLaunch.enable();
    });
  }

  mainWindow.webContents.on("did-finish-load", () => {
    setTimeout(() => {
      appReader.init(mainWindow);
    }, 1500);
    mainWindow.webContents.send("version", pkg.version);
    // mainWindow.webContents.send("app-ready", "");
    // mainWindow.webContents.send("save-path", store.get("savePath"));
    if (app.isPackaged) autoUpdater.init(mainWindow);
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  //
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
app.allowRendererProcessReuse = false;

// let { width, height } = store.get("windowBounds");

// const mb = menubar({
//   browserWindow: {
//     width: width,
//     height: height,
//     maximizable: false,
//     webPreferences: {
//       preload: path.join(__dirname, "preload.js"),
//       nodeIntegration: true,
//       contextIsolation: false,
//       enableRemoteModule: true,
//       // webSecurity: false,
//     },
//   },
// });



// mainWindow.loadURL(
//   url.format({
//     pathname: path.join(__dirname, "index.html"),
//     protocol: "file:",
//     slashes: true,
//   })
// );



// mb.on("ready", () => {
//   const mainWindow = mb.window

//   setTimeout(() => {
//     appReader.init(mainWindow);
//   }, 1500);
//   // mainWindow.webContents.send("version", pkg.version);
//   // mainWindow.webContents.send("app-ready", "");
//   // mainWindow.webContents.send("save-path", store.get("savePath"));
//   if (app.isPackaged) autoUpdater.init(mainWindow);
//   console.log("Menubar app is ready.");
// });
try {
  require('electron-reloader')(module)
} catch (_) {}