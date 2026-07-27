# Audio & Video Transcriber

Drop an audio or video file in your browser and get back timestamped text —
no upload, no backend, no account. Everything runs client-side using
ffmpeg.wasm (audio extraction) and Whisper via transformers.js (speech-to-text),
with WebGPU acceleration and automatic CPU fallback.

## Features

- Drag-and-drop batch queue — process multiple files in sequence
- Timestamped transcript, viewable in-app, copyable, and downloadable as `.txt`
- Local history (IndexedDB) of past transcripts
- Choice of Whisper model size (fast / balanced / accurate) in Settings
- Handles large files (multi-GB) via ffmpeg's WORKERFS mount

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (default `http://localhost:5173`).

## Build

```bash
npm run build
```

Outputs a static site to `dist/` — deployable anywhere that serves static files
(e.g. Vercel).
