import { ipcMain } from "electron";
import { getDrive } from "../services/driveService.js";

const LIST_DRIVES_CHANNEL = "drives:list"

export function registerDriveIpc() {
    ipcMain.handle(LIST_DRIVES_CHANNEL, async () => {
        return getDrive()
    })
}