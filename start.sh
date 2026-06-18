#!/bin/bash
# German Vocab Studio — Quick Start
# Run this from inside the VOCAB folder: bash start.sh

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "🔧 First-time setup: creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
    echo "✅ Setup complete!"
else
    source venv/bin/activate
fi

echo "🚀 Starting German Vocab Studio..."
streamlit run app.py
