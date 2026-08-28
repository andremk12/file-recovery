const { contextBridge, ipcRenderer} = require("electron")


contextBridge.exposeInMainWorld("desktopAPI", {
    getAppInfo: () => ipcRenderer.invoke("app:get-info"),
    getDrive: () => ipcRenderer.invoke("drives:list"),
    selectDestination: () => ipcRenderer.invoke("recovery:select-destination"),

    startScan: (request) => ipcRenderer.invoke("scan:start", request),
    cancelScan: (scanId) => ipcRenderer.invoke("scan:cancel", scanId),

    onScanUpdate: (callBack) => {
        if (typeof callBack !== "function") {
            throw new TypeError(
                "O callback da varredura é invalido."
            )
        }

        const listener = (_event, update) => {
            callBack(update)
        }

        ipcRenderer.on("scan:update", listener)

        return () => {
            ipcRenderer.removeListener(
                "scan:update",
                listener
            )
        }
    }
})