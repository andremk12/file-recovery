import { ipcMain } from "electron";
import { getRecoveryEngineStatus } from "../services/recoveryEngineService.js";
import { buildWinfrCommand } from "../services/winfrCommandBuilder.js";

const ENGINE_STATUS_CHANNEL = "recovery:engine-status"
const PREVIEW_COMMAND_CHANNEL = "recovery:preview-command"

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
}