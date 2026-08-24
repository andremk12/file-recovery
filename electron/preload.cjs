const { contextBridge, ipcRender} = require("electron")

contextBridge.exposeInMainWorld("desktopAPI", {
    getAppInfo: () => ipcRender.invoke("app:get-info")
})