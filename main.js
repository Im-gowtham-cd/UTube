const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const ytdlp = require("yt-dlp-exec");

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 650,
    height: 650,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile("renderer/index.html");
}

app.whenReady().then(createWindow);

ipcMain.handle("choose-folder", async () => {
  const r = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  return r.filePaths[0];
});

ipcMain.handle("get-info", async (_, url) => {
  try {
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      skipDownload: true
    });

    return { title: info.title, thumbnail: info.thumbnail };
  } catch {
    return null;
  }
});

ipcMain.on("download", async (event, d) => {
  const { url, format, quality, folder, filename } = d;

  const opts = {
    output: `${folder}/${filename || "%(title)s.%(ext)s"}`,
    progress: true,
    newline: true
  };

  if (format === "mp3") {
    opts.extractAudio = true;
    opts.audioFormat = "mp3";
    opts.audioQuality = quality;
  } else {
    opts.format = `bestvideo[height<=${quality}]+bestaudio/best`;
    opts.mergeOutputFormat = "mp4";
  }

  try {
    const stream = ytdlp.exec(url, opts);

    stream.stdout.on("data", (chunk) => {
      const output = chunk.toString();
      
      // Parse progress from yt-dlp output
      const downloadMatch = output.match(/(\d{1,3}\.\d)%/);
      if (downloadMatch) {
        event.sender.send("progress", parseFloat(downloadMatch[1]));
      }
    });

    stream.on("close", (code) => {
      if (code === 0) {
        event.sender.send("done");
      } else {
        event.sender.send("error", "Download failed");
      }
    });

    stream.on("error", (err) => {
      event.sender.send("error", err.message);
    });

  } catch (error) {
    event.sender.send("error", error.message);
  }
});