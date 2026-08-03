import type { Speaker, TranscriptSegment } from '../types';

export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function parseTimestamp(input: string): number | null {
  const parts = input.trim().split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some(p => !/^\d+$/.test(p))) return null;

  const nums = parts.map(Number);
  const [h, m, s] = nums.length === 3 ? nums : [0, ...nums];
  if (m >= 60 || s >= 60) return null;

  return h * 3600 + m * 60 + s;
}

export function segmentsToText(segments: TranscriptSegment[], speakers: Speaker[] = []): string {
  return segments
    .map(s => {
      const speaker = speakers.find(sp => sp.id === s.speakerId);
      const speakerTag = speaker ? ` (${speaker.name})` : '';
      return `[${formatTimestamp(s.start)}]${speakerTag} ${s.text}`;
    })
    .join('\n');
}

export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ts));
}
