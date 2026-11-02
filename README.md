# German Vocab Studio

A React vocabulary studio for the Excel workbooks and audio files in this folder. Browse A1–B2 lists, search words and examples, listen to row and sentence audio, save vocabulary, build custom text, and quiz yourself.

## Run

Install [Node.js 18 or newer](https://nodejs.org/) and npm. On Linux or macOS run `bash start.sh`; on Windows run `start.bat`. The first run installs the JavaScript dependencies and starts the app at [http://localhost:5173](http://localhost:5173).

To start manually, run `npm install` once and then `npm run dev`. To create and run a production build, use `npm run build` followed by `npm start`.

## Vocabulary data

The app discovers `.xlsx` workbooks recursively under `A1/`, `A2/`, `B1/`, and `B2/`. It reads the first worksheet and detects German, English, Hindi, and example-sentence columns by their headers. Keep the existing level, workbook, and audio folders in place.

Numbered audio files are matched to workbook row numbers, for example `single/1_guten Tag.mp3` or `both/1_guten Tag.mp3`. The row audio selector can play the word clip, the combined clip, or both in sequence. Audio files under a `Sentences/` folder are shown as separate full-track players.

Saved words are written to the local `saved_words.json` file and are excluded from Git. The text builder exports selected workbook fields as a `.txt` file.

## Project commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the React app and local workbook API |
| `npm run build` | Type-check and create the production bundle in `dist/` |
| `npm start` | Serve the production build |

The app is implemented with React, Vite, TypeScript, and a small Express API. No Python runtime is required.
