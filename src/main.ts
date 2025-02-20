const { app, BrowserWindow, ipcMain, desktopCapturer } = require("electron");
import registerListeners from "./helpers/ipc/listeners-register";
import path from "path";
import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import { dialog } from "electron";

const inDevelopment = process.env.NODE_ENV === "development";

function createWindow() {
  const preload = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    width: 1300,
    height: 900,
    minWidth: 1300,
    minHeight: 900,
    webPreferences: {
      devTools: inDevelopment,
      contextIsolation: true,
      nodeIntegration: true,
      nodeIntegrationInSubFrames: false,

      preload: preload,
    },
    titleBarStyle: "hidden",
  });
  registerListeners(mainWindow);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

async function installExtensions() {
  try {
    const result = await installExtension(REACT_DEVELOPER_TOOLS);
    console.log(`Extensions installed successfully: ${result.name}`);
  } catch {
    console.error("Failed to install extensions");
  }
}

app.whenReady().then(() => {
  ipcMain.handle("DESKTOP_CAPTURER_GET_SOURCES", (_: any, opts:any) => {
    return desktopCapturer.getSources(opts);
  });

  ipcMain.handle("SHOW_SAVE_DIALOG", async (_:any, options:any) => {
    return await dialog.showSaveDialog(options);
  });

  ipcMain.handle('show-save-dialog', async (_:any, options:any) => {
    const result = await dialog.showSaveDialog({
      filters: options.filters,
      defaultPath: options.defaultPath
    });
    return result;
  });

  createWindow();
}).then(installExtensions);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
