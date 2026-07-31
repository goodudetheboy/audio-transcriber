import { useRef } from 'react';
import type { Speaker, TranscriptSegment } from '../types';
import { formatTimestamp } from '../lib/formatters';
import { speakerColor } from '../lib/transcript';

interface Props {
  segment: TranscriptSegment;
  speakers: Speaker[];
  editMode: boolean;
  canMergeNext: boolean;
  onSplit: (cursorPos: number) => void;
  onMergeNext: () => void;
  onAssignSpeaker: (speakerId: string | undefined) => void;
}

export default function SegmentRow({
  segment,
  speakers,
  editMode,
  canMergeNext,
  onSplit,
  onMergeNext,
  onAssignSpeaker,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speaker = speakers.find(s => s.id === segment.speakerId);

  const handleSplit = () => {
    const pos = textareaRef.current?.selectionStart ?? 0;
    onSplit(pos);
  };

  return (
    <div className="transcript-segment">
      <span className="segment-time">{formatTimestamp(segment.start)}</span>

      <div className="segment-body">
        {speaker && !editMode && (
          <span className="speaker-badge" style={{ '--speaker-color': speakerColor(speaker.id) } as React.CSSProperties}>
            {speaker.name}
          </span>
        )}

        {editMode ? (
          <textarea
            ref={textareaRef}
            className="segment-textarea"
            readOnly
            rows={Math.max(1, Math.ceil(segment.text.length / 60))}
            value={segment.text}
          />
        ) : (
          <span className="segment-text">{segment.text}</span>
        )}

        {editMode && (
          <div className="segment-controls">
            <select
              className="speaker-select"
              value={segment.speakerId ?? ''}
              onChange={e => onAssignSpeaker(e.target.value || undefined)}
            >
              <option value="">Unassigned</option>
              {speakers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button className="btn-ghost" onClick={handleSplit} title="Split at cursor">
              ✂️ Split
            </button>
            {canMergeNext && (
              <button className="btn-ghost" onClick={onMergeNext} title="Merge with next segment">
                ⬇ Merge
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
