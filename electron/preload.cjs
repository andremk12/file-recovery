const { contextBridge, ipcRenderer} = require("electron")

contextBridge.exposeInMainWorld("desktopAPI", {
    getAppInfo: () => ipcRenderer.invoke("app:get-info"),
    getDrive: () => ipcRenderer.invoke("drives:list"),
    selectDestination: () => ipcRenderer.invoke("recovery:select-destination")
})