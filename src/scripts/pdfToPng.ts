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

const convertPdfToPng = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const zip = new JSZip();

  for (let i = 1; i <= totalPages; i++) {
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
      zip.file(`page-${i}.png`, blob);
    }
  }

  if (totalPages > 1) {
    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, file.name.replace(/\.pdf$/i, ".zip"));
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

  if (!inputBtn || !input || !filename || !filesize || !filezone || !processBtn) {
    return;
  }

  let selectedFile: File | null = null;
  filezone.classList.add("hidden");

  inputBtn.onclick = () => input.click();

  input.addEventListener("change", (event) => {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (!file) return;
    selectedFile = file;
    updateFileInfo(file, filename, filesize, filezone);
  });

  processBtn.onclick = async () => {
    if (!selectedFile) return;
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    await delay(2000);
    await convertPdfToPng(selectedFile);
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
