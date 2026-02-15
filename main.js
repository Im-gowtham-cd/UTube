const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const ytdlp = require("yt-dlp-exec");

let win;
let currentDownload = null;

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
    // Fixed format selection to ensure audio is included
    if (quality === "best") {
      opts.format = "bestvideo+bestaudio/best";
    } else {
      opts.format = `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`;
    }
    opts.mergeOutputFormat = "mp4";
    opts.postprocessorArgs = ["-c:v", "copy", "-c:a", "aac"];
  }

  try {
    currentDownload = ytdlp.exec(url, opts);

    currentDownload.stdout.on("data", (chunk) => {
      const output = chunk.toString();
      
      // Parse progress, speed, and ETA from yt-dlp output
      const progressMatch = output.match(/(\d{1,3}\.\d)%/);
      const etaMatch = output.match(/ETA\s+(\d{2}:\d{2})/);
      const speedMatch = output.match(/at\s+([\d.]+\w+\/s)/);
      
      if (progressMatch) {
        const progress = parseFloat(progressMatch[1]);
        const eta = etaMatch ? etaMatch[1] : "calculating...";
        const speed = speedMatch ? speedMatch[1] : "";
        
        event.sender.send("progress", {
          percent: progress,
          eta: eta,
          speed: speed
        });
      }
    });

    currentDownload.on("close", (code) => {
      currentDownload = null;
      if (code === 0) {
        event.sender.send("done");
      } else {
        event.sender.send("error", "Download failed");
      }
    });

    currentDownload.on("error", (err) => {
      currentDownload = null;
      event.sender.send("error", err.message);
    });

  } catch (error) {
    currentDownload = null;
    event.sender.send("error", error.message);
  }
});

ipcMain.on("cancel-download", () => {
  if (currentDownload) {
    currentDownload.kill();
    currentDownload = null;
  }
});