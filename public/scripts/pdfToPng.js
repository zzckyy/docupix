// import '/pdfjs-dist'
// import 'jszip';

// setup pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const updateFileInfo = (file, filename, filesize, filezone) => {
  const sizeMB = file.size / (1024 * 1024);
  filename.innerText = file.name;
  filesize.innerText = sizeMB.toFixed(2) + "MB";
  filezone.classList.remove("hidden");
};

const convertPdfToPng = async (file, showLoading, hideLoading, setButtonDisabled) => {
  try {
    showLoading("Converting...");
    setButtonDisabled(true);

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    const zip = new JSZip();

    for (let i = 1; i <= totalPages; i++) {
      showLoading(`Converting page ${i} of ${totalPages}...`);

      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );

      if (!blob) return;

      if (totalPages === 1) {
        downloadBlob(blob, file.name.replace(/\.pdf$/i, ".png"));
      } else {
        zip.file(`${file.name.replace(/\.pdf$/i, "")} page-${i}.png`, blob);
      }
    }

    if (totalPages > 1) {
      showLoading("Finalizing download...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, file.name.replace(/\.pdf$/i, ".zip"));
    }

    hideLoading();
  } catch (error) {
    console.error("Conversion error:", error);
    hideLoading();
  } finally {
    setButtonDisabled(false);
  }
};

const init = () => {
  const inputBtn = document.getElementById("inputBtn");
  const input = document.getElementById("input");
  const filename = document.getElementById("filename");
  const filesize = document.getElementById("filesize");
  const filezone = document.getElementById("filezone");
  const processBtn = document.getElementById("processBtn");
  const dropzone = document.querySelector(".dropzone");
  const sendIcon = document.querySelector("#send");
  const loadingContainer = document.getElementById("loadingContainer");
  const loadingText = document.getElementById("loadingText");
  const boxDanger = document.getElementById("boxDanger");

  if (!inputBtn || !input || !filename || !filesize || !filezone || !processBtn || !sendIcon || !loadingContainer || !boxDanger) {
    return;
  }

  const showLoading = (text) => {
    if (loadingText) loadingText.innerText = text;
    loadingContainer.classList.remove("hidden");
  };

  const hideLoading = () => {
    loadingContainer.classList.add("hidden");
  };

  const setButtonDisabled = (disabled) => {
    if (processBtn instanceof HTMLButtonElement) {
      processBtn.disabled = disabled;
      processBtn.style.opacity = disabled ? "0.5" : "1";
      processBtn.style.cursor = disabled ? "not-allowed" : "pointer";
    }
  };

  let selectedFile = null;
  filezone.classList.add("hidden");

  inputBtn.onclick = (e) => {
    e.stopPropagation();
    input.click();
  };

  dropzone?.addEventListener("click", () => {
    input.click();
  });

  input.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      boxDanger.classList.remove("hidden");
      return;
    }

    boxDanger.classList.add("hidden");
    selectedFile = file;
    updateFileInfo(file, filename, filesize, filezone);
  });

  processBtn.onclick = async () => {
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      boxDanger.classList.remove("hidden");
      return;
    }

    boxDanger.classList.add("hidden");
    await convertPdfToPng(selectedFile, showLoading, hideLoading, setButtonDisabled);
  };

  if (dropzone) {
    dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropzone.classList.add("has-background-light");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("has-background-light");
    });

    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropzone.classList.remove("has-background-light");

      const file = event.dataTransfer?.files?.[0];
      if (!file || file.type !== "application/pdf") return;

      selectedFile = file;
      updateFileInfo(file, filename, filesize, filezone);
    });
  }
};

window.addEventListener("DOMContentLoaded", init);