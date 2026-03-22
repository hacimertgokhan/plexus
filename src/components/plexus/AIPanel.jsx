import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square, Settings, ChevronDown, Check, Code2, RefreshCw } from 'lucide-react';
import { invoke } from "@tauri-apps/api/core";

// ─── PROVIDER CONFIGS ────────────────────────────────────────
const PROVIDER_META = {
  claude: {
    label: 'Claude (Anthropic)',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    defaultModel: 'claude-sonnet-4-6',
    needsKey: true,
    keyLabel: 'Anthropic API Key',
    keyPlaceholder: 'sk-ant-...',
  },
  openai: {
    label: 'Codex (OpenAI)',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-mini'],
    defaultModel: 'gpt-4o',
    needsKey: true,
    keyLabel: 'OpenAI API Key',
    keyPlaceholder: 'sk-...',
  },
  gemini: {
    label: 'Gemini (Google)',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    defaultModel: 'gemini-2.0-flash',
    needsKey: true,
    keyLabel: 'Google AI API Key',
    keyPlaceholder: 'AIza...',
  },
  opencode: {
    label: 'OpenCode (CLI)',
    models: ['auto'],
    defaultModel: 'auto',
    needsKey: false,
    keyLabel: '',
    keyPlaceholder: '',
  },
  local: {
    label: 'Local LLM (Ollama)',
    models: ['llama3', 'codellama', 'mistral', 'deepseek-coder', 'qwen2.5-coder'],
    defaultModel: 'llama3',
    needsKey: false,
    keyLabel: 'Endpoint',
    keyPlaceholder: 'http://localhost:11434',
  },
};

// ─── SYSTEM PROMPT ───────────────────────────────────────────
const buildSystemPrompt = (fileContent, fileName, language) => {
  const ctx = fileContent ? `\n\nCurrent file: ${fileName} (${language})\n\`\`\`${language}\n${fileContent.slice(0, 3000)}${fileContent.length > 3000 ? '\n... (truncated)' : ''}\n\`\`\`` : '';
  return `You are an expert coding assistant integrated into Plexus code editor. Help the user with their code. When providing code changes, wrap them in fenced code blocks with the language. Be concise and practical.${ctx}`;
};

// ─── PROVIDERS ───────────────────────────────────────────────
async function* claudeStream(messages, config) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      stream: true,
      system: config.systemPrompt,
      messages: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
    }),
  });
  if (!response.ok) throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return;
      try {
        const j = JSON.parse(data);
        const chunk = j.delta?.text ?? '';
        if (chunk) yield chunk;
      } catch {}
    }
  }
}

async function* openAIStream(messages, config) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      messages: [{ role: 'system', content: config.systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content }))],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return;
      try {
        const j = JSON.parse(data);
        const chunk = j.choices[0]?.delta?.content ?? '';
        if (chunk) yield chunk;
      } catch {}
    }
  }
}

async function* geminiStream(messages, config) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?key=${config.apiKey}&alt=sse`;
  const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: config.systemPrompt }] } }),
  });
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const j = JSON.parse(line.slice(6));
        const chunk = j.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (chunk) yield chunk;
      } catch {}
    }
  }
}

async function* openCodeStream(messages, config) {
  const lastMsg = messages[messages.length - 1]?.content || '';
  const out = await invoke('run_command', { command: `opencode "${lastMsg.replace(/"/g, '\\"')}"`, cwd: config.cwd });
  yield out;
}

async function* localLLMStream(messages, config) {
  const endpoint = (config.apiKey || 'http://localhost:11434') + '/api/generate';
  const prompt = [config.systemPrompt, ...messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)].join('\n\n') + '\n\nAssistant:';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, prompt, stream: true }),
  });
  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const j = JSON.parse(line);
        if (j.response) yield j.response;
        if (j.done) return;
      } catch {}
    }
  }
}

const PROVIDERS = { claude: claudeStream, openai: openAIStream, gemini: geminiStream, opencode: openCodeStream, local: localLLMStream };

// ─── LOAD/SAVE CONFIG ────────────────────────────────────────
const loadAIConfig = () => {
  try { return { provider: 'claude', model: 'claude-sonnet-4-6', apiKeys: {}, ollamaEndpoint: 'http://localhost:11434', ollamaModel: 'llama3', ...JSON.parse(localStorage.getItem('plexus-ai-config') || '{}') }; }
  catch { return { provider: 'claude', model: 'claude-sonnet-4-6', apiKeys: {}, ollamaEndpoint: 'http://localhost:11434', ollamaModel: 'llama3' }; }
};

// ─── CODE BLOCK RENDERER ─────────────────────────────────────
const CodeBlock = ({ code, lang, onApply }) => (
  <div style={{ position: 'relative', margin: '8px 0' }}>
    <pre className="ai-code-block"><code>{code}</code></pre>
    <button className="ai-apply-btn" onClick={() => onApply(code)} title="Apply to editor">
      <Check size={11} /> Apply
    </button>
  </div>
);

const renderMessage = (content, onApply) => {
  const parts = [];
  const codeBlockRe = /```(\w*)\n([\s\S]*?)```/g;
  let lastIdx = 0, match;
  while ((match = codeBlockRe.exec(content)) !== null) {
    if (match.index > lastIdx) parts.push({ type: 'text', text: content.slice(lastIdx, match.index) });
    parts.push({ type: 'code', lang: match[1], code: match[2] });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < content.length) parts.push({ type: 'text', text: content.slice(lastIdx) });

  return parts.map((p, i) =>
    p.type === 'code'
      ? <CodeBlock key={i} code={p.code} lang={p.lang} onApply={onApply} />
      : <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{p.text}</span>
  );
};

// ─── AI PANEL ────────────────────────────────────────────────
const AIPanel = ({ activeTab, editorRef }) => {
  const [config, setConfig] = useState(loadAIConfig);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const abortRef = useRef(null);
  const messagesEndRef = useRef(null);
  const genId = () => Math.random().toString(36).slice(2, 11);

  useEffect(() => {
    try { localStorage.setItem('plexus-ai-config', JSON.stringify(config)); } catch {}
  }, [config]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const applyToEditor = useCallback((code) => {
    const editor = editorRef?.current;
    if (!editor) return;
    const sel = editor.getSelection();
    if (sel && !sel.isEmpty()) {
      editor.executeEdits('ai', [{ range: sel, text: code }]);
    } else {
      const pos = editor.getPosition();
      editor.executeEdits('ai', [{
        range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column },
        text: '\n' + code,
      }]);
    }
    editor.focus();
  }, [editorRef]);

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = { id: genId(), role: 'user', content: input };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setStreaming(true);
    const aId = genId();
    setMessages(prev => [...prev, { id: aId, role: 'assistant', content: '' }]);

    const meta = PROVIDER_META[config.provider];
    const providerConfig = {
      apiKey: config.provider === 'local' ? (config.ollamaEndpoint || 'http://localhost:11434') : (config.apiKeys[config.provider] || ''),
      model: config.provider === 'local' ? (config.ollamaModel || meta.defaultModel) : (config.model || meta.defaultModel),
      systemPrompt: buildSystemPrompt(activeTab?.content, activeTab?.name, activeTab?.language),
      cwd: activeTab?.filePath ? activeTab.filePath.split('/').slice(0, -1).join('/') : undefined,
    };

    try {
      abortRef.current = new AbortController();
      const providerFn = PROVIDERS[config.provider] || claudeStream;
      for await (const chunk of providerFn(history, providerConfig)) {
        if (abortRef.current?.signal.aborted) break;
        setMessages(prev => prev.map(m => m.id === aId ? { ...m, content: m.content + chunk } : m));
      }
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === aId ? { ...m, content: `⚠️ Error: ${e.message}` } : m));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stopStreaming = () => { abortRef.current?.abort(); setStreaming(false); };
  const clearChat = () => setMessages([]);

  const meta = PROVIDER_META[config.provider] || PROVIDER_META.claude;

  return (
    <div className="ai-panel">
      {/* Config Bar */}
      <div className="ai-config-bar">
        <select className="ai-provider-select" value={config.provider} onChange={e => setConfig(c => ({ ...c, provider: e.target.value, model: PROVIDER_META[e.target.value]?.defaultModel || '' }))}>
          {Object.entries(PROVIDER_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {meta.models.length > 1 && (
          <select className="ai-model-select" value={config.model} onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}>
            {meta.models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        <button className={`ai-config-toggle ${showConfig ? 'active' : ''}`} onClick={() => setShowConfig(v => !v)} title="Settings">
          <Settings size={13} />
        </button>
        <button className="ai-config-toggle" onClick={clearChat} title="Clear chat"><RefreshCw size={13} /></button>
      </div>

      {/* API Key Config */}
      {showConfig && (
        <div className="ai-config-panel">
          {meta.needsKey && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{meta.keyLabel}</div>
              <input
                className="explorer-search-input"
                type="password"
                value={config.apiKeys[config.provider] || ''}
                onChange={e => setConfig(c => ({ ...c, apiKeys: { ...c.apiKeys, [c.provider]: e.target.value } }))}
                placeholder={meta.keyPlaceholder}
                style={{ fontSize: 11 }}
              />
            </div>
          )}
          {config.provider === 'local' && (
            <>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Endpoint</div>
                <input className="explorer-search-input" value={config.ollamaEndpoint || ''} onChange={e => setConfig(c => ({ ...c, ollamaEndpoint: e.target.value }))} placeholder="http://localhost:11434" style={{ fontSize: 11 }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Model</div>
                <input className="explorer-search-input" value={config.ollamaModel || ''} onChange={e => setConfig(c => ({ ...c, ollamaModel: e.target.value }))} placeholder="llama3" style={{ fontSize: 11 }} />
              </div>
            </>
          )}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
            The AI can read your current file as context and apply code changes directly to the editor.
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="ai-messages">
        {messages.length === 0 && (
          <div className="ai-empty">
            <Code2 size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
            <div>Ask me anything about your code</div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>I can see your current file and apply changes directly</div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`ai-message ${msg.role}`}>
            <div className="ai-message-role">{msg.role === 'user' ? 'You' : meta.label}</div>
            <div className="ai-message-body">
              {msg.content ? renderMessage(msg.content, applyToEditor) : (
                streaming && msg.role === 'assistant' ? <span className="ai-typing-cursor">▊</span> : null
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="ai-input-bar">
        <textarea
          className="ai-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Ask ${meta.label}… (Enter to send, Shift+Enter for newline)`}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
          }}
          rows={1}
          style={{ resize: 'none' }}
        />
        <button
          className={`ai-send-btn ${streaming ? 'stop' : ''}`}
          onClick={streaming ? stopStreaming : sendMessage}
          disabled={!streaming && !input.trim()}
          title={streaming ? 'Stop' : 'Send (Enter)'}
        >
          {streaming ? <Square size={14} /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
};

export default AIPanel;
