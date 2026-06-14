import { useState, useCallback } from 'react';
import type { TranscriptRecord } from '../types';
import { formatTimestamp, segmentsToText } from '../lib/formatters';

interface Props {
  transcript?: TranscriptRecord;
}

export default function TranscriptViewer({ transcript }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!transcript) return;
    await navigator.clipboard.writeText(segmentsToText(transcript.segments));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [transcript]);

  const handleSave = useCallback(() => {
    if (!transcript) return;
    const text = segmentsToText(transcript.segments);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = transcript.filename.replace(/\.[^.]+$/, '') + '_transcript.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [transcript]);

  return (
    <div className="transcript-panel">
      <div className="transcript-header">
        <span className="transcript-title">
          {transcript ? transcript.filename : 'Transcript'}
        </span>
        {transcript && (
          <div className="transcript-actions">
            <button className="btn-ghost" onClick={handleCopy}>
              {copied ? '✓ Copied' : 'Copy all'}
            </button>
            <button className="btn-secondary" onClick={handleSave}>
              Save .txt
            </button>
          </div>
        )}
      </div>

      <div className="transcript-body">
        {!transcript ? (
          <div className="transcript-empty">
            <span className="empty-icon">📄</span>
            <span>Select a completed file to view its transcript</span>
          </div>
        ) : transcript.segments.length === 0 ? (
          <div className="transcript-empty">
            <span className="empty-icon">🤔</span>
            <span>No speech detected in this file</span>
          </div>
        ) : (
          transcript.segments.map((seg, i) => (
            <div key={i} className="transcript-segment">
              <span className="segment-time">{formatTimestamp(seg.start)}</span>
              <span className="segment-text">{seg.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
