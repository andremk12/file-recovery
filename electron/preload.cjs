const { contextBridge, ipcRenderer} = require("electron")

contextBridge.exposeInMainWorld("desktopAPI", {
    getAppInfo: () => ipcRenderer.invoke("app:get-info"),
    getDrive: () => ipcRenderer.invoke("drives:list"),
    selectDestination: () => ipcRenderer.invoke("recovery:select-destination"),

    startScan: (request) => ipcRenderer.invoke("scan:start", request),
    cancelScan: (scanId) => ipcRenderer.invoke("scan:cancel", scanId),
    getRecoveryEngineStatus: () => ipcRenderer.invoke("recovery:engine-status"),
    previewRecoveryCommand: (request) => ipcRenderer.invoke("recovery:preview-command", request),
    testRecoveryEngine: () => ipcRenderer.invoke("recovery:test-engine"),
    startRealRecovery: (request) => ipcRenderer.invoke("recovery:start-real", request),
    cancelRealRecovery: (recoveryId) => ipcRenderer.invoke("recovery:cancel-real", recoveryId),
    getActiveRealRecovery: () => ipcRenderer.invoke("recovery:get-active-real"),
    onRealRecoveryUpdate: (callback) => {
            if (typeof callback !== "function") {
                throw new TypeError(
                "O callback da recuperação é inválido.",
                );
            }

            const listener = (_event, update) => {
                callback(update);
            };

            ipcRenderer.on(
                "recovery:real-update",
                listener,
            );

            return () => {
                ipcRenderer.removeListener(
                "recovery:real-update",
                listener,
                );
            };
            },

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
    },

    selectSourceFolder: () =>
    ipcRenderer.invoke(
    "recovery:select-source-folder",
  ),
})