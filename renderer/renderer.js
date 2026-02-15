let folder = "";
let isDownloading = false;

const url = document.getElementById("url");
const thumb = document.getElementById("thumb");
const downloadBtn = document.getElementById("downloadBtn");
const cancelBtn = document.getElementById("cancelBtn");
const formatSelect = document.getElementById("format");
const qualitySelect = document.getElementById("quality");

// Handle format change to show appropriate quality options
formatSelect.addEventListener("change", () => {
  const format = formatSelect.value;
  const audioOptions = document.querySelectorAll(".audio-quality");
  const videoOptions = document.querySelectorAll(".video-quality");
  
  if (format === "mp3") {
    audioOptions.forEach(opt => opt.style.display = "block");
    videoOptions.forEach(opt => opt.style.display = "none");
    qualitySelect.value = "192"; // Default audio quality
  } else {
    audioOptions.forEach(opt => opt.style.display = "none");
    videoOptions.forEach(opt => opt.style.display = "block");
    qualitySelect.value = "best"; // Default video quality
  }
});

// Initialize with MP4 format
formatSelect.dispatchEvent(new Event("change"));

url.addEventListener("change", async () => {
  const i = await window.api.getInfo(url.value);
  if (!i) {
    alert("Failed to fetch video info. Please check the URL.");
    return;
  }

  thumb.src = i.thumbnail;
  thumb.style.display = "block";
  document.getElementById("filename").value = i.title;
});

document.getElementById("folderBtn").onclick = async () => {
  folder = await window.api.chooseFolder();
  document.getElementById("folder").innerText = folder;
};

downloadBtn.onclick = () => {
  if (!url.value || !folder) {
    alert("Please enter a URL and choose a folder");
    return;
  }

  window.api.download({
    url: url.value,
    filename: document.getElementById("filename").value,
    format: document.getElementById("format").value,
    quality: document.getElementById("quality").value,
    folder
  });

  isDownloading = true;
  downloadBtn.style.display = "none";
  cancelBtn.style.display = "inline-block";
  document.getElementById("status").innerText = "Starting download...";
  document.getElementById("bar").style.width = "0%";
  document.getElementById("percent").innerText = "0%";
};

cancelBtn.onclick = () => {
  window.api.cancelDownload();
  resetUI();
  document.getElementById("status").innerText = "Download cancelled";
  document.getElementById("eta").innerText = "";
  document.getElementById("speed").innerText = "";
};

window.api.onProgress(data => {
  document.getElementById("bar").style.width = data.percent + "%";
  document.getElementById("percent").innerText = data.percent.toFixed(1) + "%";
  document.getElementById("status").innerText = "Downloading...";
  document.getElementById("eta").innerText = "Time remaining: " + data.eta;
  document.getElementById("speed").innerText = "Speed: " + data.speed;
});

window.api.onDone(() => {
  document.getElementById("status").innerText = "Download Complete!";
  document.getElementById("eta").innerText = "";
  document.getElementById("speed").innerText = "";
  document.getElementById("bar").style.width = "100%";
  document.getElementById("percent").innerText = "100%";
  resetUI();
});

window.api.onError(e => {
  alert("Error: " + e);
  document.getElementById("status").innerText = "Error occurred";
  document.getElementById("eta").innerText = "";
  document.getElementById("speed").innerText = "";
  resetUI();
});

function resetUI() {
  isDownloading = false;
  downloadBtn.style.display = "inline-block";
  cancelBtn.style.display = "none";
}