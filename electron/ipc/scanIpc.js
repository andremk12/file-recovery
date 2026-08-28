import { ipcMain } from "electron";
import {
  createSimulatedScan,
} from "../services/scanService.js";

const START_SCAN_CHANNEL = "scan:start";
const CANCEL_SCAN_CHANNEL = "scan:cancel";
const SCAN_UPDATE_CHANNEL = "scan:update";

const activeScans = new Map();

function sendUpdate(sender, update) {
  if (!sender.isDestroyed()) {
    sender.send(SCAN_UPDATE_CHANNEL, update);
  }
}

export function registerScanIpc() {
  ipcMain.handle(
    START_SCAN_CHANNEL,
    async (event, request) => {
      const scan = createSimulatedScan(request);
      const sender = event.sender;

      activeScans.set(scan.id, {
        scan,
        webContentsId: sender.id,
      });

      scan.on("progress", (payload) => {
        sendUpdate(sender, {
          type: "progress",
          ...payload,
        });
      });

      scan.once("completed", (payload) => {
        sendUpdate(sender, {
          type: "completed",
          ...payload,
        });

        activeScans.delete(scan.id);
      });

      scan.once("cancelled", (payload) => {
        sendUpdate(sender, {
          type: "cancelled",
          ...payload,
        });

        activeScans.delete(scan.id);
      });

      scan.once("failed", (payload) => {
        sendUpdate(sender, {
          type: "failed",
          ...payload,
        });

        activeScans.delete(scan.id);
      });

      try {
        return scan.start();
      } catch (error) {
        activeScans.delete(scan.id);
        throw error;
      }
    },
  );

  ipcMain.handle(
    CANCEL_SCAN_CHANNEL,
    async (event, scanId) => {
      if (
        typeof scanId !== "string" ||
        !scanId.trim()
      ) {
        throw new Error(
          "O identificador da varredura é inválido.",
        );
      }

      const activeScan = activeScans.get(scanId);

      if (!activeScan) {
        return {
          scanId,
          cancelled: false,
          message:
            "A varredura não está mais em execução.",
        };
      }

      /*
       * Impede que outra janela do aplicativo
       * cancele uma varredura que não iniciou.
       */
      if (
        activeScan.webContentsId !== event.sender.id
      ) {
        throw new Error(
          "Esta janela não pode cancelar a varredura.",
        );
      }

      const cancelled =
        activeScan.scan.cancel();

      return {
        scanId,
        cancelled,
        status:
          activeScan.scan.getSnapshot().status,
      };
    },
  );
}