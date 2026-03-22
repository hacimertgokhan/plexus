import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { writeTextFile, readTextFile, readDir, create, remove } from "@tauri-apps/plugin-fs";
import { open, save } from "@tauri-apps/plugin-dialog";
import { normalize, join } from '@tauri-apps/api/path';
import { invoke } from "@tauri-apps/api/core";
import { openUrl as openExternal } from '@tauri-apps/plugin-opener';
import { toast, Toaster } from "sonner";
import ReactMarkdown from 'react-markdown';
import {
  X, Plus, FolderOpen, ChevronRight, ChevronDown, Settings,
  Search, Terminal, Copy, WrapText, Folder, FileText,
  Files, Code2, GitBranch, GitCommit, Pin,
  Play, RefreshCw, Music, Upload, Download,
  Minus, Maximize2, SkipForward, SkipBack, Pause,
  Package, Sparkles, Archive, CheckSquare,
} from 'lucide-react';
import { StickyNotesLayer, useStickyNotes } from '@/components/plexus/StickyNotes.jsx';
import AIPanel from '@/components/plexus/AIPanel.jsx';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ─── LANGUAGE MAP ───────────────────────────────────────────
const LANGUAGE_MAP = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript', mts: 'typescript',
  py: 'python', pyw: 'python', pyi: 'python',
  java: 'java', kt: 'kotlin', kts: 'kotlin', scala: 'scala',
  cpp: 'cpp', cc: 'cpp', cxx: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
  cs: 'csharp', fs: 'fsharp',
  go: 'go', rs: 'rust',
  html: 'html', htm: 'html',
  css: 'css', scss: 'scss', sass: 'scss', less: 'less',
  json: 'json', jsonc: 'json', json5: 'json',
  yaml: 'yaml', yml: 'yaml',
  xml: 'xml', svg: 'xml', plist: 'xml',
  sql: 'sql', md: 'markdown', markdown: 'markdown',
  txt: 'plaintext', log: 'plaintext', text: 'plaintext',
  sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell',
  ps1: 'powershell', psm1: 'powershell',
  php: 'php', rb: 'ruby', swift: 'swift', dart: 'dart', lua: 'lua',
  r: 'r', m: 'objective-c',
  toml: 'ini', ini: 'ini', cfg: 'ini', conf: 'ini',
  env: 'ini', gitignore: 'ini', dockerignore: 'ini', editorconfig: 'ini',
  vue: 'html', svelte: 'html',
  graphql: 'graphql', gql: 'graphql',
  dockerfile: 'dockerfile', makefile: 'makefile',
};

const getLanguageFromPath = (filePath) => {
  if (!filePath) return 'plaintext';
  const filename = filePath.split('/').pop() || '';
  const lower = filename.toLowerCase();
  if (lower === 'dockerfile') return 'dockerfile';
  if (lower === 'makefile') return 'makefile';
  if (lower.startsWith('.') && !lower.includes('.', 1)) {
    return LANGUAGE_MAP[lower.slice(1)] || 'ini';
  }
  const ext = lower.split('.').pop();
  return LANGUAGE_MAP[ext] || 'plaintext';
};

const getExtensionFromLanguage = (lang) => {
  const entry = Object.entries(LANGUAGE_MAP).find(([, v]) => v === lang);
  return entry?.[0] || 'txt';
};

// ─── FILE ICON (inline SVG, no CDN) ─────────────────────────
const EXT_COLOR = {
  js: '#f7df1e', jsx: '#61dafb', mjs: '#f7df1e',
  ts: '#3178c6', tsx: '#61dafb',
  py: '#3776ab', java: '#ea2d2e', kt: '#7f52ff',
  cpp: '#659ad2', c: '#a8b9cc', cs: '#9b4f96',
  go: '#00acd7', rs: '#dea584',
  html: '#e34c26', css: '#264de4', scss: '#cd6799', less: '#1d365d',
  json: '#cbcb41', yaml: '#cb171e', yml: '#cb171e', xml: '#e37933', svg: '#ff9900',
  md: '#083fa1', sh: '#4eaa25', bash: '#4eaa25', zsh: '#4eaa25',
  php: '#8892be', rb: '#cc342d', swift: '#f05138', dart: '#0175c2', lua: '#000080',
  sql: '#7986cb', toml: '#9c4221',
  vue: '#42b883', svelte: '#ff3e00',
  txt: '#8b949e', log: '#8b949e', env: '#ecd53f', gitignore: '#f54d27',
};

const FileIconComp = ({ filename, size = 14 }) => {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  const color = EXT_COLOR[ext] || '#8b949e';
  return (
    <svg width={size} height={size} viewBox="0 0 14 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2 1h7l3 3v11H2V1z" fill={color} opacity="0.18" stroke={color} strokeWidth="1" strokeLinejoin="round" />
      <path d="M9 1v3h3" stroke={color} strokeWidth="1" fill="none" strokeLinejoin="round" />
    </svg>
  );
};

// ─── MONACO THEME MAP ────────────────────────────────────────
const MONACO_THEME_MAP = {
  dark: 'plexus-dark',
  light: 'plexus-light',
  'soft-dark': 'plexus-soft-dark',
  'soft-light': 'plexus-soft-light',
  'haki-dark': 'plexus-haki-dark',
  'haki-light': 'plexus-haki-light',
};

// ─── DEFAULT SETTINGS ────────────────────────────────────────
const DEFAULT_SETTINGS = {
  // Editor
  theme: 'dark', fontSize: 14, fontFamily: 'JetBrains Mono',
  wordWrap: 'off', minimap: false, lineNumbers: 'on', tabSize: 2,
  renderWhitespace: 'selection', bracketPairColorization: true,
  showIndentGuides: true, formatOnPaste: true, stickyScroll: false,
  // Auto save
  autoSave: true, autoSaveInterval: 30,
  // Backup
  backupEnabled: false, backupInterval: 3600, backupPath: '',
  // Spotify
  spotifyClientId: '',
};

const loadSettings = () => {
  try {
    const s = localStorage.getItem('plexus-settings');
    return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
};

// ─── WELCOME CONTENT ─────────────────────────────────────────
const WELCOME = `// Welcome to Plexus — modern code editor
//
// Keyboard Shortcuts:
//   Ctrl/Cmd + N        New file
//   Ctrl/Cmd + O        Open file
//   Ctrl/Cmd + S        Save
//   Ctrl/Cmd + Shift+S  Save As
//   Ctrl/Cmd + W        Close tab
//   Ctrl/Cmd + F        Find in file
//   Ctrl/Cmd + H        Find & Replace
//   Ctrl/Cmd + G        Go to line
//   Ctrl/Cmd + \`        Toggle terminal
//   Alt + Click         Multi-cursor
//   Ctrl/Cmd + /        Toggle comment
//   Shift + Alt + F     Format document
//
// Open a folder from the Explorer sidebar to get started.
`;

// ─── MENU BAR ────────────────────────────────────────────────
const MenuDropdown = ({ label, children }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="menu-item" ref={ref}>
      <button className="menu-trigger" onClick={() => setOpen(o => !o)}>{label}</button>
      {open && <div className="menu-content" onClick={() => setOpen(false)}>{children}</div>}
    </div>
  );
};

const MenuAction = ({ children, shortcut, onClick, disabled }) => (
  <button className="menu-action" onClick={disabled ? undefined : onClick}
    style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer' }}>
    <span>{children}</span>
    {shortcut && <span className="menu-shortcut">{shortcut}</span>}
  </button>
);

const MenuSep = () => <div className="menu-separator" />;

const AppMenubar = ({ onNew, onOpen, onOpenFolder, onSave, onSaveAs, onClose, onTerminal, settings, onSettings, activeTab, onFocusModeToggle }) => (
  <div className="menubar">
    <div className="app-logo"><Code2 size={15} /> Plexus</div>
    <MenuDropdown label="File">
      <MenuAction shortcut="⌘N" onClick={onNew}>New File</MenuAction>
      <MenuAction shortcut="⌘O" onClick={onOpen}>Open File…</MenuAction>
      <MenuAction shortcut="⌘⇧O" onClick={onOpenFolder}>Open Folder…</MenuAction>
      <MenuSep />
      <MenuAction shortcut="⌘S" onClick={onSave} disabled={!activeTab}>Save</MenuAction>
      <MenuAction shortcut="⌘⇧S" onClick={onSaveAs} disabled={!activeTab}>Save As…</MenuAction>
      <MenuSep />
      <MenuAction shortcut="⌘W" onClick={onClose}>Close Tab</MenuAction>
    </MenuDropdown>
    <MenuDropdown label="Edit">
      <MenuAction shortcut="⌘Z" onClick={() => {}}>Undo</MenuAction>
      <MenuAction shortcut="⌘⇧Z" onClick={() => {}}>Redo</MenuAction>
      <MenuSep />
      <MenuAction shortcut="⌘F" onClick={() => {}}>Find</MenuAction>
      <MenuAction shortcut="⌘H" onClick={() => {}}>Replace</MenuAction>
      <MenuAction shortcut="⌘G" onClick={() => {}}>Go to Line…</MenuAction>
      <MenuSep />
      <MenuAction shortcut="⌘/" onClick={() => {}}>Toggle Comment</MenuAction>
      <MenuAction shortcut="⇧⌥F" onClick={() => {}}>Format Document</MenuAction>
    </MenuDropdown>
    <MenuDropdown label="View">
      <MenuAction shortcut="F11" onClick={onFocusModeToggle}>Toggle Focus Mode</MenuAction>
      <MenuSep />
      <MenuAction onClick={() => onSettings(s => ({ ...s, minimap: !s.minimap }))}>{settings.minimap ? '✓ ' : ''}Minimap</MenuAction>
      <MenuAction onClick={() => onSettings(s => ({ ...s, wordWrap: s.wordWrap === 'off' ? 'on' : 'off' }))}>{settings.wordWrap !== 'off' ? '✓ ' : ''}Word Wrap</MenuAction>
      <MenuAction onClick={() => onSettings(s => ({ ...s, stickyScroll: !s.stickyScroll }))}>{settings.stickyScroll ? '✓ ' : ''}Sticky Scroll</MenuAction>
      <MenuSep />
      <MenuAction onClick={() => onSettings(s => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))}>{settings.theme === 'light' ? 'Dark Theme' : 'Light Theme'}</MenuAction>
      <MenuSep />
      <MenuAction onClick={() => onSettings(s => ({ ...s, fontSize: Math.max(10, s.fontSize - 1) }))}>Zoom Out</MenuAction>
      <MenuAction onClick={() => onSettings(s => ({ ...s, fontSize: Math.min(24, s.fontSize + 1) }))}>Zoom In</MenuAction>
    </MenuDropdown>
    <MenuDropdown label="Terminal">
      <MenuAction shortcut="⌘`" onClick={onTerminal}>Open System Terminal</MenuAction>
    </MenuDropdown>
  </div>
);

// ─── SETTINGS PANEL ──────────────────────────────────────────
const SettingsPanel = ({ settings, onChange, currentFolder }) => {
  const upd = (key, val) => onChange(s => ({ ...s, [key]: val }));
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);

  const doBackup = async () => {
    if (!currentFolder || !settings.backupPath) return;
    setBackupLoading(true);
    try {
      const path = await invoke('create_backup', { source: currentFolder, dest: settings.backupPath });
      toast.success(`Backup saved to ${path.split('/').pop()}`);
      loadBackups();
    } catch (e) {
      toast.error(`Backup failed: ${e}`);
    } finally {
      setBackupLoading(false);
    }
  };

  const loadBackups = async () => {
    if (!settings.backupPath) return;
    try {
      const list = await invoke('list_backups', { path: settings.backupPath });
      setBackups(list.slice(0, 5));
    } catch {}
  };

  useEffect(() => { loadBackups(); }, [settings.backupPath]);

  return (
    <div className="settings-panel">
      <div className="settings-section">
        <p className="settings-title">Appearance</p>
        <div className="settings-row"><label>Theme</label>
          <select value={settings.theme} onChange={e => upd('theme', e.target.value)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="soft-dark">Soft Dark</option>
            <option value="soft-light">Soft Light</option>
            <option value="haki-dark">Haki Dark</option>
            <option value="haki-light">Haki Light</option>
          </select></div>
        <div className="settings-row"><label>Font Size</label>
          <div className="settings-number">
            <button onClick={() => upd('fontSize', Math.max(10, settings.fontSize - 1))}>−</button>
            <span>{settings.fontSize}px</span>
            <button onClick={() => upd('fontSize', Math.min(24, settings.fontSize + 1))}>+</button>
          </div></div>
        <div className="settings-row"><label>Font Family</label>
          <select value={settings.fontFamily} onChange={e => upd('fontFamily', e.target.value)}>
            <option value="JetBrains Mono">JetBrains Mono</option>
            <option value="Fira Code">Fira Code</option>
            <option value="Cascadia Code">Cascadia Code</option>
            <option value="Consolas">Consolas</option>
            <option value="Monaco">Monaco</option>
            <option value="monospace">System Mono</option>
          </select></div>
        <div className="settings-row"><label>Minimap</label>
          <button className={`toggle-btn ${settings.minimap ? 'on' : ''}`} onClick={() => upd('minimap', !settings.minimap)}>{settings.minimap ? 'On' : 'Off'}</button></div>
      </div>
      <div className="settings-section">
        <p className="settings-title">Editor</p>
        <div className="settings-row"><label>Word Wrap</label>
          <button className={`toggle-btn ${settings.wordWrap !== 'off' ? 'on' : ''}`} onClick={() => upd('wordWrap', settings.wordWrap === 'off' ? 'on' : 'off')}>{settings.wordWrap !== 'off' ? 'On' : 'Off'}</button></div>
        <div className="settings-row"><label>Tab Size</label>
          <select value={settings.tabSize} onChange={e => upd('tabSize', +e.target.value)}>
            <option value={2}>2</option><option value={4}>4</option><option value={8}>8</option>
          </select></div>
        <div className="settings-row"><label>Line Numbers</label>
          <select value={settings.lineNumbers} onChange={e => upd('lineNumbers', e.target.value)}>
            <option value="on">On</option><option value="relative">Relative</option><option value="off">Off</option>
          </select></div>
        <div className="settings-row"><label>Bracket Colors</label>
          <button className={`toggle-btn ${settings.bracketPairColorization ? 'on' : ''}`} onClick={() => upd('bracketPairColorization', !settings.bracketPairColorization)}>{settings.bracketPairColorization ? 'On' : 'Off'}</button></div>
        <div className="settings-row"><label>Indent Guides</label>
          <button className={`toggle-btn ${settings.showIndentGuides ? 'on' : ''}`} onClick={() => upd('showIndentGuides', !settings.showIndentGuides)}>{settings.showIndentGuides ? 'On' : 'Off'}</button></div>
        <div className="settings-row"><label>Sticky Scroll</label>
          <button className={`toggle-btn ${settings.stickyScroll ? 'on' : ''}`} onClick={() => upd('stickyScroll', !settings.stickyScroll)}>{settings.stickyScroll ? 'On' : 'Off'}</button></div>
        <div className="settings-row"><label>Format on Paste</label>
          <button className={`toggle-btn ${settings.formatOnPaste ? 'on' : ''}`} onClick={() => upd('formatOnPaste', !settings.formatOnPaste)}>{settings.formatOnPaste ? 'On' : 'Off'}</button></div>
      </div>
      <div className="settings-section">
        <p className="settings-title">Auto Save</p>
        <div className="settings-row"><label>Enabled</label>
          <button className={`toggle-btn ${settings.autoSave ? 'on' : ''}`} onClick={() => upd('autoSave', !settings.autoSave)}>{settings.autoSave ? 'On' : 'Off'}</button></div>
        {settings.autoSave && (
          <div className="settings-row"><label>Interval</label>
            <select value={settings.autoSaveInterval} onChange={e => upd('autoSaveInterval', +e.target.value)}>
              <option value={10}>10s</option><option value={30}>30s</option>
              <option value={60}>1 min</option><option value={300}>5 min</option>
            </select></div>
        )}
      </div>
      <div className="settings-section">
        <p className="settings-title">Backup</p>
        <div className="settings-row"><label>Auto Backup</label>
          <button className={`toggle-btn ${settings.backupEnabled ? 'on' : ''}`} onClick={() => upd('backupEnabled', !settings.backupEnabled)}>{settings.backupEnabled ? 'On' : 'Off'}</button></div>
        {settings.backupEnabled && (
          <div className="settings-row"><label>Every</label>
            <select value={settings.backupInterval} onChange={e => upd('backupInterval', +e.target.value)}>
              <option value={1800}>30 min</option><option value={3600}>1 hour</option>
              <option value={7200}>2 hours</option><option value={21600}>6 hours</option>
              <option value={86400}>Daily</option>
            </select></div>
        )}
        <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <label>Backup Path</label>
          <div style={{ display: 'flex', gap: 4, width: '100%' }}>
            <input className="explorer-search-input" value={settings.backupPath} onChange={e => upd('backupPath', e.target.value)} placeholder="/path/to/backups" style={{ flex: 1, fontSize: 11 }} />
            <button className="toggle-btn" onClick={async () => {
              const d = await open({ directory: true }).catch(() => null);
              if (d) upd('backupPath', d);
            }} style={{ padding: '3px 8px' }}><FolderOpen size={12} /></button>
          </div>
        </div>
        <div style={{ padding: '4px 0' }}>
          <button className="explorer-open-folder" onClick={doBackup} disabled={!currentFolder || !settings.backupPath || backupLoading}
            style={{ background: 'var(--accent)', fontSize: 11, padding: '6px 12px' }}>
            <Archive size={12} /> {backupLoading ? 'Backing up…' : 'Backup Now'}
          </button>
        </div>
        {backups.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Backups</div>
            {backups.map((b, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text-dim)', padding: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.split('/').pop()}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="settings-section">
        <p className="settings-title">Spotify</p>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8, lineHeight: 1.5 }}>
          Enter your Spotify Client ID to enable integration. Get one at developer.spotify.com.
        </div>
        <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <label>Client ID</label>
          <input className="explorer-search-input" value={settings.spotifyClientId || ''} onChange={e => upd('spotifyClientId', e.target.value)} placeholder="Spotify client ID" style={{ width: '100%', fontSize: 11 }} />
        </div>
      </div>
    </div>
  );
};

// ─── SEARCH PANEL ────────────────────────────────────────────
const SearchPanel = ({ tabs, onGoto }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(() => {
      const out = [];
      tabs.forEach(tab => {
        tab.content.split('\n').forEach((line, idx) => {
          if (line.toLowerCase().includes(query.toLowerCase()))
            out.push({ tabId: tab.id, file: tab.name, line: idx + 1, text: line.trim() });
        });
      });
      setResults(out);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, tabs]);

  return (
    <div className="search-panel">
      <div className="search-input-wrap">
        <Search size={13} />
        <input className="search-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search in all files…" autoFocus />
      </div>
      <div className="search-results">
        {query && results.length === 0 && <div className="search-empty">No matches</div>}
        {results.map((r, i) => (
          <div key={i} className="search-result" onClick={() => onGoto(r.tabId)}>
            <div className="search-result-file">{r.file}:{r.line}</div>
            <div className="search-result-text">{r.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── GIT PANEL ───────────────────────────────────────────────
const GitPanel = ({ cwd }) => {
  const [branch, setBranch] = useState('');
  const [files, setFiles] = useState([]);
  const [log, setLog] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRepo, setIsRepo] = useState(false);

  const git = useCallback(async (...args) => {
    if (!cwd) return '';
    const out = await invoke('git_command', { path: cwd, args: [...args] });
    return out;
  }, [cwd]);

  const refresh = useCallback(async () => {
    if (!cwd) return;
    setLoading(true);
    try {
      const [statusOut, branchOut, logOut] = await Promise.all([
        git('status', '--porcelain=v1'),
        git('branch', '--show-current'),
        git('log', '--oneline', '-10'),
      ]);
      setIsRepo(true);
      setBranch(branchOut.trim());
      setFiles(statusOut.split('\n').filter(Boolean).map(line => ({
        xy: line.slice(0, 2), file: line.slice(3).trim(),
        staged: line[0] !== ' ' && line[0] !== '?',
        symbol: line[0] === '?' ? '+' : line[0] === 'D' ? '−' : '~',
      })));
      setLog(logOut.split('\n').filter(Boolean));
    } catch {
      setIsRepo(false);
    } finally {
      setLoading(false);
    }
  }, [cwd, git]);

  useEffect(() => { refresh(); }, [cwd, refresh]);

  const runGit = async (...args) => {
    try {
      const out = await git(...args);
      await refresh();
      return out;
    } catch (e) {
      toast.error(`Git error: ${e}`);
    }
  };

  if (!cwd) return <div className="panel-empty">Open a folder to use Git</div>;
  if (!isRepo && !loading) return (
    <div className="panel-empty">
      <GitBranch size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
      <div>Not a Git repository</div>
      <button className="panel-action-btn" onClick={() => runGit('init').then(() => toast.success('Git initialized'))}>Initialize Repository</button>
    </div>
  );

  const staged = files.filter(f => f.staged);
  const unstaged = files.filter(f => !f.staged);

  return (
    <div className="git-panel">
      <div className="git-branch">
        <GitBranch size={13} />
        <span>{branch || 'detached'}</span>
        <button className="git-icon-btn" onClick={refresh} title="Refresh"><RefreshCw size={12} /></button>
      </div>

      <div className="git-actions">
        <button className="git-btn" onClick={() => runGit('pull')} title="Pull"><Download size={12} /> Pull</button>
        <button className="git-btn" onClick={() => runGit('push')} title="Push"><Upload size={12} /> Push</button>
        <button className="git-btn" onClick={() => runGit('fetch')} title="Fetch"><RefreshCw size={12} /> Fetch</button>
      </div>

      {unstaged.length > 0 && (
        <div className="git-section">
          <div className="git-section-header">
            <span>Changes ({unstaged.length})</span>
            <button className="git-icon-btn" onClick={() => runGit('add', '-A')} title="Stage All"><CheckSquare size={12} /></button>
          </div>
          {unstaged.map((f, i) => (
            <div key={i} className="git-file">
              <span className="git-file-symbol" style={{ color: f.xy[1] === 'D' ? 'var(--danger)' : f.xy[1] === '?' ? 'var(--success)' : 'var(--unsaved)' }}>{f.symbol}</span>
              <span className="git-file-name">{f.file}</span>
              <button className="git-icon-btn" onClick={() => runGit('add', f.file)} title="Stage"><Plus size={11} /></button>
            </div>
          ))}
        </div>
      )}

      {staged.length > 0 && (
        <div className="git-section">
          <div className="git-section-header">
            <span>Staged ({staged.length})</span>
            <button className="git-icon-btn" onClick={() => runGit('reset', 'HEAD')} title="Unstage All"><Minus size={12} /></button>
          </div>
          {staged.map((f, i) => (
            <div key={i} className="git-file staged">
              <span className="git-file-symbol" style={{ color: 'var(--success)' }}>✓</span>
              <span className="git-file-name">{f.file}</span>
              <button className="git-icon-btn" onClick={() => runGit('restore', '--staged', f.file)} title="Unstage"><Minus size={11} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="git-commit">
        <textarea
          className="git-msg"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Commit message…"
          rows={3}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { runGit('commit', '-m', message); setMessage(''); } }}
        />
        <button
          className="git-commit-btn"
          disabled={!message.trim() || staged.length === 0}
          onClick={() => runGit('commit', '-m', message).then(() => setMessage(''))}
        >
          <GitCommit size={13} /> Commit to {branch}
        </button>
      </div>

      {log.length > 0 && (
        <div className="git-section">
          <div className="git-section-header"><span>Recent Commits</span></div>
          {log.map((entry, i) => {
            const [hash, ...rest] = entry.split(' ');
            return (
              <div key={i} className="git-log-entry">
                <span className="git-hash">{hash}</span>
                <span className="git-log-msg">{rest.join(' ')}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── PROJECT RUNNER ──────────────────────────────────────────
const ProjectRunner = ({ cwd, onRunScript }) => {
  const [scripts, setScripts] = useState({});
  const [framework, setFramework] = useState('');
  const [runningScript, setRunningScript] = useState('');

  useEffect(() => {
    if (!cwd) return;
    invoke('read_package_json', { folder: cwd })
      .then(raw => {
        if (!raw) return;
        const pkg = JSON.parse(raw);
        setScripts(pkg.scripts || {});
        if (pkg.dependencies?.next || pkg.devDependencies?.next) setFramework('Next.js');
        else if (pkg.dependencies?.react || pkg.devDependencies?.react) setFramework('React');
        else if (pkg.dependencies?.vue || pkg.devDependencies?.vue) setFramework('Vue');
        else if (pkg.dependencies?.svelte || pkg.devDependencies?.svelte) setFramework('Svelte');
        else if (pkg.dependencies?.angular || pkg.devDependencies?.['@angular/core']) setFramework('Angular');
        else if (pkg.name) setFramework('Node.js');
      })
      .catch(() => {});
  }, [cwd]);

  if (!framework && Object.keys(scripts).length === 0) return null;

  const PRIORITY = ['dev', 'start', 'build', 'test', 'lint', 'preview'];
  const sorted = [...new Set([...PRIORITY.filter(s => scripts[s]), ...Object.keys(scripts)])];

  return (
    <div className="project-runner">
      <div className="project-header">
        <Package size={12} />
        <span>{framework || 'Project'}</span>
      </div>
      <div className="project-scripts">
        {sorted.map(name => (
          <button key={name}
            className={`script-btn ${runningScript === name ? 'running' : ''}`}
            onClick={() => { setRunningScript(name); onRunScript(`npm run ${name}`, name); }}
            title={`npm run ${name}`}
          >
            {runningScript === name ? <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> : <Play size={10} />}
            {name}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── SPOTIFY PKCE HELPERS ────────────────────────────────────
const generateCodeVerifier = () => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};
const generateCodeChallenge = async (verifier) => {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

// ─── SPOTIFY WIDGET ──────────────────────────────────────────
const SpotifyWidget = ({ clientId }) => {
  const [token, setToken] = useState(() => localStorage.getItem('spotify-token') || '');
  const [track, setTrack] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const pollRef = useRef(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchCurrentTrack = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers });
      if (r.status === 200) {
        const data = await r.json();
        if (data?.item) {
          setTrack({ name: data.item.name, artist: data.item.artists.map(a => a.name).join(', '), albumArt: data.item.album?.images?.[0]?.url });
          setPlaying(data.is_playing);
        } else {
          setTrack(null);
        }
      } else if (r.status === 401) {
        setToken('');
        localStorage.removeItem('spotify-token');
      }
    } catch {}
  }, [token, headers]);

  useEffect(() => {
    if (!token) return;
    fetchCurrentTrack();
    pollRef.current = setInterval(fetchCurrentTrack, 5000);
    return () => clearInterval(pollRef.current);
  }, [token, fetchCurrentTrack]);

  const spotifyCmd = useCallback(async (endpoint, method = 'PUT', body = null) => {
    if (!token) return;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
        method, headers: { ...headers, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      setTimeout(fetchCurrentTrack, 300);
    } catch {}
  }, [token, headers, fetchCurrentTrack]);

  const login = async () => {
    if (!clientId) { toast.error('Set your Spotify Client ID in Settings first'); return; }
    setConnecting(true);
    try {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      sessionStorage.setItem('spotify-verifier', verifier);

      const scope = 'user-read-playback-state user-modify-playback-state user-read-currently-playing';
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope,
        redirect_uri: 'http://localhost:8765/callback',
        code_challenge_method: 'S256',
        code_challenge: challenge,
      });
      const authUrl = `https://accounts.spotify.com/authorize?${params}`;

      // Start local callback server BEFORE opening browser
      const serverPromise = invoke('start_spotify_oauth_server');
      await openExternal(authUrl);
      toast.info('Waiting for Spotify authorization…');

      const code = await serverPromise;
      // Exchange code for token
      const resp = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: 'http://localhost:8765/callback',
          client_id: clientId,
          code_verifier: verifier,
        }),
      });
      const data = await resp.json();
      if (data.access_token) {
        setToken(data.access_token);
        localStorage.setItem('spotify-token', data.access_token);
        toast.success('Spotify connected!');
      } else {
        toast.error(`Spotify auth failed: ${data.error_description || data.error}`);
      }
    } catch (e) {
      toast.error(`Auth error: ${e}`);
    } finally {
      setConnecting(false);
    }
  };

  if (!token) return (
    <div style={{ padding: 12 }}>
      <button
        className="explorer-open-folder"
        onClick={login}
        disabled={connecting}
        style={{ background: '#1DB954', fontSize: 11, width: '100%', opacity: connecting ? 0.7 : 1 }}
      >
        <Music size={13} /> {connecting ? 'Connecting…' : 'Connect Spotify'}
      </button>
      {connecting && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
          Authorize in your browser, then come back here. The connection is automatic.
        </div>
      )}
      {!connecting && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
          Requires a Spotify Client ID in Settings. Add <code>http://localhost:8765/callback</code> as a Redirect URI in your Spotify app.
        </div>
      )}
    </div>
  );

  return (
    <div className="spotify-widget">
      {track ? (
        <>
          {track.albumArt && <img src={track.albumArt} alt="album" style={{ width: 40, height: 40, borderRadius: 4, flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</div>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nothing playing</div>
      )}
      <div className="spotify-controls">
        <button className="spotify-btn" onClick={() => spotifyCmd('previous', 'POST')} title="Previous"><SkipBack size={13} /></button>
        <button className="spotify-btn spotify-btn-main" onClick={() => spotifyCmd(playing ? 'pause' : 'play')} title={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button className="spotify-btn" onClick={() => spotifyCmd('next', 'POST')} title="Next"><SkipForward size={13} /></button>
        <button className="spotify-btn" onClick={() => { setToken(''); localStorage.removeItem('spotify-token'); }} title="Disconnect" style={{ marginLeft: 4, opacity: 0.5, fontSize: 10 }}>×</button>
      </div>
    </div>
  );
};

// ─── TERMINAL (xterm.js) ─────────────────────────────────────
const TerminalPane = ({ cwd, active }) => {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const cmdRef = useRef('');

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      theme: {
        background: '#0d1117', foreground: '#e6edf3', cursor: '#58a6ff',
        selectionBackground: '#264f78', black: '#484f58', red: '#ff7b72',
        green: '#3fb950', yellow: '#d29922', blue: '#58a6ff',
        magenta: '#bc8cff', cyan: '#39c5cf', white: '#b1bac4',
        brightBlack: '#6e7681', brightRed: '#ffa198', brightGreen: '#56d364',
        brightYellow: '#e3b341', brightBlue: '#79c0ff', brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd', brightWhite: '#f0f6fc',
      },
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Fira Code, Cascadia Code, Consolas, monospace',
      cursorBlink: true, cursorStyle: 'block',
      scrollback: 2000, allowTransparency: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    const cwd_ = cwd;
    term.writeln('\x1b[1;34m┌─ Plexus Terminal ──────────────────────────────\x1b[0m');
    term.writeln('\x1b[1;34m│\x1b[0m Type commands and press Enter to execute.');
    term.writeln('\x1b[1;34m└────────────────────────────────────────────────\x1b[0m');
    term.writeln('');
    term.write('\x1b[1;32m$\x1b[0m ');

    term.onData(data => {
      if (data === '\r') {
        const cmd = cmdRef.current;
        cmdRef.current = '';
        term.writeln('');
        if (cmd.trim()) {
          invoke('run_command', { command: cmd, cwd: cwd_ || undefined })
            .then(out => {
              if (out.trim()) {
                out.split('\n').forEach(line => { if (line !== undefined) term.writeln(line); });
              }
              term.write('\x1b[1;32m$\x1b[0m ');
            })
            .catch(err => {
              term.writeln(`\x1b[31mError: ${err}\x1b[0m`);
              term.write('\x1b[1;32m$\x1b[0m ');
            });
        } else {
          term.write('\x1b[1;32m$\x1b[0m ');
        }
      } else if (data === '\x03') {
        term.writeln('^C');
        cmdRef.current = '';
        term.write('\x1b[1;32m$\x1b[0m ');
      } else if (data === '\x7f') {
        if (cmdRef.current.length > 0) {
          cmdRef.current = cmdRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data >= ' ' || data === '\t') {
        cmdRef.current += data;
        term.write(data);
      }
    });

    const ro = new ResizeObserver(() => { try { fit.fit(); } catch {} });
    if (containerRef.current.parentElement) ro.observe(containerRef.current.parentElement);

    return () => {
      ro.disconnect();
      term.dispose();
    };
  }, []);

  useEffect(() => {
    if (active && fitRef.current) {
      setTimeout(() => { try { fitRef.current.fit(); termRef.current?.focus(); } catch {} }, 50);
    }
  }, [active]);

  return <div ref={containerRef} style={{ height: '100%', background: '#0d1117' }} />;
};

// ─── OUTPUT PANE ─────────────────────────────────────────────
const OutputPane = ({ lines }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  return (
    <div ref={ref} style={{ height: '100%', overflow: 'auto', background: '#0d1117', padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#e6edf3', whiteSpace: 'pre-wrap' }}>
      {lines.map((line, i) => (
        <div key={i} style={{ color: line.type === 'err' ? '#ff7b72' : line.type === 'cmd' ? '#58a6ff' : '#e6edf3' }}>{line.text}</div>
      ))}
      {lines.length === 0 && <div style={{ color: '#484f58' }}>Output will appear here when you run scripts.</div>}
    </div>
  );
};

// ─── BOTTOM PANEL ─────────────────────────────────────────────
const BottomPanel = ({ height, onResize, cwd, outputLines, activeTab, onTabChange }) => {
  const dragRef = useRef(null);
  const startY = useRef(0);
  const startH = useRef(0);

  const onDragStart = (e) => {
    startY.current = e.clientY;
    startH.current = height;
    const move = (e) => onResize(Math.max(100, Math.min(600, startH.current - (e.clientY - startY.current))));
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  const tabs = [
    { id: 'terminal', label: 'Terminal', icon: <Terminal size={12} /> },
    { id: 'output', label: 'Output', icon: <FileText size={12} /> },
  ];

  return (
    <div className="bottom-panel" style={{ height }}>
      <div className="bottom-panel-resize" onMouseDown={onDragStart} />
      <div className="bottom-panel-header">
        <div className="bottom-panel-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`bottom-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => onTabChange(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button className="sidebar-close" onClick={() => onResize(0)} title="Close panel">
          <X size={13} />
        </button>
      </div>
      <div className="bottom-panel-content">
        <div style={{ display: activeTab === 'terminal' ? 'block' : 'none', height: '100%' }}>
          <TerminalPane cwd={cwd} active={activeTab === 'terminal'} />
        </div>
        <div style={{ display: activeTab === 'output' ? 'block' : 'none', height: '100%' }}>
          <OutputPane lines={outputLines} />
        </div>
      </div>
    </div>
  );
};

// ─── FILE EXPLORER ───────────────────────────────────────────
const FileExplorer = ({ currentFolder, onOpenFolder, onFileSelect, activeFilePath }) => {
  const [tree, setTree] = useState({ files: [], folders: [] });
  const [expanded, setExpanded] = useState(new Set());
  const [subContents, setSubContents] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [newFileDialog, setNewFileDialog] = useState(null);
  const [newFolderDialog, setNewFolderDialog] = useState(null);
  const [newName, setNewName] = useState('');

  const loadPath = useCallback(async (path, isRoot = false) => {
    try {
      const norm = await normalize(path);
      const entries = await readDir(norm);
      const items = await Promise.all(
        entries.filter(e => e.name).map(async (e) => {
          const fullPath = await join(norm, e.name);
          return { path: fullPath, name: e.name, isDir: e.isDirectory, language: getLanguageFromPath(e.name) };
        })
      );
      const folders = items.filter(i => i.isDir).sort((a, b) => a.name.localeCompare(b.name));
      const files = items.filter(i => !i.isDir).sort((a, b) => a.name.localeCompare(b.name));
      const data = { files, folders };
      if (isRoot) setTree(data);
      else setSubContents(prev => ({ ...prev, [path]: data }));
      return data;
    } catch { return { files: [], folders: [] }; }
  }, []);

  useEffect(() => {
    if (!currentFolder) return;
    setLoading(true);
    loadPath(currentFolder, true).finally(() => setLoading(false));
  }, [currentFolder, loadPath]);

  const toggleFolder = async (path) => {
    const isOpen = expanded.has(path);
    if (!isOpen && !subContents[path]) await loadPath(path, false);
    setExpanded(prev => {
      const next = new Set(prev);
      isOpen ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const handleDelete = async (path, isDir) => {
    try {
      await remove(path, isDir ? { recursive: true } : undefined);
      await loadPath(currentFolder, true);
    } catch { toast.error('Delete failed'); }
  };

  const handleCreateFile = async () => {
    if (!newName.trim() || !newFileDialog) return;
    try {
      const p = await join(newFileDialog.parentPath, newName.trim());
      await writeTextFile(p, '');
      setNewFileDialog(null); setNewName('');
      await loadPath(currentFolder, true);
    } catch { toast.error('Failed to create file'); }
  };

  const handleCreateFolder = async () => {
    if (!newName.trim() || !newFolderDialog) return;
    try {
      const p = await join(newFolderDialog.parentPath, newName.trim());
      await create(p);
      setNewFolderDialog(null); setNewName('');
      await loadPath(currentFolder, true);
    } catch { toast.error('Failed to create folder'); }
  };

  const renderTree = (items, depth = 0) => {
    if (!items) return null;
    const pl = depth * 12 + 8;
    const filtered = search
      ? { files: items.files.filter(f => f.name.toLowerCase().includes(search.toLowerCase())), folders: items.folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase())) }
      : items;

    return (<>
      {filtered.folders.map(folder => (
        <div key={folder.path}>
          <ContextMenu>
            <ContextMenuTrigger>
              <div className="tree-folder" style={{ paddingLeft: pl }} onClick={() => toggleFolder(folder.path)}>
                {expanded.has(folder.path) ? <ChevronDown size={12} style={{ flexShrink: 0, color: 'var(--text-muted)' }} /> : <ChevronRight size={12} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />}
                <Folder size={14} style={{ flexShrink: 0, color: '#e3b341' }} />
                <span className="tree-name">{folder.name}</span>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => { setNewFileDialog({ parentPath: folder.path }); setNewName(''); }}>New File</ContextMenuItem>
              <ContextMenuItem onClick={() => { setNewFolderDialog({ parentPath: folder.path }); setNewName(''); }}>New Folder</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => handleDelete(folder.path, true)} className="text-destructive">Delete</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          {expanded.has(folder.path) && subContents[folder.path] && renderTree(subContents[folder.path], depth + 1)}
        </div>
      ))}
      {filtered.files.map(file => (
        <ContextMenu key={file.path}>
          <ContextMenuTrigger>
            <div className={`tree-file ${activeFilePath === file.path ? 'active' : ''}`} style={{ paddingLeft: pl + 16 }} onClick={() => onFileSelect(file.path)}>
              <FileIconComp filename={file.name} size={14} />
              <span className="tree-name">{file.name}</span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onFileSelect(file.path)}>Open</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleDelete(file.path, false)} className="text-destructive">Delete</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </>);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="explorer-search">
        <input className="explorer-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter files…" />
      </div>
      {!currentFolder ? (
        <div style={{ padding: 12 }}>
          <button className="explorer-open-folder" onClick={onOpenFolder}><FolderOpen size={14} /> Open Folder</button>
        </div>
      ) : (
        <div className="file-explorer">
          {loading ? <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>Loading…</div> : (
            <>
              <div className="explorer-folder-name"><Folder size={12} />{currentFolder.split('/').pop()}</div>
              <div className="explorer-tree">{renderTree(tree)}</div>
            </>
          )}
        </div>
      )}

      <Dialog open={!!newFileDialog} onOpenChange={o => !o && setNewFileDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>New File</DialogTitle></DialogHeader>
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="filename.js" onKeyDown={e => e.key === 'Enter' && handleCreateFile()} autoFocus />
          <DialogFooter><Button variant="outline" onClick={() => setNewFileDialog(null)}>Cancel</Button><Button onClick={handleCreateFile}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!newFolderDialog} onOpenChange={o => !o && setNewFolderDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Folder</DialogTitle></DialogHeader>
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="folder-name" onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} autoFocus />
          <DialogFooter><Button variant="outline" onClick={() => setNewFolderDialog(null)}>Cancel</Button><Button onClick={handleCreateFolder}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── TAB BAR ─────────────────────────────────────────────────
const TabBar = ({ tabs, activeId, onSwitch, onClose, onNew, onFocusModeToggle }) => (
  <div className="tab-bar">
    <div className="tab-list">
      {tabs.map(tab => (
        <div key={tab.id} className={`tab ${tab.id === activeId ? 'active' : ''}`}
          onClick={() => onSwitch(tab.id)} onAuxClick={e => e.button === 1 && onClose(tab.id)}
          title={tab.filePath || tab.name}>
          <FileIconComp filename={tab.name} size={13} />
          <span className="tab-name">{tab.name}</span>
          {!tab.saved && <span className="tab-unsaved" title="Unsaved">●</span>}
          <button className="tab-close" onClick={e => { e.stopPropagation(); onClose(tab.id); }} title="Close"><X size={11} /></button>
        </div>
      ))}
    </div>
    <button className="tab-new" onClick={onNew} title="New File (Ctrl+N)"><Plus size={14} /></button>
    <button className="tab-new" onClick={onFocusModeToggle} title="Toggle Focus Mode (F11)"><Maximize2 size={14} /></button>
  </div>
);

// ─── STATUS BAR ──────────────────────────────────────────────
const StatusBar = ({ cursor, language, fileSize, saved, autoSave, wordWrap, gitBranch, onWordWrapToggle, onTerminalToggle, onCopy }) => (
  <div className="status-bar">
    <div className="status-left">
      {gitBranch && (
        <span className="status-item" title={`Branch: ${gitBranch}`}>
          <GitBranch size={11} /><span>{gitBranch}</span>
        </span>
      )}
      <button className="status-item clickable" onClick={onTerminalToggle} title="Toggle Terminal (Ctrl+`)">
        <Terminal size={11} /><span>Terminal</span>
      </button>
    </div>
    <div className="status-right">
      {!saved && <span className="status-item unsaved">● Unsaved</span>}
      {autoSave && saved && <span className="status-item dimmed">Auto Save</span>}
      <button className="status-item clickable" onClick={onWordWrapToggle} title="Toggle Word Wrap">
        <WrapText size={11} /><span>{wordWrap ? 'Wrap' : 'No Wrap'}</span>
      </button>
      <button className="status-item clickable" onClick={onCopy} title="Copy content"><Copy size={11} /></button>
      <span className="status-item">{language}</span>
      <span className="status-item">{fileSize}</span>
      <span className="status-item mono">Ln {cursor.line}  Col {cursor.column}</span>
      <span className="status-item dimmed">UTF-8</span>
    </div>
  </div>
);

// ─── MARKDOWN EDITOR ─────────────────────────────────────────
const MarkdownEditor = ({ value, onChange, onMount, options, monacoTheme }) => (
  <div style={{ display: 'flex', height: '100%' }}>
    <div style={{ flex: 1, borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
      <Editor language="markdown" value={value} onChange={onChange} onMount={onMount} theme={monacoTheme} options={options} loading={<div className="editor-loading">Loading…</div>} />
    </div>
    <div className="markdown-preview">
      <article className="markdown-content"><ReactMarkdown>{value || ''}</ReactMarkdown></article>
    </div>
  </div>
);

// ─── DEFINE MONACO THEMES ────────────────────────────────────
const definePlexusThemes = (monaco) => {
  monaco.editor.defineTheme('plexus-dark', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'FF7B72' },
      { token: 'string', foreground: 'A5D6FF' },
      { token: 'number', foreground: '79C0FF' },
      { token: 'type', foreground: 'FFA657' },
      { token: 'function', foreground: 'D2A8FF' },
      { token: 'operator', foreground: 'FF7B72' },
      { token: 'tag', foreground: '7EE787' },
      { token: 'attribute.name', foreground: '79C0FF' },
      { token: 'attribute.value', foreground: 'A5D6FF' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#e6edf3',
      'editorLineNumber.foreground': '#484f58',
      'editorLineNumber.activeForeground': '#c9d1d9',
      'editor.selectionBackground': '#1f3251',
      'editor.inactiveSelectionBackground': '#1f325188',
      'editor.lineHighlightBackground': '#161b22',
      'editor.lineHighlightBorder': '#00000000',
      'editorCursor.foreground': '#58a6ff',
      'editor.findMatchBackground': '#f78166aa',
      'editor.findMatchHighlightBackground': '#ffa6572a',
      'editorGutter.background': '#0d1117',
      'editorBracketMatch.background': '#1f3251',
      'editorBracketMatch.border': '#388bfd',
      'scrollbarSlider.background': '#484f5840',
      'scrollbarSlider.hoverBackground': '#484f5880',
      'scrollbarSlider.activeBackground': '#484f58bb',
      'editorSuggestWidget.background': '#161b22',
      'editorSuggestWidget.border': '#30363d',
      'editorSuggestWidget.foreground': '#e6edf3',
      'editorSuggestWidget.selectedBackground': '#1f3251',
      'editorSuggestWidget.highlightForeground': '#58a6ff',
      'editorHoverWidget.background': '#161b22',
      'editorHoverWidget.border': '#30363d',
      'editorWidget.background': '#161b22',
      'editorWidget.border': '#30363d',
      'input.background': '#0d1117', 'input.border': '#30363d',
      'focusBorder': '#58a6ff',
      'editorIndentGuide.background': '#21262d',
      'editorIndentGuide.activeBackground': '#30363d',
      'editorOverviewRuler.border': '#00000000',
    },
  });

  monaco.editor.defineTheme('plexus-light', {
    base: 'vs', inherit: true,
    rules: [
      { token: 'comment', foreground: '6E7781', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'CF222E' },
      { token: 'string', foreground: '0A3069' },
      { token: 'number', foreground: '0550AE' },
      { token: 'function', foreground: '8250DF' },
    ],
    colors: {
      'editor.background': '#ffffff', 'editor.foreground': '#24292f',
      'editorLineNumber.foreground': '#8c959f',
      'editor.selectionBackground': '#0550ae33', 'editor.lineHighlightBackground': '#f6f8fa',
      'editorCursor.foreground': '#0969da',
      'scrollbarSlider.background': '#8c959f40',
      'editorSuggestWidget.background': '#ffffff', 'editorSuggestWidget.border': '#d0d7de',
      'editorSuggestWidget.selectedBackground': '#ddf4ff',
    },
  });

  monaco.editor.defineTheme('plexus-soft-dark', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'cba6f7' },
      { token: 'string', foreground: 'a6e3a1' },
      { token: 'number', foreground: 'fab387' },
      { token: 'function', foreground: '89b4fa' },
      { token: 'type', foreground: 'f9e2af' },
    ],
    colors: {
      'editor.background': '#1e1e2e', 'editor.foreground': '#cdd6f4',
      'editorLineNumber.foreground': '#585b70',
      'editor.selectionBackground': '#45475a', 'editor.lineHighlightBackground': '#181825',
      'editorCursor.foreground': '#cba6f7',
      'editorGutter.background': '#1e1e2e',
      'scrollbarSlider.background': '#45475a60',
      'editorSuggestWidget.background': '#181825', 'editorSuggestWidget.border': '#313244',
      'editorSuggestWidget.selectedBackground': '#313244',
    },
  });

  monaco.editor.defineTheme('plexus-soft-light', {
    base: 'vs', inherit: true,
    rules: [
      { token: 'comment', foreground: '8c8fa1', fontStyle: 'italic' },
      { token: 'keyword', foreground: '8839ef' },
      { token: 'string', foreground: '40a02b' },
      { token: 'number', foreground: 'fe640b' },
      { token: 'function', foreground: '1e66f5' },
    ],
    colors: {
      'editor.background': '#f4f4f8', 'editor.foreground': '#1e1e2e',
      'editorLineNumber.foreground': '#8c8fa1',
      'editor.selectionBackground': '#d8d8f0', 'editor.lineHighlightBackground': '#ebebf0',
      'editorCursor.foreground': '#7c3aed',
    },
  });

  monaco.editor.defineTheme('plexus-haki-dark', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'comment', foreground: '5a6e3a', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'a0cc5a' },
      { token: 'string', foreground: '8fbc4a' },
      { token: 'number', foreground: 'd4a017' },
      { token: 'function', foreground: '6abf4b' },
      { token: 'type', foreground: 'c8e090' },
    ],
    colors: {
      'editor.background': '#1a1f14', 'editor.foreground': '#d4e6b5',
      'editorLineNumber.foreground': '#5a6e3a',
      'editor.selectionBackground': '#354228', 'editor.lineHighlightBackground': '#151a10',
      'editorCursor.foreground': '#8fbc4a',
      'editorGutter.background': '#1a1f14',
      'scrollbarSlider.background': '#3a4e2440',
    },
  });

  monaco.editor.defineTheme('plexus-haki-light', {
    base: 'vs', inherit: true,
    rules: [
      { token: 'comment', foreground: '7a9060', fontStyle: 'italic' },
      { token: 'keyword', foreground: '3a5c10' },
      { token: 'string', foreground: '2a7a20' },
      { token: 'number', foreground: '8a6000' },
      { token: 'function', foreground: '4a6d1a' },
    ],
    colors: {
      'editor.background': '#f0f2eb', 'editor.foreground': '#1a2810',
      'editorLineNumber.foreground': '#7a9060',
      'editor.selectionBackground': '#ccd4b8', 'editor.lineHighlightBackground': '#e8ebe3',
      'editorCursor.foreground': '#4a6d1a',
    },
  });
};

// ─── MAIN IDE ─────────────────────────────────────────────────
const IDE = () => {
  const [tabs, setTabs] = useState([
    { id: 1, name: 'welcome.js', content: WELCOME, language: 'javascript', filePath: null, saved: true, viewState: null },
  ]);
  const [activeId, setActiveId] = useState(1);
  const [nextId, setNextId] = useState(2);
  const [sidebarView, setSidebarView] = useState('explorer');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [settings, setSettings] = useState(loadSettings);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [bottomH, setBottomH] = useState(0);
  const [bottomTab, setBottomTab] = useState('terminal');
  const [outputLines, setOutputLines] = useState([]);
  const [gitBranch, setGitBranch] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [hoverSidebarOpen, setHoverSidebarOpen] = useState(false);
  const hoverTimerRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const { notes, addNote, updateNote, deleteNote } = useStickyNotes();

  const activeTab = useMemo(() => tabs.find(t => t.id === activeId), [tabs, activeId]);

  // Persist settings
  useEffect(() => {
    try { localStorage.setItem('plexus-settings', JSON.stringify(settings)); } catch {}
  }, [settings]);

  // Theme update
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(MONACO_THEME_MAP[settings.theme] ?? 'plexus-dark');
    }
  }, [settings.theme]);

  // Detect git branch when folder changes
  useEffect(() => {
    if (!currentFolder) { setGitBranch(''); return; }
    invoke('git_command', { path: currentFolder, args: ['branch', '--show-current'] })
      .then(b => setGitBranch(b.trim()))
      .catch(() => setGitBranch(''));
  }, [currentFolder]);

  // Auto save
  useEffect(() => {
    if (!settings.autoSave) return;
    const iv = setInterval(() => {
      const tab = tabs.find(t => t.id === activeId);
      if (tab?.filePath && !tab.saved) saveFile(activeId);
    }, settings.autoSaveInterval * 1000);
    return () => clearInterval(iv);
  }, [settings.autoSave, settings.autoSaveInterval, activeId, tabs]);

  // Auto backup
  useEffect(() => {
    if (!settings.backupEnabled || !settings.backupPath || !currentFolder) return;
    const iv = setInterval(() => {
      invoke('create_backup', { source: currentFolder, dest: settings.backupPath })
        .then(() => toast.success('Auto backup completed'))
        .catch(e => console.error('Auto backup failed:', e));
    }, settings.backupInterval * 1000);
    return () => clearInterval(iv);
  }, [settings.backupEnabled, settings.backupInterval, settings.backupPath, currentFolder]);

  const saveViewState = useCallback(() => {
    if (editorRef.current) {
      const vs = editorRef.current.saveViewState();
      setTabs(prev => prev.map(t => t.id === activeId ? { ...t, viewState: vs } : t));
    }
  }, [activeId]);

  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    definePlexusThemes(monaco);
    monaco.editor.setTheme(MONACO_THEME_MAP[settings.theme] ?? 'plexus-dark');
    editor.onDidChangeCursorPosition(e => setCursor({ line: e.position.lineNumber, column: e.position.column }));
    editor.focus();
  }, [settings.theme]);

  const handleEditorChange = useCallback((value) => {
    setTabs(prev => prev.map(t => t.id === activeId ? { ...t, content: value ?? '', saved: false } : t));
  }, [activeId]);

  const switchTab = useCallback((id) => {
    if (id === activeId) return;
    saveViewState();
    setActiveId(id);
    setTimeout(() => {
      const tab = tabs.find(t => t.id === id);
      if (tab?.viewState && editorRef.current) editorRef.current.restoreViewState(tab.viewState);
      editorRef.current?.focus();
    }, 30);
  }, [activeId, saveViewState, tabs]);

  const closeTab = useCallback((id) => {
    if (tabs.length === 1) return;
    const idx = tabs.findIndex(t => t.id === id);
    const next = tabs.filter(t => t.id !== id);
    if (activeId === id) setActiveId(next[Math.max(0, idx - 1)].id);
    setTabs(next);
  }, [tabs, activeId]);

  const createTab = useCallback((language = 'javascript', name = null, content = '', filePath = null) => {
    const ext = getExtensionFromLanguage(language);
    const tab = { id: nextId, name: name ?? `untitled-${nextId}.${ext}`, content, language, filePath, saved: !!filePath, viewState: null };
    setTabs(prev => [...prev, tab]);
    setActiveId(nextId);
    setNextId(n => n + 1);
  }, [nextId]);

  const openFile = useCallback(async (filePath) => {
    try {
      const path = filePath ?? await open({ multiple: false });
      if (!path) return;
      const existing = tabs.find(t => t.filePath === path);
      if (existing) { switchTab(existing.id); return; }
      let content;
      try {
        content = await readTextFile(path);
      } catch {
        // Try reading as binary text fallback
        content = `// Binary or unreadable file: ${path.split('/').pop()}`;
      }
      createTab(getLanguageFromPath(path), path.split('/').pop(), content, path);
    } catch { toast.error('Could not open file'); }
  }, [tabs, switchTab, createTab]);

  const saveFile = useCallback(async (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    try {
      let fp = tab.filePath;
      if (!fp) fp = await save({ title: 'Save File', filters: [{ name: tab.language, extensions: [getExtensionFromLanguage(tab.language)] }] });
      if (!fp) return;
      await writeTextFile(fp, tab.content);
      setTabs(prev => prev.map(t => t.id === tabId ? { ...t, filePath: fp, saved: true, name: fp.split('/').pop() } : t));
      toast.success(`Saved ${fp.split('/').pop()}`);
    } catch { toast.error('Save failed'); }
  }, [tabs]);

  const saveFileAs = useCallback(async () => {
    if (!activeTab) return;
    try {
      const fp = await save({ title: 'Save As', filters: [{ name: activeTab.language, extensions: [getExtensionFromLanguage(activeTab.language)] }] });
      if (!fp) return;
      await writeTextFile(fp, activeTab.content);
      setTabs(prev => prev.map(t => t.id === activeId ? { ...t, filePath: fp, saved: true, name: fp.split('/').pop() } : t));
      toast.success(`Saved ${fp.split('/').pop()}`);
    } catch { toast.error('Save failed'); }
  }, [activeTab, activeId]);

  const openFolder = useCallback(async () => {
    try {
      const fp = await open({ directory: true, multiple: false });
      if (!fp) return;
      setCurrentFolder(fp);
      setSidebarView('explorer');
    } catch { toast.error('Could not open folder'); }
  }, []);

  const LONG_RUNNING_SCRIPTS = ['dev', 'start', 'watch', 'serve', 'preview', 'storybook'];

  const runScript = useCallback((command, name) => {
    const isLongRunning = LONG_RUNNING_SCRIPTS.some(r => name === r || name.startsWith(r + ':'));
    if (isLongRunning) {
      // Open in a native terminal window so the process can run freely
      invoke('run_command_in_terminal', { command, cwd: currentFolder || undefined })
        .then(() => toast.success(`Started "${name}" in terminal`))
        .catch(err => toast.error(`Failed to start: ${err}`));
      return;
    }
    // Short-lived scripts → show output in panel
    setBottomTab('output');
    setBottomH(h => Math.max(h, 220));
    setOutputLines(prev => [...prev, { type: 'cmd', text: `\n$ ${command}` }]);
    invoke('run_command', { command, cwd: currentFolder || undefined })
      .then(out => {
        const lines = out.split('\n').map(text => ({ type: 'out', text }));
        setOutputLines(prev => [...prev, ...lines]);
      })
      .catch(err => setOutputLines(prev => [...prev, { type: 'err', text: `Error: ${err}` }]));
  }, [currentFolder]);

  // Global shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.shiftKey && e.key === 's') { e.preventDefault(); saveFile(activeId); }
      if (mod && e.shiftKey && e.key === 's') { e.preventDefault(); saveFileAs(); }
      if (mod && e.key === 'n') { e.preventDefault(); createTab(); }
      if (mod && e.key === 'o') { e.preventDefault(); openFile(); }
      if (mod && e.key === 'w') { e.preventDefault(); closeTab(activeId); }
      if (mod && e.key === '`') { e.preventDefault(); setBottomH(h => h > 0 ? 0 : 240); }
      if (e.key === 'F11') { e.preventDefault(); setFocusMode(f => !f); }
      if (e.key === 'Escape' && focusMode) { e.preventDefault(); setFocusMode(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, saveFile, saveFileAs, createTab, openFile, closeTab, focusMode]);

  const editorOptions = useMemo(() => ({
    fontSize: settings.fontSize,
    fontFamily: `'${settings.fontFamily}', JetBrains Mono, Fira Code, monospace`,
    fontLigatures: true,
    wordWrap: settings.wordWrap,
    minimap: { enabled: settings.minimap },
    lineNumbers: settings.lineNumbers,
    tabSize: settings.tabSize,
    insertSpaces: true,
    renderWhitespace: settings.renderWhitespace,
    formatOnPaste: settings.formatOnPaste,
    bracketPairColorization: { enabled: settings.bracketPairColorization },
    guides: { bracketPairs: settings.bracketPairColorization, indentation: settings.showIndentGuides },
    stickyScroll: { enabled: settings.stickyScroll },
    smoothScrolling: true,
    cursorSmoothCaretAnimation: 'on',
    cursorBlinking: 'smooth',
    scrollBeyondLastLine: false,
    padding: { top: 12, bottom: 40 },
    quickSuggestions: { other: true, comments: false, strings: true },
    automaticLayout: true,
    renderLineHighlight: 'line',
    scrollbar: { useShadows: false, verticalScrollbarSize: 8, horizontalScrollbarSize: 8, arrowSize: 0 },
    overviewRulerBorder: false, overviewRulerLanes: 0, hideCursorInOverviewRuler: true,
    links: true, colorDecorators: true, contextmenu: true,
    inlineSuggest: { enabled: true },
    suggest: { showIcons: true, showStatusBar: false, preview: true },
    acceptSuggestionOnEnter: 'smart',
    snippetSuggestions: 'top',
    parameterHints: { enabled: true },
    hover: { enabled: true },
    'semanticHighlighting.enabled': true,
  }), [settings]);

  const monacoTheme = MONACO_THEME_MAP[settings.theme] ?? 'plexus-dark';

  const fileSize = useMemo(() => {
    const b = new Blob([activeTab?.content || '']).size;
    if (b < 1024) return `${b}B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
    return `${(b / 1024 / 1024).toFixed(1)}MB`;
  }, [activeTab?.content]);

  const toggleSidebar = (view) => setSidebarView(prev => prev === view ? null : view);

  // Hover sidebar mouse handler
  const onBodyMouseMove = useCallback((e) => {
    if (e.clientX <= 8) {
      clearTimeout(hoverTimerRef.current);
      setHoverSidebarOpen(true);
    } else if (e.clientX > 260) {
      hoverTimerRef.current = setTimeout(() => setHoverSidebarOpen(false), 400);
    }
  }, []);

  // Activity bar items
  const activityItems = [
    { id: 'explorer', icon: <Files size={20} />, title: 'Explorer' },
    { id: 'search', icon: <Search size={20} />, title: 'Search' },
    { id: 'git', icon: <GitBranch size={20} />, title: 'Git' },
    { id: 'ai', icon: <Sparkles size={20} />, title: 'AI Assistant' },
    { id: 'notes', icon: <Pin size={20} />, title: 'Sticky Notes' },
    { id: 'spotify', icon: <Music size={20} />, title: 'Spotify' },
  ];

  return (
    <div className={`ide-root ${settings.theme}${focusMode ? ' focus-mode' : ''}`} onMouseMove={onBodyMouseMove}>
      <Toaster position="bottom-right" theme={settings.theme === 'light' ? 'light' : 'dark'} richColors closeButton />

      {/* Sticky notes layer */}
      <StickyNotesLayer notes={notes} onUpdate={updateNote} onDelete={deleteNote} focusMode={focusMode} />

      {/* Focus mode exit button */}
      {focusMode && (
        <button
          style={{ position: 'fixed', top: 12, right: 12, zIndex: 600, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }}
          onClick={() => setFocusMode(false)}
          title="Exit Focus Mode (F11)"
        >
          <Maximize2 size={13} /> Exit Focus
        </button>
      )}

      {/* Hover sidebar overlay (slides in when mouse at left edge) */}
      <div
        className={`hover-sidebar-overlay${hoverSidebarOpen ? ' open' : ''}`}
        onMouseLeave={() => { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = setTimeout(() => setHoverSidebarOpen(false), 300); }}
        onMouseEnter={() => { clearTimeout(hoverTimerRef.current); }}
      >
        <div style={{ padding: '8px 8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Explorer</div>
        <FileExplorer currentFolder={currentFolder} onOpenFolder={openFolder} onFileSelect={(p) => { openFile(p); setHoverSidebarOpen(false); }} activeFilePath={activeTab?.filePath} />
      </div>

      <AppMenubar
        activeTab={activeTab}
        onNew={() => createTab()}
        onOpen={() => openFile()}
        onOpenFolder={openFolder}
        onSave={() => saveFile(activeId)}
        onSaveAs={saveFileAs}
        onClose={() => closeTab(activeId)}
        onTerminal={() => invoke('open_terminal').catch(console.error)}
        settings={settings}
        onSettings={setSettings}
        onFocusModeToggle={() => setFocusMode(f => !f)}
      />

      <div className="ide-body">
        {/* Activity Bar */}
        <div className="activity-bar">
          {activityItems.map(item => (
            <button key={item.id} className={`activity-btn ${sidebarView === item.id ? 'active' : ''}`}
              onClick={() => toggleSidebar(item.id)} title={item.title}>
              {item.icon}
            </button>
          ))}
          <div className="activity-spacer" />
          <button className={`activity-btn ${sidebarView === 'settings' ? 'active' : ''}`}
            onClick={() => toggleSidebar('settings')} title="Settings">
            <Settings size={20} />
          </button>
        </div>

        {/* Sidebar */}
        {sidebarView && (
          <div className="sidebar">
            <div className="sidebar-header">
              <span>{{ explorer: 'Explorer', search: 'Search', git: 'Git', settings: 'Settings', spotify: 'Spotify', ai: 'AI Assistant', notes: 'Sticky Notes' }[sidebarView]}</span>
              <button className="sidebar-close" onClick={() => setSidebarView(null)}><X size={13} /></button>
            </div>

            {sidebarView === 'explorer' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <FileExplorer currentFolder={currentFolder} onOpenFolder={openFolder} onFileSelect={openFile} activeFilePath={activeTab?.filePath} />
                {currentFolder && <ProjectRunner cwd={currentFolder} onRunScript={runScript} />}
              </div>
            )}
            {sidebarView === 'search' && <SearchPanel tabs={tabs} onGoto={switchTab} />}
            {sidebarView === 'git' && <GitPanel cwd={currentFolder} />}
            {sidebarView === 'settings' && <SettingsPanel settings={settings} onChange={setSettings} currentFolder={currentFolder} />}
            {sidebarView === 'spotify' && (
              <div style={{ padding: 8 }}>
                <SpotifyWidget clientId={settings.spotifyClientId} />
              </div>
            )}
            {sidebarView === 'ai' && (
              <AIPanel activeTab={activeTab} editorRef={editorRef} />
            )}
            {sidebarView === 'notes' && (
              <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className="explorer-open-folder"
                  style={{ width: '100%' }}
                  onClick={() => addNote({ attachedFile: activeTab?.filePath || null, attachedLine: cursor.line })}
                >
                  <Pin size={13} /> New Note
                </button>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{notes.length} note{notes.length !== 1 ? 's' : ''} on canvas</div>
                {notes.map(note => (
                  <div key={note.id} style={{ padding: '6px 8px', background: 'var(--hover)', borderRadius: 4, fontSize: 11, cursor: 'pointer', borderLeft: '3px solid var(--accent)' }}>
                    {note.attachedFile ? <span style={{ color: 'var(--accent)', fontSize: 10 }}>{note.attachedFile.split('/').pop()}:{note.attachedLine}<br /></span> : null}
                    {note.content.slice(0, 50) || <em style={{ color: 'var(--text-muted)' }}>empty</em>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Editor Area */}
        <div className="editor-area">
          <TabBar tabs={tabs} activeId={activeId} onSwitch={switchTab} onClose={closeTab} onNew={() => createTab()} onFocusModeToggle={() => setFocusMode(f => !f)} />
          <div className="editor-content">
            {activeTab?.language === 'markdown' ? (
              <MarkdownEditor value={activeTab.content} onChange={handleEditorChange} onMount={handleEditorMount} options={editorOptions} monacoTheme={monacoTheme} />
            ) : (
              <Editor
                key={activeId}
                language={activeTab?.language || 'plaintext'}
                value={activeTab?.content ?? ''}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                theme={monacoTheme}
                options={editorOptions}
                loading={<div className="editor-loading">Loading editor…</div>}
              />
            )}
          </div>
          {bottomH > 0 && (
            <BottomPanel
              height={bottomH}
              onResize={setBottomH}
              cwd={currentFolder}
              outputLines={outputLines}
              activeTab={bottomTab}
              onTabChange={setBottomTab}
            />
          )}
        </div>
      </div>

      <StatusBar
        cursor={cursor}
        language={activeTab?.language || 'plaintext'}
        fileSize={fileSize}
        saved={activeTab?.saved !== false}
        autoSave={settings.autoSave}
        wordWrap={settings.wordWrap !== 'off'}
        gitBranch={gitBranch}
        onWordWrapToggle={() => setSettings(s => ({ ...s, wordWrap: s.wordWrap === 'off' ? 'on' : 'off' }))}
        onTerminalToggle={() => setBottomH(h => h > 0 ? 0 : 240)}
        onCopy={() => { navigator.clipboard.writeText(activeTab?.content || ''); toast.success('Copied!'); }}
      />
    </div>
  );
};

export default React.memo(IDE);
