# OCR App — PDF to Excel

Extract text from PDF documents and export structured data to Excel. No manual data entry needed.

## Features

- **Drag-and-drop PDF upload** — single file upload with visual feedback
- **Simulation mode** — demo the full extraction flow without a live OCR API
- **Working mode** — connect to a real OCR backend when ready
- **Live progress tracking** — see each processing stage (uploading, reading, extracting, building)
- **Data preview** — review extracted fields before downloading
- **Excel export** — download results as `.xlsx` (simulated locally or from API)
- **Responsive layout** — works on desktop and tablet

## Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Frontend | React 19, Vite 8, Lucide React, SheetJS (xlsx)  |
| Backend  | FastAPI (Python 3), uvicorn                     |
| API proxy| Vite dev server proxies `/api/*` → backend      |

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **Git**

## Project Structure

```
ocrapp/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py              # FastAPI entry point
│   ├── requirements.txt         # Python dependencies
│   ├── uploads/                 # Uploaded PDFs (created at runtime)
│   └── venv/                    # Python virtual environment
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   └── Screenshot From 2026-07-10 12-11-57.png   # App logo
│   ├── src/
│   │   ├── assets/              # (empty — ready for images/icons)
│   │   ├── App.jsx              # Main OCR component
│   │   ├── index.css            # Global styles & CSS variables
│   │   ├── main.jsx             # React entry point
│   │   └── pdf-to-excel-ocr.css # Component styles
│   ├── index.html               # HTML shell
│   ├── package.json             # npm scripts & dependencies
│   ├── vite.config.js           # Vite config with API proxy
│   └── node_modules/            # Installed npm packages
├── README.md                    # This file
└── SETUP.md                     # Legacy setup reference
```

---

## Backend Setup

### 1. Create virtual environment

```bash
cd backend
python3 -m venv venv
```

### 2. Activate and install dependencies

```bash
./venv/bin/pip install -r requirements.txt
```

`requirements.txt` includes:
- `fastapi` — web framework
- `uvicorn[standard]` — ASGI server
- `python-multipart` — file upload support

### 3. Run the backend

```bash
./venv/bin/uvicorn app.main:app --reload
```

The API starts at **http://localhost:8000**.
Auto-generated docs at **http://localhost:8000/docs**.

---

## Frontend Setup

### 1. Install Node dependencies

```bash
cd frontend
npm install
```

Installed packages:
- `react`, `react-dom` — UI framework
- `lucide-react` — icon library
- `xlsx` (SheetJS) — client-side Excel generation
- `vite`, `@vitejs/plugin-react` — build tool
- `oxlint` — linter

### 2. Run the dev server

```bash
npm run dev
```

Opens at **http://localhost:5173**.
Vite proxies any `/api/*` request to `http://localhost:8000` (the backend).

---

## Run Everything Together

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
./venv/bin/uvicorn app.main:app --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Visit **http://localhost:5173** in your browser.

---

## Usage

### Simulation mode (default)
- Processes are faked client-side — no API calls made
- Extracted data is randomly generated sample invoice fields
- Download produces a locally-built `.xlsx` with the simulated data
- Use this to demo the UI flow without the backend running

### Working mode
- Switch via the **mode badge** button in the top-right of the header
- Sends the PDF to `POST /api/ocr/extract` for OCR extraction
- Download calls `POST /api/ocr/export` to get a server-built `.xlsx`
- Designed to drop in a real OCR backend later

### Flow
1. **Upload** — drag & drop a PDF or click "Choose PDF file"
2. **Process** — click "Start OCR Processing" and watch progress stages
3. **Review** — scroll through extracted fields in the preview panel
4. **Download** — click "Download Excel" to save the `.xlsx` file
5. **Reset** — clear everything and start over

---

## API Endpoints

| Method | Path               | Description                        |
|--------|--------------------|------------------------------------|
| GET    | `/api/health`      | Health check → `{"status": "ok"}`  |
| POST   | `/api/ocr/extract` | Upload PDF → receive extracted rows|
| POST   | `/api/ocr/export`  | Send rows → receive `.xlsx` blob   |

The `extract` and `export` endpoints are stubs — implement them in `backend/app/main.py` when the OCR logic is ready.

---

## Build for Production

```bash
cd frontend
npm run build
```

Output goes to `frontend/dist/` — a static `index.html`, bundled JS, and CSS ready to deploy.

---

## Useful Commands

| Command                        | Location     | Purpose                          |
|--------------------------------|--------------|----------------------------------|
| `npm run dev`                  | `frontend/`  | Start Vite dev server            |
| `npm run build`                | `frontend/`  | Build for production             |
| `npm run lint`                 | `frontend/`  | Lint frontend code               |
| `./venv/bin/uvicorn ...`       | `backend/`   | Start FastAPI dev server         |
| `./venv/bin/pip install ...`   | `backend/`   | Install a Python package         |
