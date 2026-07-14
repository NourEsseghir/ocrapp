import React, { useRef, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  UploadCloud,
  FileText,
  X,
  RotateCcw,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight,
} from "lucide-react";
import "./pdf-to-excel-ocr.css";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const API = {
  extract: "/api/ocr/extract",
  export: "/api/ocr/export",
};

const LOGO_SRC = "/Screenshot From 2026-07-10 12-11-57.png";

const STAGE_LABEL = {
  idle: "Idle",
  uploading: "Uploading",
  reading: "Reading",
  extracting: "Extracting",
  building: "Building",
  done: "Done",
  error: "Error",
};

const STAGE_PERCENT = {
  idle: 0,
  uploading: 20,
  reading: 45,
  extracting: 70,
  building: 90,
  done: 100,
  error: null,
};

const PROCESSING_STAGES = ["uploading", "reading", "extracting", "building"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate() {
  const d = new Date(2026, Math.floor(Math.random() * 7), 1 + Math.floor(Math.random() * 27));
  return d.toISOString().slice(0, 10);
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildExportFilename(name, suffix) {
  const base = (name || "document").replace(/\.pdf$/i, "");
  return `${base}-${suffix}.xlsx`;
}

function generateFakeRows(name) {
  return [
    { Field: "Document Type", Value: "Invoice", Confidence: "98%" },
    {
      Field: "Reference Number",
      Value: `PCT-${Math.floor(10000 + Math.random() * 89999)}`,
      Confidence: "96%",
    },
    { Field: "Date", Value: randomDate(), Confidence: "97%" },
    {
      Field: "Supplier",
      Value: sample([
        "MedSupply SARL",
        "Pharmatec Distribution",
        "BioLogix Tunisie",
        "Nord Pharma Partners",
      ]),
      Confidence: "94%",
    },
    {
      Field: "Total Amount",
      Value: `${(Math.random() * 3000 + 150).toFixed(2)} TND`,
      Confidence: "95%",
    },
    {
      Field: "Line Items",
      Value: `${Math.floor(Math.random() * 8 + 1)} items`,
      Confidence: "92%",
    },
    { Field: "Source File", Value: name || "document.pdf", Confidence: "—" },
  ];
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function App() {
  const [mode, setMode] = useState("simulation");
  const [file, setFile] = useState(null);
  const [stage, setStage] = useState("idle");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fileInputRef = useRef(null);
  const runIdRef = useRef(0);

  const isProcessing = PROCESSING_STAGES.includes(stage);
  const lastPercentRef = useRef(0);
  if (stage !== "error") lastPercentRef.current = STAGE_PERCENT[stage] ?? 0;
  const displayPercent = stage === "error" ? lastPercentRef.current : STAGE_PERCENT[stage] ?? 0;

  const acceptFiles = useCallback((fileList) => {
    const list = Array.from(fileList || []).filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    if (list.length === 0) {
      setError("Please choose a PDF file.");
      return;
    }
    runIdRef.current++;
    setFile(list[0]);
    setStage("idle");
    setError(null);
    setRows(null);
  }, []);

  const handleInputChange = (e) => {
    acceptFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (isProcessing) return;
    acceptFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const removeFile = () => {
    runIdRef.current++;
    setFile(null);
    setStage("idle");
    setError(null);
    setRows(null);
  };

  const resetAll = () => {
    runIdRef.current++;
    setFile(null);
    setStage("idle");
    setError(null);
    setRows(null);
    setIsDownloading(false);
  };

  const switchMode = (nextMode) => {
    if (nextMode === mode) return;
    runIdRef.current++;
    setMode(nextMode);
    setFile(null);
    setStage("idle");
    setError(null);
    setRows(null);
    setIsDownloading(false);
  };

  const runSimulation = (id) => {
    (async () => {
      const seq = ["uploading", "reading", "extracting", "building"];
      for (const s of seq) {
        await sleep(550 + Math.random() * 450);
        if (runIdRef.current !== id) return;
        setStage(s);
      }
      await sleep(400);
      if (runIdRef.current !== id) return;
      setRows(generateFakeRows(file?.name));
      setStage("done");
    })();
  };

  const runReal = (id) => {
    setStage("uploading");

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", API.extract);

    xhr.upload.onprogress = (e) => {
      if (runIdRef.current !== id || !e.lengthComputable) return;
      if (e.loaded < e.total) {
        setStage("uploading");
      } else {
        setStage("reading");
        setTimeout(() => {
          if (runIdRef.current === id) setStage("extracting");
        }, 350);
      }
    };

    xhr.onload = () => {
      if (runIdRef.current !== id) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        let data;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          setError("The OCR API returned an unexpected response.");
          setStage("error");
          return;
        }
        setStage("building");
        const extractedRows = Array.isArray(data) ? data : data?.rows || [];
        setTimeout(() => {
          if (runIdRef.current !== id) return;
          setRows(extractedRows);
          setStage("done");
        }, 300);
      } else {
        setError(`Extraction failed (HTTP ${xhr.status}). Check the OCR API and try again.`);
        setStage("error");
      }
    };

    xhr.onerror = () => {
      if (runIdRef.current !== id) return;
      setError("Couldn't reach the OCR API. Check your connection and try again.");
      setStage("error");
    };

    xhr.send(formData);
  };

  const startProcessing = () => {
    if (!file || isProcessing) return;
    const id = ++runIdRef.current;
    setError(null);
    setRows(null);
    if (mode === "simulation") runSimulation(id);
    else runReal(id);
  };

  const handleDownload = async () => {
    if (!rows || stage !== "done") return;
    if (mode === "simulation") {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Extracted Data");
      XLSX.writeFile(wb, buildExportFilename(file?.name, "simulated"));
      return;
    }
    setIsDownloading(true);
    setError(null);
    try {
      const res = await fetch(API.export, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file?.name, rows }),
      });
      if (!res.ok) throw new Error(`Export failed (HTTP ${res.status}).`);
      const blob = await res.blob();
      downloadBlob(blob, buildExportFilename(file?.name, "extracted"));
    } catch (err) {
      setError(err.message || "Couldn't download the Excel file.");
    } finally {
      setIsDownloading(false);
    }
  };

  const canStart = !!file && !isProcessing;
  const canDownload = stage === "done" && !!rows && !isDownloading;
  const isSim = mode === "simulation";

  const helperText = (() => {
    if (error) return null;
    if (!file) return "No files selected.";
    if (stage === "idle") return "1 file selected — ready to process.";
    if (isProcessing) return `${STAGE_LABEL[stage]}…`;
    if (stage === "done") return "Extraction complete — ready to export.";
    return null;
  })();

  return (
    <div className="ocr-page">
      <div className="ocr-card">
        {/* Header */}
        <header className="ocr-header">
          <div className="ocr-header__brand">
            {LOGO_SRC ? (
              <img src={LOGO_SRC} alt="Opalia Recordati logo" className="ocr-header__logo" />
            ) : (
              <div className="ocr-header__logo-placeholder" aria-hidden="true" />
            )}
            <span className="ocr-header__wordmark">OPALIA RECORDATI</span>
          </div>

          <button
            type="button"
            onClick={() => switchMode(isSim ? "working" : "simulation")}
            title={`Switch to ${isSim ? "Working" : "Simulation"} mode`}
            className={cx("mode-badge", isSim ? "mode-badge--sim" : "mode-badge--working")}
          >
            <span className="mode-badge__dot" />
            {isSim ? "Simulation mode" : "Working mode"}
            <ArrowLeftRight size={12} className="mode-badge__icon" />
          </button>
        </header>

        {/* Main */}
        <main className="ocr-main">
          {/* Left column */}
          <div>
            <p className="hero__eyebrow">PDF TO EXCEL OCR</p>
            <h1 className="hero__title">
              Turn scanned PDF documents into structured Excel-ready output.
            </h1>
            <p className="hero__subtitle">
              Upload PDF batches, watch every processing stage, then download a{" "}
              {isSim ? "simulated" : "real"} spreadsheet export. The React component is ready
              for a real OCR API when you connect the backend later.
            </p>

            <div className="feature-grid">
              {[
                { n: "01", title: "Add PDFs", desc: "Drop single files or upload batches." },
                { n: "02", title: "Track progress", desc: "See staged document processing live." },
                { n: "03", title: "Export Excel", desc: "Download an Excel-compatible result." },
              ].map((c) => (
                <div key={c.n} className="feature-card">
                  <p className="feature-card__number">{c.n}</p>
                  <p className="feature-card__title">{c.title}</p>
                  <p className="feature-card__desc">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right column: OCR Processor card */}
          <div className="processor-card">
            <h2 className="processor-card__title">OCR Processor</h2>
            <p className="processor-card__subtitle">
              Upload PDF files and run {isSim ? "a simulated" : "a live"} OCR-to-Excel processing
              flow.
            </p>

            {/* Info banner */}
            <div className={cx("banner", isSim ? "banner--sim" : "banner--working")}>
              <p className="banner__title">
                {isSim
                  ? "Simulation mode active — connect your OCR API later."
                  : "Working mode active — calling your live OCR API."}
              </p>
              <p className="banner__endpoint">
                {isSim ? `API endpoint (future): ${API.extract}` : `${API.extract} → ${API.export}`}
              </p>
            </div>

            {/* Dropzone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !isProcessing) fileInputRef.current?.click();
              }}
              className={cx(
                "dropzone",
                isProcessing ? "dropzone--disabled" : isDragActive ? "dropzone--active" : "dropzone--idle"
              )}
            >
              <UploadCloud size={20} className="dropzone__icon" />
              <p className="dropzone__text">Drag &amp; drop a PDF file here, or select one manually.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="dropzone__input"
                onChange={handleInputChange}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isProcessing) fileInputRef.current?.click();
                }}
                className="dropzone__button"
              >
                Choose PDF file
              </button>
            </div>

            {/* Selected files */}
            <div className="selected-files">
              <p className="selected-files__label">Selected files</p>
              <div className="selected-files__body">
                {!file ? (
                  <p className="selected-files__empty">No PDF files selected.</p>
                ) : (
                  <div className="file-item">
                    <div className="file-item__info">
                      <FileText size={14} className="file-item__icon" />
                      <span className="file-item__name">{file.name}</span>
                      <span className="file-item__size">{formatBytes(file.size)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      disabled={isProcessing}
                      className="file-item__remove"
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Progress */}
            <div className="progress">
              <div className="progress__row">
                <span className={cx("progress__stage", stage === "error" && "progress__stage--error")}>
                  Stage: {STAGE_LABEL[stage]}
                  {isProcessing && <Loader2 size={12} className="icon-spin progress__stage-icon" />}
                  {stage === "done" && <CheckCircle2 size={12} className="progress__stage-icon progress__stage-icon--done" />}
                  {stage === "error" && <AlertCircle size={12} className="progress__stage-icon" />}
                </span>
                <span className="progress__percent">{displayPercent}%</span>
              </div>
              <div className="progress__track">
                <div
                  className={cx("progress__fill", stage === "error" && "progress__fill--error")}
                  style={{ width: `${displayPercent}%` }}
                />
              </div>
            </div>

            {/* Extracted preview */}
            {rows && stage === "done" && (
              <div className="preview">
                <div className="preview__header">
                  <span>Extracted data</span>
                  <span className="preview__header-count">{rows.length} field{rows.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="preview__scroll">
                  {rows.map((r, i) => (
                    <div key={i} className="preview__row">
                      <span className="preview__field">{r.Field ?? Object.values(r)[0]}</span>
                      <span className="preview__value">{r.Value ?? Object.values(r)[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="actions">
              <button
                type="button"
                onClick={startProcessing}
                disabled={!canStart}
                className="btn btn--primary"
              >
                {isProcessing && <Loader2 size={13} className="icon-spin" />}
                Start OCR Processing
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!canDownload}
                className="btn btn--secondary"
              >
                {isDownloading ? <Loader2 size={13} className="icon-spin" /> : <Download size={13} />}
                {isSim ? "Download Simulated Excel" : "Download Excel"}
              </button>
              <button type="button" onClick={resetAll} className="btn btn--ghost">
                <RotateCcw size={13} />
                Reset
              </button>
            </div>

            <div className="helper-text">
              {error ? (
                <span className="helper-text--error">
                  <AlertCircle size={12} /> {error}
                </span>
              ) : (
                <span className="helper-text--muted">{helperText}</span>
              )}
            </div>

            <p className="mode-hint">
              {isSim
                ? "Switch to Working mode in the header once your OCR API is ready — no other changes needed."
                : "Switch back to Simulation mode any time to demo the flow without the live API."}
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="ocr-footer">
          <span>Prepared for Opalia Recordati OCR workflows</span>
          <span>PDF input → OCR stages → Excel export</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
