import { ipcMain } from "electron";
import { getRecoveryEngineStatus } from "../services/recoveryEngineService.js";
import { buildWinfrCommand } from "../services/winfrCommandBuilder.js";
import { testRecoveryEngine } from "../services/recoveryEngineTestService.js";
import { cancelWinfrRecovery, startWinfrRecovery, getActiveWinfrRecovery } from "../services/winfrRecoveyService.js";

const ENGINE_STATUS_CHANNEL = "recovery:engine-status"
const PREVIEW_COMMAND_CHANNEL = "recovery:preview-command"
const TEST_ENGINE_CHANNEL = "recovery:test-engine"
const START_REAL_RECOVERY_CHANNEL = "recovery:start-real"
const CANCEL_REAL_RECOVERY_CHANNEL = "recovery:cancel-real"
const REAL_RECOVERY_UPDATE_CHANNEL = "recovery:real-update"
const GET_ACTIVE_RECOVERY_CHANNEL = "recovery:get-active-real"

export function registerRecoveryEngineIpc() {
    ipcMain.handle(
        ENGINE_STATUS_CHANNEL,
        async () => {
            return getRecoveryEngineStatus()
        }
    )

    ipcMain.handle(
        PREVIEW_COMMAND_CHANNEL,
        async (_event, request) => {
            return buildWinfrCommand(request)
        }
    )

    ipcMain.handle(
        TEST_ENGINE_CHANNEL,
        async () => {
            return testRecoveryEngine()
        }
    )

    ipcMain.handle(
  START_REAL_RECOVERY_CHANNEL,
  async (event, request) => {
    const sender = event.sender;

    return startWinfrRecovery(
      request,
      (update) => {
        if (!sender.isDestroyed()) {
          sender.send(
            REAL_RECOVERY_UPDATE_CHANNEL,
            update,
          );
        }
      },
    );
  },
);

ipcMain.handle(
  CANCEL_REAL_RECOVERY_CHANNEL,
  async (_event, recoveryId) => {
    return cancelWinfrRecovery(
      recoveryId,
    );
  },
);

ipcMain.handle(
  GET_ACTIVE_RECOVERY_CHANNEL,
  async () => {
    return getActiveWinfrRecovery();
  },
);
}