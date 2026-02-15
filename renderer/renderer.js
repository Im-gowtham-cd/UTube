let folder = "";
let isDownloading = false;

const url = document.getElementById("url");
const thumb = document.getElementById("thumb");
const downloadBtn = document.getElementById("downloadBtn");
const cancelBtn = document.getElementById("cancelBtn");
const formatSelect = document.getElementById("format");
const qualitySelect = document.getElementById("quality");
const progressCard = document.getElementById("progressCard");
const previewSection = document.getElementById("preview-section");

// Handle format change to show appropriate quality options
formatSelect.addEventListener("change", () => {
  const format = formatSelect.value;
  const audioOptions = document.querySelectorAll(".audio-quality");
  const videoOptions = document.querySelectorAll(".video-quality");
  
  if (format === "mp3") {
    audioOptions.forEach(opt => opt.style.display = "block");
    videoOptions.forEach(opt => opt.style.display = "none");
    qualitySelect.value = "192";
  } else {
    audioOptions.forEach(opt => opt.style.display = "none");
    videoOptions.forEach(opt => opt.style.display = "block");
    qualitySelect.value = "720";
  }
});

// Initialize with MP4 format
formatSelect.dispatchEvent(new Event("change"));

url.addEventListener("blur", async () => {
  if (!url.value) return;
  
  const i = await window.api.getInfo(url.value);
  if (!i) {
    alert("Failed to fetch video info. Please check the URL.");
    return;
  }

  thumb.src = i.thumbnail;
  previewSection.style.display = "block";
  document.getElementById("filename").value = i.title;
});

document.getElementById("folderBtn").onclick = async () => {
  folder = await window.api.chooseFolder();
  if (folder) {
    document.getElementById("folder").innerText = folder;
  }
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
  cancelBtn.style.display = "flex";
  progressCard.style.display = "block";
  
  document.getElementById("status").innerText = "Initializing...";
  document.getElementById("bar").style.width = "0%";
  document.getElementById("percent").innerText = "0%";
};

cancelBtn.onclick = () => {
  window.api.cancelDownload();
  resetUI();
  document.getElementById("status").innerText = "Cancelled";
  document.getElementById("eta").innerText = "--";
  document.getElementById("speed").innerText = "--";
};

window.api.onProgress(data => {
  document.getElementById("bar").style.width = data.percent + "%";
  document.getElementById("percent").innerText = data.percent.toFixed(1) + "%";
  document.getElementById("status").innerText = "Downloading";
  document.getElementById("eta").innerText = data.eta;
  document.getElementById("speed").innerText = data.speed;
});

window.api.onDone(() => {
  document.getElementById("status").innerText = "Completed";
  document.getElementById("eta").innerText = "Done";
  document.getElementById("speed").innerText = "--";
  document.getElementById("bar").style.width = "100%";
  document.getElementById("percent").innerText = "100%";
  
  // Change status badge color to success
  const statusBadge = document.getElementById("statusBadge");
  statusBadge.style.background = "rgba(16, 185, 129, 0.1)";
  statusBadge.style.borderColor = "#10b981";
  statusBadge.style.color = "#10b981";
  
  setTimeout(resetUI, 3000);
});

window.api.onError(e => {
  alert("Error: " + e);
  document.getElementById("status").innerText = "Failed";
  document.getElementById("eta").innerText = "--";
  document.getElementById("speed").innerText = "--";
  
  // Change status badge color to error
  const statusBadge = document.getElementById("statusBadge");
  statusBadge.style.background = "rgba(240, 68, 56, 0.1)";
  statusBadge.style.borderColor = "#f04438";
  statusBadge.style.color = "#f04438";
  
  resetUI();
});

function resetUI() {
  isDownloading = false;
  downloadBtn.style.display = "flex";
  cancelBtn.style.display = "none";
}