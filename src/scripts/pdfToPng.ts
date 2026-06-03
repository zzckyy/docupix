import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import JSZip from "jszip";
import { saveAs } from "file-saver";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const updateFileInfo = (file: File, filename: HTMLElement, filesize: HTMLElement, filezone: HTMLElement) => {
  const sizeMB = file.size / (1024 * 1024);
  filename.innerText = file.name;
  filesize.innerText = sizeMB.toFixed(2) + "MB";
  filezone.classList.remove("hidden");
};

const convertPdfToPng = async (file: File, showLoading: (text: string) => void, hideLoading: () => void, setButtonDisabled: (disabled: boolean) => void) => {
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

      await page.render({ canvas, viewport }).promise;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );

      if (!blob) return;

      if (totalPages === 1) {
        saveAs(blob, file.name.replace(/\.pdf$/i, ".png"));
      } else {
        zip.file(`${file.name.replace(/\.pdf$/i, "")} page-${i}.png`, blob);
      }
    }

    if (totalPages > 1) {
      showLoading("Finalizing download...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, file.name.replace(/\.pdf$/i, ".zip"));
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
  const input = document.getElementById("input") as HTMLInputElement | null;
  const filename = document.getElementById("filename");
  const filesize = document.getElementById("filesize");
  const filezone = document.getElementById("filezone");
  const processBtn = document.getElementById("processBtn");
  const dropzone = document.querySelector(".dropzone");
  const sendIcon = document.querySelector("#send");
  const loadingContainer = document.getElementById("loadingContainer");
  const loadingText = document.getElementById("loadingText");
  const boxDanger = document.getElementById("boxDanger")

  if (!inputBtn || !input || !filename || !filesize || !filezone || !processBtn || !sendIcon || !loadingContainer || !boxDanger) {
    return;
  }

  const showLoading = (text: string) => {
    if (loadingText) loadingText.innerText = text;
    loadingContainer.classList.remove("hidden");
  };

  const hideLoading = () => {
    loadingContainer.classList.add("hidden");
  };

  const setButtonDisabled = (disabled: boolean) => {
    if(processBtn instanceof HTMLButtonElement){
      processBtn.disabled = disabled;
    if (disabled) {
      processBtn.style.opacity = "0.5";
      processBtn.style.cursor = "not-allowed";
    } else {
      processBtn.style.opacity = "1";
      processBtn.style.cursor = "pointer";
    }
    }
    
  };

  let selectedFile: File | null = null;
  filezone.classList.add("hidden");

  //klik select file
  inputBtn.onclick = (e) => {
    e.stopPropagation();
    input.click()
  };

  dropzone?.addEventListener("click", () =>{
    input.click();
  })

  input.addEventListener("change", (event) => {
    const file = (event.target as HTMLInputElement)?.files?.[0];

    //cek jika tidak ada file
    if (!file) return;

    //cek jika file tidak pdf
    if(file.type !== 'application/pdf'){
      boxDanger.classList.remove("hidden");

      return;
    }

    boxDanger.classList.add("hidden");
    selectedFile = file;
    updateFileInfo(file, filename, filesize, filezone);

    
  });

  processBtn.onclick = async () => {
    if (!selectedFile) return;

    //pengecekan pdf saat klik process
    if(selectedFile.type !== 'application/pdf'){
      boxDanger.classList.remove('hidden');
      return;
    } 
    boxDanger.classList.add('hidden');
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
        if(event instanceof DragEvent){
            event.preventDefault();
            dropzone.classList.remove("has-background-light");
            const file = event.dataTransfer?.files?.[0];
            if (!file || file.type !== "application/pdf") return;
            selectedFile = file;
            updateFileInfo(file, filename, filesize, filezone);

        }
    });
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", init);
}
