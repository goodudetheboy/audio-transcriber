import { pipeline, env } from '@huggingface/transformers';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import type { ModelId, ComputeDevice, TranscriptSegment, WorkerInMessage, WorkerOutMessage } from '../types';

env.allowLocalModels = false;
env.useBrowserCache = true;

const ffmpeg = new FFmpeg();
let currentModel: ModelId | null = null;
let currentDevice: ComputeDevice | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriber: ((audio: Float32Array, opts: Record<string, unknown>) => Promise<any>) | null = null;

function post(msg: WorkerOutMessage) {
  self.postMessage(msg);
}

async function ensureFFmpeg() {
  if (ffmpeg.loaded) return;
  const base = new URL('/ffmpeg/', self.location.origin).href;
  await ffmpeg.load({
    coreURL: `${base}ffmpeg-core.js`,
    wasmURL: `${base}ffmpeg-core.wasm`,
  });
}

async function extractAudio(file: File): Promise<Float32Array> {
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '.bin';
  const inputName = `input${ext}`;
  const outputName = 'output.pcm';

  await ffmpeg.writeFile(inputName, await fetchFile(file));
  await ffmpeg.exec(['-i', inputName, '-ar', '16000', '-ac', '1', '-f', 'f32le', outputName]);
  await ffmpeg.deleteFile(inputName);

  const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
  await ffmpeg.deleteFile(outputName);

  return new Float32Array(data.buffer);
}

async function ensurePipeline(id: string, model: ModelId, device: ComputeDevice) {
  if (transcriber && currentModel === model && currentDevice === device) return;

  transcriber = null;
  currentModel = null;
  currentDevice = null;

  let effectiveDevice = device;

  const load = async (dev: ComputeDevice) =>
    pipeline('automatic-speech-recognition', model, {
      device: dev,
      dtype:
        dev === 'webgpu'
          ? { encoder_model: 'fp32', decoder_model_merged: 'q4' }
          : { encoder_model: 'q8', decoder_model_merged: 'q8' },
      progress_callback: (info: Record<string, unknown>) => {
        if (info.status === 'progress' && typeof info.progress === 'number') {
          post({ type: 'MODEL_LOADING', id, progress: info.progress, file: String(info.file ?? '') });
        }
      },
    });

  try {
    if (device === 'webgpu' && !('gpu' in navigator)) throw new Error('No WebGPU');
    transcriber = await load('webgpu');
    effectiveDevice = 'webgpu';
  } catch {
    transcriber = await load('wasm');
    effectiveDevice = 'wasm';
  }

  post({ type: 'DEVICE_DETECTED', device: effectiveDevice });
  currentModel = model;
  currentDevice = effectiveDevice;
}

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  if (e.data.type !== 'TRANSCRIBE') return;
  const { id, file, model, device } = e.data;

  try {
    await ensurePipeline(id, model, device);

    post({ type: 'EXTRACTING', id });
    await ensureFFmpeg();
    const audio = await extractAudio(file);

    post({ type: 'TRANSCRIBING', id });
    const result = await transcriber!(audio, {
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
      language: 'english',
      task: 'transcribe',
    });

    const segments: TranscriptSegment[] = (result.chunks ?? []).map((c: { timestamp: [number, number | null]; text: string }) => ({
      start: c.timestamp[0],
      end: c.timestamp[1],
      text: c.text.trim(),
    }));

    post({ type: 'DONE', id, segments });
  } catch (err) {
    post({ type: 'ERROR', id, error: (err as Error).message ?? String(err) });
  }
};
