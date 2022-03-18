const log = require("electron-log");
const { autoUpdater } = require("electron-updater");

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
log.info("App starting...");

function init(mainWindow) {
  autoUpdater.on("checking-for-update", () => {
    log.info("🔎 Checking for updates");
    mainWindow.webContents.send("message", { msg: "🔎 Checking for updates" });
  });

  autoUpdater.on("update-available", info => {
    log.info("🎉 Update available. Downloading ⌛️");
    mainWindow.webContents.send("message", {
      msg: "🎉 Update available. Downloading ⌛️",
      hide: false
    });
  });

  autoUpdater.on("update-not-available", info => {
    log.info("👎 Update not available");
    mainWindow.webContents.send("message", { msg: "👎 Update not available" });
  });

  autoUpdater.on("error", (ev, err) => {
    log.error(`😱 Error: ${err}`);
    mainWindow.webContents.send("message", { msg: `😱 Error: ${err}` });
  });

  autoUpdater.on("download-progress", progressObj => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + " - Downloaded " + progressObj.percent + "%";
    log_message =
      log_message +
      " (" +
      progressObj.transferred +
      "/" +
      progressObj.total +
      ")";
    mainWindow.webContents.send("message", {
      msg: log_message,
      hide: false
    });
  });
  
  autoUpdater.on("update-downloaded", (ev, info) => {
    const msg = "🤘 Update downloaded";
    log.info(msg);
    mainWindow.webContents.send("message", {
      msg,
      hide: false,
      replaceAll: true
    });
    // Wait 5 seconds, then quit and install
    // In your application, you don't need to wait 5 seconds.
    // You could call autoUpdater.quitAndInstall(); immediately
    setTimeout(function() {
      autoUpdater.quitAndInstall();
    }, 5000);
  });
  autoUpdater.checkForUpdates();
}

module.exports = {
  init
};
