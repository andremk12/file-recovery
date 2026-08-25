const { contextBridge, ipcRenderer} = require("electron")

contextBridge.exposeInMainWorld("desktopAPI", {
    getAppInfo: () => ipcRenderer.invoke("app:get-info"),
})