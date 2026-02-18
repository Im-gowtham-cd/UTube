const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { spawn, exec } = require("child_process");
const fs = require("fs");

let win;
let currentDownload = null;
let downloadCancelled = false;

const isDev = !app.isPackaged;
const YTDLP_PATH = isDev 
  ? path.join(__dirname, "yt-dlp.exe")
  : path.join(process.resourcesPath, "yt-dlp.exe");
const FFMPEG_PATH = isDev
  ? path.join(__dirname, "bin")
  : path.join(process.resourcesPath, "bin");

function createWindow() {
  win = new BrowserWindow({
    width: 850,
    height: 850,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("choose-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"]
  });

  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle("get-info", async (_, url) => {
  if (!isValidYouTubeUrl(url)) {
    return null;
  }

  if (!fs.existsSync(YTDLP_PATH)) {
    throw new Error("yt-dlp.exe not found. Please ensure it's in the app directory.");
  }

  return new Promise((resolve) => {
    const args = [
      "--dump-single-json",
      "--skip-download",
      "--no-warnings",
      "--no-playlist",
      url
    ];

    const proc = spawn(YTDLP_PATH, args, {
      windowsHide: true
    });

    let output = "";
    let errorOutput = "";

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0 && output) {
        try {
          const info = JSON.parse(output);
          resolve({
            title: info.title || "Unknown",
            thumbnail: info.thumbnail || "",
            duration: info.duration || 0
          });
        } catch {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });

    proc.on("error", () => {
      resolve(null);
    });
  });
});

ipcMain.on("download", (event, data) => {
  const { url, format, quality, folder, filename } = data;

  downloadCancelled = false;

  if (!isValidYouTubeUrl(url)) {
    event.sender.send("error", "Invalid YouTube URL");
    return;
  }

  if (!fs.existsSync(YTDLP_PATH)) {
    event.sender.send("error", "yt-dlp.exe not found");
    return;
  }

  if (!fs.existsSync(FFMPEG_PATH)) {
    event.sender.send("error", "FFmpeg not found in bin folder");
    return;
  }

  const sanitizedFilename = sanitizeFilename(filename || "%(title)s");
  const outputPath = path.join(folder, sanitizedFilename);

  const args = [
    "--newline",
    "--no-warnings",
    "--no-playlist",
    "--no-continue",
    "--concurrent-fragments", "8",
    "--retries", "3",
    "--fragment-retries", "3",
    "--buffer-size", "16K",
    "--http-chunk-size", "10M",
    "--ffmpeg-location", FFMPEG_PATH,
    "-o", outputPath
  ];

  if (format === "mp3") {
    args.push("-x");
    args.push("--audio-format", "mp3");
    args.push("--audio-quality", quality || "192");
    args.push("--embed-thumbnail");
    args.push("--add-metadata");
  } else {
    let formatStr;
    if (quality === "best") {
      formatStr = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best";
    } else {
      formatStr = `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`;
    }
    args.push("-f", formatStr);
    args.push("--merge-output-format", "mp4");
    args.push("--postprocessor-args", "ffmpeg:-c:v copy -c:a copy");
  }

  args.push(url);

  currentDownload = spawn(YTDLP_PATH, args, {
    windowsHide: true,
    detached: false
  });

  currentDownload.stdout.on("data", (chunk) => {
    if (downloadCancelled) return;
    
    const output = chunk.toString();
    
    const progressMatch = output.match(/(\d{1,3}\.\d)%/);
    const etaMatch = output.match(/ETA\s+(\d{2}:\d{2})/);
    const speedMatch = output.match(/([\d.]+\s*[KMG]iB\/s)/i);

    if (progressMatch) {
      event.sender.send("progress", {
        percent: parseFloat(progressMatch[1]),
        eta: etaMatch ? etaMatch[1] : "",
        speed: speedMatch ? speedMatch[1] : ""
      });
    }
  });

  currentDownload.stderr.on("data", (chunk) => {
    if (downloadCancelled) return;
    
    const output = chunk.toString();
    
    const progressMatch = output.match(/(\d{1,3}\.\d)%/);
    const etaMatch = output.match(/ETA\s+(\d{2}:\d{2})/);
    const speedMatch = output.match(/([\d.]+\s*[KMG]iB\/s)/i);

    if (progressMatch) {
      event.sender.send("progress", {
        percent: parseFloat(progressMatch[1]),
        eta: etaMatch ? etaMatch[1] : "",
        speed: speedMatch ? speedMatch[1] : ""
      });
    }
  });

  currentDownload.on("close", (code) => {
    const wasCancelled = downloadCancelled;
    currentDownload = null;
    downloadCancelled = false;
    
    if (wasCancelled) {
      return;
    }
    
    if (code === 0) {
      event.sender.send("done");
    } else {
      event.sender.send("error", "Download failed");
    }
  });

  currentDownload.on("error", (err) => {
    currentDownload = null;
    downloadCancelled = false;
    event.sender.send("error", err.message);
  });
});

ipcMain.on("cancel-download", (event) => {
  if (currentDownload && !currentDownload.killed) {
    downloadCancelled = true;
    
    const pid = currentDownload.pid;
    
    try {
      if (process.platform === "win32") {
        exec(`taskkill /F /T /PID ${pid}`, (error) => {
          if (error) {
            console.error("Taskkill main error:", error);
          }
        });
        
        exec(`taskkill /F /IM yt-dlp.exe`, (error) => {
          if (error) {
            console.error("Taskkill yt-dlp error:", error);
          }
        });
        
        exec(`taskkill /F /IM ffmpeg.exe`, (error) => {
          if (error) {
            console.error("Taskkill ffmpeg error:", error);
          }
        });
        
        setTimeout(() => {
          exec(`wmic process where "name='yt-dlp.exe' or name='ffmpeg.exe'" delete`, () => {});
        }, 500);
      } else {
        currentDownload.kill("SIGKILL");
      }
      
      currentDownload = null;
    } catch (err) {
      console.error("Failed to kill process:", err);
      currentDownload = null;
    }
  }
});

function isValidYouTubeUrl(url) {
  const patterns = [
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/
  ];
  return patterns.some(pattern => pattern.test(url));
}

function sanitizeFilename(filename) {
  return filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}
