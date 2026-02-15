let folder = "";

const url = document.getElementById("url");
const thumb = document.getElementById("thumb");

url.addEventListener("change", async () => {
  const i = await window.api.getInfo(url.value);
  if (!i) return;

  thumb.src = i.thumbnail;
  thumb.style.display = "block";
  document.getElementById("filename").value = i.title;
});

document.getElementById("folderBtn").onclick = async () => {
  folder = await window.api.chooseFolder();
  document.getElementById("folder").innerText = folder;
};

document.getElementById("downloadBtn").onclick = () => {
  if (!url.value || !folder) return;

  window.api.download({
    url: url.value,
    filename: document.getElementById("filename").value,
    format: document.getElementById("format").value,
    quality: document.getElementById("quality").value,
    folder
  });

  document.getElementById("status").innerText = "Downloading";
};

window.api.onProgress(p => {
  document.getElementById("bar").style.width = p + "%";
});

window.api.onDone(() => {
  document.getElementById("status").innerText = "Done";
});

window.api.onError(e => alert(e));
