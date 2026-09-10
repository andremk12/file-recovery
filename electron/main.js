import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerDriveIpc } from "./ipc/driveIpc.js"
import { registerDestinationIpc } from "./ipc/destinationIpc.js";
import { registerScanIpc } from "./ipc/scanIpc.js";
import { registerRecoveryEngineIpc } from "./ipc/recoveryEngineIpc.js";
import { registerShellIpc } from "./ipc/shellIpc.js";
import { registerNotificationIpc } from "./ipc/notificationIpc.js";
import { getAdministratorStatus } from "./services/administratorService.js";
import os from "node:os"


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.webContents.on(
    "preload-error",
    (_event, preloadPath, error) => {
      console.error("Erro ao carregar o preload:", preloadPath);
      console.error(error);
    },
  );

  if (app.isPackaged) {
    mainWindow.loadFile(
      path.join(__dirname, "../dist/index.html"),
    );
  } else {
    mainWindow.loadURL("http://localhost:5173");
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  
  if (process.platform === "win32") {
  app.setAppUserModelId(
    "com.andremichalsky.file-recovery",
  );
}

 ipcMain.handle(
  "app:get-info",
  async () => {
    const administratorStatus =
      await getAdministratorStatus();

    return {
      version:
        app.getVersion(),

      platform:
        process.platform,

      electronVersion:
        process.versions.electron,

      userName:
        os.userInfo().username,

      administratorStatus,
    };
  },
);

  registerDriveIpc();
  registerDestinationIpc();
  registerScanIpc();
  registerRecoveryEngineIpc();
  registerShellIpc();
  registerNotificationIpc();


  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});