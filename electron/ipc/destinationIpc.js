import { BrowserWindow, dialog, ipcMain } from "electron";

const SELECT_DESTINATION_CHANNEL = "recovery:select-destination";

export function registerDestinationIpc() {
    ipcMain.handle(
        SELECT_DESTINATION_CHANNEL, 
        async (event) => {
            const parentWindow = BrowserWindow.fromWebContents(event.sender)

        if (!parentWindow) {
            throw new Error (
                "Não foi possível identificar a janela principal",
            )
        }
            const result = await dialog.showOpenDialog(
            parentWindow,
            {
                title: "Selecionar pasta de destino",
                buttonLabel: "Selecionar pasta",
                properties: [
                    "openDirectory",
                    "dontAddToRecent",
                ]
            }
        )

        if (
            result.canceled || 
            result.filePaths.length === 0
        ) {
            return null
        }

            return result.filePaths[0]
        }
    )
}