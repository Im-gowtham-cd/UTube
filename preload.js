const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  chooseFolder: () => ipcRenderer.invoke("choose-folder"),
  getInfo: (u) => ipcRenderer.invoke("get-info", u),
  download: (d) => ipcRenderer.send("download", d),
  cancelDownload: () => ipcRenderer.send("cancel-download"),
  onProgress: (c) => ipcRenderer.on("progress", (_, p) => c(p)),
  onDone: (c) => ipcRenderer.on("done", c),
  onError: (c) => ipcRenderer.on("error", (_, e) => c(e))
});
