# 🇩🇪 German Vocab Studio — Setup & Run Guide

A Streamlit app to study German vocabulary from your Excel files,
with inline audio playback, dark/light mode, and multi-level support (A1 → B2).

---

## 📁 Required Folder Structure

Your `VOCAB` folder must look like this — the app auto-discovers everything inside:

```
VOCAB/
├── app.py                  ← the app (this file lives here)
├── requirements.txt
├── README.md
│
├── A1/
│   ├── A1 - All Verbs/
│   │   ├── A1 - All Verbs.xlsx
│   │   └── audios/         ← audio files named like  1_guten Tag.mp3
│   ├── A1 - Chapter 1,2,3,4/
│   │   ├── A1 - Chapter 1,2,3,4.xlsx
│   │   └── audios/
│   └── ... (more chapters)
│
├── A2/   (same structure)
├── B1/   (same structure)
└── B2/
    ├── Aspekte/
    │   ├── B2.1/
    │   │   ├── Part 1/
    │   │   │   ├── Part 1.xlsx
    │   │   │   └── audios/
    │   │   └── ...
    │   └── B2.2/ ...
    └── Kontext/ ...
```

### Excel Column Format (columns A–F)

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Vocab Word / Verb | Example Sentence (German) | English Meaning | Example Sentence (English) | Hindi Meaning | Example Sentence (Hindi) |

### Audio File Naming

Audio files should be named with a numeric prefix matching the row number:
```
1_guten Tag.mp3
2_Deutsch.mp3
3_Englisch.mp3
```

---

## ⚙️ First-Time Setup

### Step 1 — Make sure Python is installed

```bash
python3 --version
# Should be 3.9 or higher
```

If not installed → download from https://www.python.org/downloads/

---

### Step 2 — Navigate to the VOCAB folder

```bash
cd /path/to/your/VOCAB
# Example on Linux/Mac:  cd ~/Downloads/Audio-Learning/VOCAB
# Example on Windows:    cd C:\Users\YourName\Downloads\Audio-Learning\VOCAB
```

---

### Step 3 — Create a virtual environment (do this ONCE)

**Linux / macOS:**
```bash
python3 -m venv venv
```

**Windows:**
```cmd
python -m venv venv
```

This creates a `venv/` folder inside your VOCAB directory.

---

### Step 4 — Activate the virtual environment

**Linux / macOS:**
```bash
source venv/bin/activate
```

**Windows (Command Prompt):**
```cmd
venv\Scripts\activate
```

**Windows (PowerShell):**
```powershell
venv\Scripts\Activate.ps1
```

You'll see `(venv)` appear at the start of your terminal prompt.

---

### Step 5 — Install dependencies (do this ONCE after activating)

```bash
pip install -r requirements.txt
```

This installs:
- `streamlit` — the web UI framework
- `pandas` — reads Excel files
- `openpyxl` — Excel engine for pandas

---

## ▶️ Running the App

Every time you want to use the app:

### Step 1 — Activate the virtual environment (if not already active)

```bash
# Linux / macOS
source venv/bin/activate

# Windows CMD
venv\Scripts\activate
```

### Step 2 — Run

```bash
streamlit run app.py
```

The app will open automatically in your browser at:
```
http://localhost:8501
```

To stop the app: press `Ctrl + C` in the terminal.

---

## 🚀 Quick One-Line Run (after first-time setup)

**Linux / macOS** — save this as `start.sh` in the VOCAB folder:
```bash
#!/bin/bash
source venv/bin/activate
streamlit run app.py
```
Then run it with:
```bash
bash start.sh
```

**Windows** — save this as `start.bat` in the VOCAB folder:
```batch
@echo off
call venv\Scripts\activate
streamlit run app.py
pause
```
Then just double-click `start.bat`.

---

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| `command not found: streamlit` | Make sure venv is activated (`source venv/bin/activate`) |
| `ModuleNotFoundError: openpyxl` | Run `pip install -r requirements.txt` again |
| App shows blank / no levels | Make sure `app.py` is inside the `VOCAB/` folder, not inside A1/A2 etc. |
| B2 chapters not showing | They'll appear — the app searches B2 recursively (nested folders are fine) |
| Audio not playing | Check that audio files are in a subfolder of the chapter and named `N_word.mp3` |
| Port 8501 already in use | Run `streamlit run app.py --server.port 8502` |

---

## 📦 Dependencies Summary

```
streamlit  >= 1.30   (tested on 1.56.0)
pandas     >= 2.0    (tested on 3.0.2)
openpyxl   >= 3.1    (tested on 3.1.5)
Python     >= 3.9    (tested on 3.12.3)
```

---

*Made with ❤️ for German learning.*
