import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Pin, Minus, Maximize2, Palette } from 'lucide-react';

const NOTE_COLORS = {
  yellow: { bg: '#fef3c7', header: '#f59e0b', text: '#78350f', border: '#fcd34d' },
  pink:   { bg: '#fce7f3', header: '#ec4899', text: '#831843', border: '#f9a8d4' },
  blue:   { bg: '#dbeafe', header: '#3b82f6', text: '#1e3a5f', border: '#93c5fd' },
  green:  { bg: '#dcfce7', header: '#22c55e', text: '#14532d', border: '#86efac' },
  purple: { bg: '#ede9fe', header: '#8b5cf6', text: '#2e1065', border: '#c4b5fd' },
};

const genId = () => Math.random().toString(36).slice(2, 11);

export const useStickyNotes = () => {
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('plexus-sticky-notes') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem('plexus-sticky-notes', JSON.stringify(notes)); }
    catch {}
  }, [notes]);

  const addNote = useCallback((partial = {}) => {
    setNotes(prev => [...prev, {
      id: genId(),
      x: 120 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: 220,
      height: 160,
      content: '',
      color: 'yellow',
      attachedFile: null,
      attachedLine: null,
      minimized: false,
      createdAt: Date.now(),
      ...partial,
    }]);
  }, []);

  const updateNote = useCallback((id, patch) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));
  }, []);

  const deleteNote = useCallback((id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  return { notes, addNote, updateNote, deleteNote };
};

const StickyNote = ({ note, onUpdate, onDelete }) => {
  const posRef = useRef({ x: note.x, y: note.y });
  const sizeRef = useRef({ w: note.width, h: note.height });
  const noteElemRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colors = NOTE_COLORS[note.color] || NOTE_COLORS.yellow;

  // Drag
  const onDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX - posRef.current.x;
    const startY = e.clientY - posRef.current.y;

    const move = (e) => {
      const nx = Math.max(0, Math.min(window.innerWidth - 50, e.clientX - startX));
      const ny = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - startY));
      posRef.current = { x: nx, y: ny };
      if (noteElemRef.current) {
        noteElemRef.current.style.left = `${nx}px`;
        noteElemRef.current.style.top = `${ny}px`;
      }
    };
    const up = () => {
      onUpdate(note.id, { x: posRef.current.x, y: posRef.current.y });
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }, [note.id, onUpdate]);

  // Resize
  const onResizeStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const sw = sizeRef.current.w;
    const sh = sizeRef.current.h;

    const move = (e) => {
      const nw = Math.max(160, sw + (e.clientX - startX));
      const nh = Math.max(100, sh + (e.clientY - startY));
      sizeRef.current = { w: nw, h: nh };
      if (noteElemRef.current) {
        noteElemRef.current.style.width = `${nw}px`;
        noteElemRef.current.style.height = `${nh}px`;
      }
    };
    const up = () => {
      onUpdate(note.id, { width: sizeRef.current.w, height: sizeRef.current.h });
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }, [note.id, onUpdate]);

  return (
    <div
      ref={noteElemRef}
      className="sticky-note"
      style={{
        left: note.x, top: note.y,
        width: note.minimized ? 220 : note.width,
        height: note.minimized ? 32 : note.height,
        background: colors.bg,
        borderColor: colors.border,
      }}
    >
      {/* Header */}
      <div className="sticky-note-header" style={{ background: colors.header, color: '#fff' }} onMouseDown={onDragStart}>
        <Pin size={11} style={{ flexShrink: 0, opacity: 0.8 }} />
        {note.attachedFile && (
          <span style={{ fontSize: 10, opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
            {note.attachedFile.split('/').pop()}:{note.attachedLine}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 2 }}>
          <button className="sticky-action" onMouseDown={e => e.stopPropagation()} onClick={() => setShowColorPicker(v => !v)} title="Color"><Palette size={10} /></button>
          <button className="sticky-action" onMouseDown={e => e.stopPropagation()} onClick={() => onUpdate(note.id, { minimized: !note.minimized })} title={note.minimized ? 'Expand' : 'Minimize'}>
            {note.minimized ? <Maximize2 size={10} /> : <Minus size={10} />}
          </button>
          <button className="sticky-action" onMouseDown={e => e.stopPropagation()} onClick={() => onDelete(note.id)} title="Delete"><X size={10} /></button>
        </div>
      </div>

      {/* Color Picker */}
      {showColorPicker && !note.minimized && (
        <div className="sticky-color-picker" onMouseDown={e => e.stopPropagation()}>
          {Object.entries(NOTE_COLORS).map(([name, c]) => (
            <button key={name} onClick={() => { onUpdate(note.id, { color: name }); setShowColorPicker(false); }}
              style={{ background: c.header, border: note.color === name ? '2px solid #fff' : '2px solid transparent' }}
              className="sticky-color-dot" title={name} />
          ))}
        </div>
      )}

      {/* Body */}
      {!note.minimized && (
        <textarea
          className="sticky-note-body"
          style={{ color: colors.text, background: 'transparent' }}
          value={note.content}
          onChange={e => onUpdate(note.id, { content: e.target.value })}
          placeholder="Write a note…"
          onMouseDown={e => e.stopPropagation()}
          spellCheck={false}
        />
      )}

      {/* Resize handle */}
      {!note.minimized && (
        <div className="sticky-resize-handle" onMouseDown={onResizeStart}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill={colors.border}>
            <path d="M9 3L3 9M9 6L6 9M9 9H6" stroke={colors.border} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
};

export const StickyNotesLayer = ({ notes, onUpdate, onDelete, focusMode }) => {
  if (focusMode) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 500 }}>
      {notes.map(note => (
        <StickyNote key={note.id} note={note} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </div>
  );
};

export default StickyNotesLayer;
