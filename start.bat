@echo off
:: German Vocab Studio — Quick Start for Windows
:: Double-click this file to run the app

cd /d "%~dp0"

if not exist "venv\" (
    echo First-time setup: creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate
    echo Installing dependencies...
    pip install -r requirements.txt
    echo Setup complete!
) else (
    call venv\Scripts\activate
)

echo Starting German Vocab Studio...
streamlit run app.py
pause
