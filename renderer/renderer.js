const urlInput = document.getElementById("url");
const thumb = document.getElementById("thumb");
const thumbPlaceholder = document.getElementById("thumbPlaceholder");
const filenameInput = document.getElementById("filename");
const formatSelect = document.getElementById("format");
const qualitySelect = document.getElementById("quality");
const folderBtn = document.getElementById("folderBtn");
const folderText = document.getElementById("folder");
const downloadBtn = document.getElementById("downloadBtn");
const cancelBtn = document.getElementById("cancelBtn");
const progressCard = document.getElementById("progressCard");
const bar = document.getElementById("bar");
const percent = document.getElementById("percent");
const eta = document.getElementById("eta");
const speed = document.getElementById("speed");
const status = document.getElementById("status");
const statusBadge = document.getElementById("statusBadge");

let selectedFolder = "";
let isDownloading = false;

const qualities = {
  mp4: [
    { value: "360", label: "360p" },
    { value: "480", label: "480p (SD)" },
    { value: "720", label: "720p (HD)" },
    { value: "1080", label: "1080p (Full HD)" },
    { value: "1440", label: "1440p (2K)" },
    { value: "2160", label: "2160p (4K)" },
    { value: "best", label: "Best Available" }
  ],
  mp3: [
    { value: "64", label: "64 kbps" },
    { value: "128", label: "128 kbps" },
    { value: "192", label: "192 kbps" },
    { value: "256", label: "256 kbps" },
    { value: "320", label: "320 kbps" }
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

formatSelect.addEventListener("change", () => populateQualities(formatSelect.value));
populateQualities("mp4");

let fetchTimeout;
urlInput.addEventListener("input", () => {
  clearTimeout(fetchTimeout);
  const val = urlInput.value.trim();
  if (!val) return;

  fetchTimeout = setTimeout(async () => {
    try {
      setStatus("Fetching info...", "idle");
      const info = await window.api.getInfo(val);
      if (!info) {
        alert("Invalid URL or failed to fetch video info");
        setStatus("Ready", "idle");
        return;
      }

      thumb.src = info.thumbnail;
      thumb.style.display = "block";
      thumbPlaceholder.style.display = "none";
      
      const sanitized = info.title.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
      filenameInput.value = sanitized;
      setStatus("Ready", "idle");
    } catch (e) {
      alert("Failed to fetch video info");
      setStatus("Ready", "idle");
    }
  }, 800);
});

folderBtn.addEventListener("click", async () => {
  const f = await window.api.chooseFolder();
  if (f) {
    selectedFolder = f;
    folderText.textContent = f;
  }
});

downloadBtn.addEventListener("click", () => {
  const url = urlInput.value.trim();
  if (!url) return alert("Enter URL");
  if (!selectedFolder) return alert("Choose folder");

  const fname = filenameInput.value.trim();
  const ext = formatSelect.value === "mp3" ? ".mp3" : ".mp4";
  const finalFilename = fname ? (fname.endsWith(ext) ? fname : fname + ext) : "";

  window.api.download({
    url,
    filename: finalFilename,
    format: formatSelect.value,
    quality: qualitySelect.value,
    folder: selectedFolder
  });

  startDownloadUI();
});

cancelBtn.addEventListener("click", () => {
  window.api.cancelDownload();
  bar.style.width = "0%";
  percent.textContent = "0%";
  eta.textContent = "--";
  speed.textContent = "--";
  setStatus("Cancelled", "error");
  setTimeout(() => {
    resetUI();
    progressCard.classList.remove("visible");
  }, 1500);
});

window.api.onProgress(data => {
  const pct = Math.min(100, Math.max(0, data.percent));
  bar.style.width = pct + "%";
  percent.textContent = pct.toFixed(1) + "%";
  eta.textContent = data.eta || "Calculating...";
  speed.textContent = data.speed || "--";
  setStatus("Downloading", "downloading");
});

window.api.onDone(() => {
  bar.style.width = "100%";
  percent.textContent = "100%";
  eta.textContent = "Done";
  speed.textContent = "--";
  setStatus("Completed", "success");
  setTimeout(resetUI, 2500);
});

window.api.onError(msg => {
  alert("Download failed:\n" + msg);
  setStatus("Failed", "error");
  eta.textContent = "--";
  speed.textContent = "--";
  setTimeout(resetUI, 2000);
});

function startDownloadUI() {
  isDownloading = true;
  downloadBtn.style.display = "none";
  cancelBtn.classList.add("visible");
  progressCard.classList.add("visible");

  bar.style.width = "0%";
  percent.textContent = "0%";
  eta.textContent = "Calculating...";
  speed.textContent = "--";

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

  statusBadge.style.border = "1.5px solid rgba(255,255,255,0.5)";
  statusBadge.style.background = "rgba(255,255,255,0.08)";
  dot.style.background = "white";
  dot.style.animation = "none";

  if (state === "downloading") {
    statusBadge.style.border = "1.5px solid rgba(255,255,255,0.7)";
    statusBadge.style.background = "rgba(255,255,255,0.12)";
    dot.style.background = "white";
    dot.style.animation = "pulse 1.4s infinite";
  }

  if (state === "success") {
    statusBadge.style.border = "1.5px solid #10b981";
    statusBadge.style.background = "rgba(16,185,129,0.12)";
    dot.style.background = "#10b981";
    dot.style.animation = "none";
  }

  if (state === "error") {
    statusBadge.style.border = "1.5px solid #f04438";
    statusBadge.style.background = "rgba(240,68,56,0.12)";
    dot.style.background = "#f04438";
    dot.style.animation = "none";
  }

  if (state === "idle") {
    statusBadge.style.border = "1.5px solid rgba(255,255,255,0.5)";
    statusBadge.style.background = "rgba(255,255,255,0.08)";
    dot.style.background = "white";
    dot.style.animation = "none";
  }
}
