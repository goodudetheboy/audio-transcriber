import { useState, useCallback } from 'react';
import type { TranscriptRecord } from '../types';
import { segmentsToText } from '../lib/formatters';
import { addSpeaker, assignSpeaker, mergeWithNext, removeSpeaker, renameSpeaker, splitSegmentAt } from '../lib/transcript';
import SegmentRow from './SegmentRow';
import SpeakerRoster from './SpeakerRoster';

interface Props {
  transcript?: TranscriptRecord;
  onUpdateTranscript: (updated: TranscriptRecord) => void;
}

export default function TranscriptViewer({ transcript, onUpdateTranscript }: Props) {
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!transcript) return;
    await navigator.clipboard.writeText(segmentsToText(transcript.segments, transcript.speakers ?? []));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [transcript]);

  const handleSave = useCallback(() => {
    if (!transcript) return;
    const text = segmentsToText(transcript.segments, transcript.speakers ?? []);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = transcript.filename.replace(/\.[^.]+$/, '') + '_transcript.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [transcript]);

  const handleSplit = (index: number, cursorPos: number) => {
    if (!transcript) return;
    onUpdateTranscript({ ...transcript, segments: splitSegmentAt(transcript.segments, index, cursorPos) });
  };

  const handleMergeNext = (index: number) => {
    if (!transcript) return;
    onUpdateTranscript({ ...transcript, segments: mergeWithNext(transcript.segments, index) });
  };

  const handleAssignSpeaker = (index: number, speakerId: string | undefined) => {
    if (!transcript) return;
    onUpdateTranscript({ ...transcript, segments: assignSpeaker(transcript.segments, index, speakerId) });
  };

  const handleAddSpeaker = () => {
    if (!transcript) return;
    onUpdateTranscript(addSpeaker(transcript));
  };

  const handleRenameSpeaker = (id: string, name: string) => {
    if (!transcript) return;
    onUpdateTranscript(renameSpeaker(transcript, id, name));
  };

  const handleRemoveSpeaker = (id: string) => {
    if (!transcript) return;
    onUpdateTranscript(removeSpeaker(transcript, id));
  };

  return (
    <div className="transcript-panel">
      <div className="transcript-header">
        <span className="transcript-title">
          {transcript ? transcript.filename : 'Transcript'}
        </span>
        {transcript && (
          <div className="transcript-actions">
            <button
              className={editMode ? 'btn-secondary btn-active' : 'btn-secondary'}
              onClick={() => setEditMode(v => !v)}
            >
              {editMode ? 'Done editing' : 'Edit'}
            </button>
            <button className="btn-ghost" onClick={handleCopy}>
              {copied ? '✓ Copied' : 'Copy all'}
            </button>
            <button className="btn-secondary" onClick={handleSave}>
              Save .txt
            </button>
          </div>
        )}
      </div>

      {transcript && editMode && (
        <SpeakerRoster
          speakers={transcript.speakers ?? []}
          onAdd={handleAddSpeaker}
          onRename={handleRenameSpeaker}
          onRemove={handleRemoveSpeaker}
        />
      )}

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
            <SegmentRow
              key={seg.id}
              segment={seg}
              speakers={transcript.speakers ?? []}
              editMode={editMode}
              canMergeNext={i < transcript.segments.length - 1}
              onSplit={cursorPos => handleSplit(i, cursorPos)}
              onMergeNext={() => handleMergeNext(i)}
              onAssignSpeaker={speakerId => handleAssignSpeaker(i, speakerId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
