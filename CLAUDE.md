# CLAUDE.md

Guidance for Claude Code when working in this repo.

## What this is

A static React + TypeScript web app that transcribes audio/video files to timestamped
text, entirely in the browser (no backend, no uploads). See
[docs/superpowers/specs/2026-06-14-audio-transcriber-design.md](docs/superpowers/specs/2026-06-14-audio-transcriber-design.md)
for the original design doc.

## Stack

- Vite + React + TypeScript
- **ffmpeg.wasm** — extracts/normalizes input audio to 16kHz mono
- **@huggingface/transformers** — runs Whisper (English-only) for speech-to-text,
  WebGPU with WASM (CPU) fallback
- IndexedDB (`src/lib/storage.ts`) — local transcript history, no server

## Key files

- `src/App.tsx` — top-level state, file queue, worker message handling
- `src/workers/transcription.worker.ts` — the actual pipeline: ffmpeg extraction →
  chunked Whisper transcription, runs off the main thread
- `src/components/` — DropZone, FileQueue, TranscriptViewer, HistoryPanel, SettingsModal
- `src/lib/storage.ts` — IndexedDB wrapper
- `src/types.ts` — shared types, including the worker message protocol

## Commands

```bash
npm install       # also copies ffmpeg core files into public/ffmpeg via postinstall
npm run dev        # vite dev server
npm run build       # tsc + vite build
```

## Things to know

- Large input files are mounted into ffmpeg's virtual FS via `WORKERFS`
  (`ffmpeg.mount(FFFSType.WORKERFS, { files: [file] }, mountDir)`), not
  `writeFile`/`fetchFile` — the latter copies the whole file into the wasm heap up
  front and fails (`File could not be read! Code=-1`) on files past ~2GB.
- Transcription runs in 1-minute audio chunks (`CHUNK_SAMPLES` in the worker) so
  progress can be reported incrementally and memory stays bounded on long files.
- No test suite currently exists.
