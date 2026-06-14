# Audio & Video Transcriber — Design

**Date:** 2026-06-14
**Status:** Approved (proceeding to build)

## Purpose

A friendly web app that transcribes video/audio files to **timestamped English text**, runs
**entirely in the browser** (no uploads, works offline after first load), and deploys as a
static site on **Vercel**. Built as a gift for a non-technical user — the priority is a polished,
easy "drop a file → get text" experience.

## Goals & Constraints

- **English only.** Lets us ship small, fast Whisper models.
- **Timestamped text output**, e.g. `[00:01:23] spoken words…`.
- **In-browser processing.** Files never leave the machine. Private by construction.
- **GPU-accelerated via WebGPU** with automatic CPU (WASM) fallback. Works on a gaming PC's
  NVIDIA GPU *and* a laptop's integrated GPU; falls back to CPU otherwise.
- **Batch queue** — drop several files, process sequentially.
- **Show transcript in-app** with a **Save (download .txt)** option and a **Copy transcript**
  button (one click copies the full timestamped text to the clipboard).
- **Offline-capable PWA** — app shell + models cache so it runs with no internet after first visit.
- **Deploys on Vercel** as a static build.
- **No backend, no server costs, no accounts.**

## Non-Goals (YAGNI)

- No other languages or translation.
- No subtitle/SRT export in v1 (timestamped text only). Easy to add later.
- No cloud sync / accounts. History is local to the browser.
- No live/microphone transcription. Files only.
- No speaker diarization.

## Architecture

Static single-page app. Three browser technologies do the heavy lifting, all client-side:

1. **ffmpeg.wasm** — extracts and normalizes audio from any container (mp4/mov/mkv/webm,
   mp3/wav/m4a/aac…) into 16kHz mono, which Whisper requires.
2. **transformers.js (`@huggingface/transformers`)** — runs Whisper for speech-to-text with
   word/segment timestamps, on **WebGPU** when available, else WASM (CPU).
3. **IndexedDB** — stores transcript history locally (filename, date, model, segments).

### Pipeline (per file)

```
File → ffmpeg.wasm (→ 16kHz mono WAV) → decode to Float32Array
     → Whisper worker (return_timestamps, chunked long-form) → timestamped segments
     → render in app + store in IndexedDB + optional .txt download
```

### Components

- **`index.html` / app shell** — Vite + React + TypeScript.
- **UI (main thread, React):** drop zone, file queue with per-file status/progress, transcript
  viewer, history panel, settings (model quality, WebGPU/CPU badge).
- **Audio extraction module:** wraps ffmpeg.wasm; converts input to 16kHz mono and returns a
  `Float32Array`.
- **Transcription Web Worker:** loads the Whisper pipeline once, processes audio, posts back
  progress and timestamped chunks. Kept off the main thread so the UI stays responsive.
- **Storage module:** thin IndexedDB wrapper for transcript history.
- **PWA:** manifest + service worker caching the app shell. (Models/ffmpeg cache via the
  browsers' Cache API automatically through transformers.js / ffmpeg.)

### Model choice

English-only Whisper, with a **quality selector** in settings:

- **Fast** — `whisper-tiny.en`
- **Balanced (default)** — `whisper-base.en`
- **Accurate** — `whisper-small.en`

Models download once from the Hugging Face CDN and are cached for offline use.

### Compute mode

Detect `navigator.gpu`. Use `device: 'webgpu'` if present, else `'wasm'`. Show a small badge
("⚡ GPU" vs "CPU") so the user knows which path is active.

## Output Format

In-app: a scrollable list of segments, each with a clickable/readable timestamp and text.
Saved file: plain `.txt` —

```
[00:00:00] Hi, this is a quick note about the project.
[00:00:06] We shipped the first version today.
```

(Web apps can't write "next to the original" file — Save = a browser download of the `.txt`.)

## Persistence

- **History:** IndexedDB record per completed transcript (id, filename, createdAt, model, mode,
  segments). History panel lets her reopen, copy, re-download, or delete past transcripts.
- Model/ffmpeg binaries cache via the browser Cache API (handled by the libraries).

## Error Handling

- **Unsupported/corrupt file** → per-file error state in the queue with a readable message;
  other files in the batch continue.
- **WebGPU unavailable** → silent fallback to CPU, badge reflects it.
- **Model download fails (offline first run)** → clear message that the first run needs internet
  to fetch the model, after which it works offline.
- **Out-of-memory on huge files** → long files are chunked (30s windows w/ overlap) to bound
  memory; surface a friendly error if it still fails and suggest the Fast model.

## Visual Design

**Soft & Warm** direction: cozy rounded cards, peachy/cream palette, gentle shadows, a warm
accent (coral `#ff8a65`). Friendly and personal. Large, obvious drop zone; clear primary
"Transcribe" action; calm progress states.

## Deployment (Vercel)

- Static build: `vite build` → `dist/`.
- **`vercel.json`** sets cross-origin isolation headers required for WASM threads /
  `SharedArrayBuffer`:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: credentialless` (keeps `SharedArrayBuffer` while still
    allowing the Hugging Face model CDN to load).
- No env vars, no server functions. Push to Git → Vercel auto-deploys, or `vercel` CLI.

## Browser Support

Best on **Chrome/Edge** (WebGPU + threads). Firefox/Safari work via CPU/WASM fallback (slower).

## Testing

- Unit-test the timestamp formatter and storage module.
- Manual smoke matrix: short mp3, an mp4 with video track, a long (>30 min) audio file; verify
  WebGPU path and forced-CPU path; verify offline reload after first model fetch.
```
