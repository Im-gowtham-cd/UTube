/* ── Element refs ── */
const urlInput         = document.getElementById("url");
const thumb            = document.getElementById("thumb");
const thumbPlaceholder = document.getElementById("thumbPlaceholder");
const filenameInput    = document.getElementById("filename");
const formatSelect     = document.getElementById("format");
const qualitySelect    = document.getElementById("quality");
const folderBtn        = document.getElementById("folderBtn");
const folderText       = document.getElementById("folder");
const downloadBtn      = document.getElementById("downloadBtn");
const cancelBtn        = document.getElementById("cancelBtn");
const progressCard     = document.getElementById("progressCard");
const bar              = document.getElementById("bar");
const percent          = document.getElementById("percent");
const eta              = document.getElementById("eta");
const speed            = document.getElementById("speed");
const status           = document.getElementById("status");
const statusBadge      = document.getElementById("statusBadge");

/* ── State ── */
let selectedFolder = "";
let isDownloading  = false;

/* ── Quality options per format ── */
const qualities = {
  mp4: [
    { value: "480",  label: "480p (SD)" },
    { value: "720",  label: "720p (HD)" },
    { value: "1080", label: "1080p (Full HD)" },
    { value: "1440", label: "1440p (2K)" },
    { value: "2160", label: "2160p (4K)" },
    { value: "best", label: "Best Available" },
  ],
  mp3: [
    { value: "64",  label: "64 kbps" },
    { value: "128", label: "128 kbps" },
    { value: "192", label: "192 kbps" },
    { value: "256", label: "256 kbps" },
    { value: "320", label: "320 kbps" },
  ]
};

function populateQualities(format) {
  qualitySelect.innerHTML = "";
  qualities[format].forEach(q => {
    const opt = document.createElement("option");
    opt.value = q.value;
    opt.textContent = q.label;
    qualitySelect.appendChild(opt);
  });
  qualitySelect.value = format === "mp3" ? "192" : "720";
}

/* ── Format change ── */
formatSelect.addEventListener("change", () => populateQualities(formatSelect.value));
populateQualities("mp4");

/* ── URL blur → fetch video info ── */
urlInput.addEventListener("blur", async () => {
  const val = urlInput.value.trim();
  if (!val) return;
  try {
    const info = await window.api.getInfo(val);
    if (!info) { alert("Failed to fetch video info. Please check the URL."); return; }
    thumb.src = info.thumbnail;
    thumb.style.display = "block";
    thumbPlaceholder.style.display = "none";
    filenameInput.value = info.title;
  } catch (e) {
    alert("Error fetching info: " + e);
  }
});

/* ── Folder picker ── */
folderBtn.addEventListener("click", async () => {
  try {
    const f = await window.api.chooseFolder();
    if (f) { selectedFolder = f; folderText.textContent = f; }
  } catch (e) { console.error("Folder picker error:", e); }
});

/* ── Download ── */
downloadBtn.addEventListener("click", () => {
  const url = urlInput.value.trim();
  if (!url) { alert("Please enter a YouTube URL."); return; }
  if (!selectedFolder) { alert("Please choose a download folder."); return; }

  window.api.download({
    url,
    filename: filenameInput.value.trim(),
    format:   formatSelect.value,
    quality:  qualitySelect.value,
    folder:   selectedFolder
  });

  startDownloadUI();
});

/* ── Cancel ── */
cancelBtn.addEventListener("click", () => {
  window.api.cancelDownload();
  resetUI();
  setStatus("Cancelled", "idle");
  eta.textContent   = "--";
  speed.textContent = "--";
});

/* ── Progress events ── */
window.api.onProgress(data => {
  bar.style.width     = data.percent + "%";
  percent.textContent = data.percent.toFixed(1) + "%";
  eta.textContent     = data.eta   || "--";
  speed.textContent   = data.speed || "--";
  setStatus("Downloading", "idle");
});

window.api.onDone(() => {
  bar.style.width     = "100%";
  percent.textContent = "100%";
  eta.textContent     = "Done";
  speed.textContent   = "--";
  setStatus("Completed", "success");
  setTimeout(resetUI, 3000);
});

window.api.onError(errMsg => {
  let msg = errMsg || "Unknown error";
  if (msg.includes("yt-dlp") || msg.includes("spawn")) {
    msg = "yt-dlp not found.\n\nInstall it:\n  Windows: winget install yt-dlp\n  or: https://github.com/yt-dlp/yt-dlp/releases";
  } else if (msg.includes("ffmpeg")) {
    msg = "ffmpeg not found.\n\nInstall it:\n  Windows: winget install ffmpeg\n  or: https://ffmpeg.org/download.html";
  } else if (msg.includes("unavailable") || msg.includes("private")) {
    msg = "Video is unavailable or private.";
  } else if (msg.includes("403") || msg.includes("sign in")) {
    msg = "This video requires sign-in.\n\nTry updating yt-dlp:\n  yt-dlp -U";
  }
  alert("Download Error:\n\n" + msg);
  setStatus("Failed", "error");
  eta.textContent   = "--";
  speed.textContent = "--";
  setTimeout(resetUI, 2000);
});

/* ── UI helpers ── */
function startDownloadUI() {
  isDownloading = true;
  downloadBtn.style.display = "none";
  cancelBtn.classList.add("visible");
  progressCard.classList.add("visible");
  bar.style.width     = "0%";
  percent.textContent = "0%";
  eta.textContent     = "Calculating...";
  speed.textContent   = "--";
  setStatus("Initializing", "idle");
}

function resetUI() {
  isDownloading = false;
  downloadBtn.style.display = "flex";
  cancelBtn.classList.remove("visible");
}

function setStatus(label, state) {
  status.textContent = label;
  const dot = statusBadge.querySelector(".status-dot");
  statusBadge.style.border     = "1.5px solid rgba(255,255,255,0.5)";
  statusBadge.style.background = "rgba(255,255,255,0.08)";
  dot.style.background         = "var(--text)";
  dot.style.animation          = "pulse 1.4s ease-in-out infinite";
  status.style.color           = "var(--text)";
  if (state === "success") {
    statusBadge.style.border     = "1.5px solid #10b981";
    statusBadge.style.background = "rgba(16,185,129,0.12)";
    dot.style.background         = "#10b981";
    dot.style.animation          = "none";
  } else if (state === "error") {
    statusBadge.style.border     = "1.5px solid #f04438";
    statusBadge.style.background = "rgba(240,68,56,0.12)";
    dot.style.background         = "#f04438";
    dot.style.animation          = "none";
  }
}