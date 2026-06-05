import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  AlertCircle,
  ArrowUp,
  Bot,
  CheckCircle2,
  Clock3,
  Command,
  Image as ImageIcon,
  LoaderCircle,
  Menu,
  Monitor,
  PanelLeftClose,
  Sparkles,
  Square,
  User,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import './index.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const STARTERS = [
  'Open Chrome',
  'YouTube search for lofi coding music',
  'Ask ChatGPT write a short status update for today',
  'System status',
];

const isLocalBackendUrl = (url) => {
  try {
    const parsed = new URL(url);
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
};

const buildAbsoluteUrl = (base, path) => {
  if (!path) {
    return '';
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${String(base).replace(/\/$/, '')}/${String(path).replace(/^\/+/, '')}`;
};

const normalizeEvent = (event) => {
  const screenshotPath = event.screenshotPath || '';
  const screenshotDataUrl = event.screenshotDataUrl || event.screenshotPreviewUrl || '';
  const screenshotUrl =
    event.screenshotUrl ||
    (screenshotPath ? `${buildAbsoluteUrl(BACKEND_URL, screenshotPath)}?ts=${Date.now()}` : '');

  return {
    ...event,
    screenshotPath,
    screenshotDataUrl,
    screenshotUrl,
  };
};

const formatClock = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);

const formatEventLabel = (kind) => {
  const labels = {
    step: 'Step',
    result: 'Result',
    screenshot: 'Screenshot',
    human: 'Action needed',
    error: 'Error',
    summary: 'Summary',
  };

  return labels[kind] || 'Update';
};

const getEventIcon = (kind) => {
  switch (kind) {
    case 'result':
    case 'summary':
      return <CheckCircle2 size={15} />;
    case 'screenshot':
      return <ImageIcon size={15} />;
    case 'human':
    case 'error':
      return <AlertCircle size={15} />;
    default:
      return <Clock3 size={15} />;
  }
};

function EventTimeline({ events, live = false }) {
  return (
    <div className={`timeline ${live ? 'live' : ''}`}>
      {events.map((event, index) => (
        <article key={event.id || `${event.kind}-${index}`} className={`timeline-item kind-${event.kind}`}>
          <div className="timeline-marker">{getEventIcon(event.kind)}</div>
          <div className="timeline-body">
            <div className="timeline-meta">
              <span>{formatEventLabel(event.kind)}</span>
              <time>{formatClock(new Date(event.timestamp))}</time>
            </div>
            <p className="timeline-text">{event.message}</p>

            {event.screenshotDataUrl || event.screenshotUrl ? (
              <figure className="timeline-shot">
                <ScreenshotImage event={event} />
                <figcaption>Live screenshot from your laptop</figcaption>
              </figure>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function ScreenshotImage({ event }) {
  const [imageSrc, setImageSrc] = useState(event.screenshotDataUrl || '');
  const [hasError, setHasError] = useState(false);
  const inlineSrc = event.screenshotDataUrl || imageSrc;

  useEffect(() => {
    let isActive = true;

    const loadScreenshot = async () => {
      try {
        setHasError(false);

        if (event.screenshotDataUrl) {
          if (isActive) {
            setImageSrc(event.screenshotDataUrl);
          }
          return;
        }

        if (isLocalBackendUrl(BACKEND_URL)) {
          if (isActive) {
            setImageSrc(event.screenshotUrl);
          }
          return;
        }

        const response = await fetch(event.screenshotUrl, {
          headers: {
            'ngrok-skip-browser-warning': '1',
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Screenshot request failed with ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
          throw new Error(`Expected image response, received ${contentType || 'unknown content type'}`);
        }

        const blob = await response.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to read screenshot blob.'));
          reader.readAsDataURL(blob);
        });

        if (isActive) {
          setImageSrc(String(dataUrl));
        }
      } catch (error) {
        if (isActive) {
          setHasError(true);
        }
      }
    };

    loadScreenshot();

    return () => {
      isActive = false;
    };
  }, [event.screenshotDataUrl, event.screenshotUrl]);

  if (hasError) {
    return (
      <div className="timeline-shot-fallback">
        <p>Screenshot could not be loaded inline.</p>
        <a href={event.screenshotUrl} target="_blank" rel="noreferrer">
          Open screenshot directly
        </a>
      </div>
    );
  }

  if (!inlineSrc) {
    return (
      <div className="timeline-shot-loading">
        <LoaderCircle size={18} className="spin" />
        <span>Loading screenshot...</span>
      </div>
    );
  }

  return (
    <a
      href={event.screenshotUrl || imageSrc}
      target="_blank"
      rel="noreferrer"
        className="timeline-shot-link"
    >
      <img
        src={inlineSrc}
        alt={event.message || 'Execution screenshot'}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </a>
  );
}

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);
  const [isWorking, setIsWorking] = useState(false);
  const [humanPrompt, setHumanPrompt] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastCompletedAt, setLastCompletedAt] = useState(null);
  const [totalScreenshots, setTotalScreenshots] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const socketRef = useRef(null);
  const activeEventsRef = useRef([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    activeEventsRef.current = activeEvents;
  }, [activeEvents]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = '0px';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, activeEvents, humanPrompt]);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleTaskEvent = (event) => {
      const normalized = normalizeEvent({
        ...event,
        id: event.id || crypto.randomUUID(),
      });

      setActiveEvents((prev) => {
        const nextEvents = [...prev, normalized];
        activeEventsRef.current = nextEvents;
        return nextEvents;
      });

      if (normalized.screenshotDataUrl || normalized.screenshotUrl) {
        setTotalScreenshots((prev) => prev + 1);
      }

      if (normalized.kind === 'screenshot' && (normalized.screenshotDataUrl || normalized.screenshotUrl)) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: 'assistant',
            text: normalized.message || 'Captured a screenshot from the laptop.',
            events: [normalized],
            time: new Date(normalized.timestamp || Date.now()),
          },
        ]);
      }

      if (normalized.kind === 'human') {
        setHumanPrompt(normalized.message);
      }

      if (normalized.kind === 'error') {
        setHumanPrompt(null);
      }
    };

    const handleHumanPrompt = (data) => {
      setHumanPrompt(data.message);
    };

    const handleTaskComplete = (data) => {
      const events = [...activeEventsRef.current];
      const hasError = data?.reason === 'error' || events.some((event) => event.kind === 'error');
      const completionText =
        data?.reason === 'terminated'
          ? 'Task stopped before completion.'
          : hasError
            ? 'Task ended with an error.'
            : 'Task completed on your laptop.';

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: 'assistant',
          text: completionText,
          events,
          time: new Date(),
        },
      ]);
      setActiveEvents([]);
      setHumanPrompt(null);
      setIsWorking(false);
      setLastCompletedAt(new Date());
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('task_event', handleTaskEvent);
    socket.on('require_human', handleHumanPrompt);
    socket.on('task_complete', handleTaskComplete);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('task_event', handleTaskEvent);
      socket.off('require_human', handleHumanPrompt);
      socket.off('task_complete', handleTaskComplete);
      socket.disconnect();
    };
  }, []);

  const helperLabel = useMemo(() => {
    if (humanPrompt) {
      return 'A manual action is needed on the laptop before the task can continue.';
    }

    if (isWorking) {
      return 'The backend is still working. Live steps and screenshots will appear below.';
    }

    if (lastCompletedAt) {
      return `Last finished at ${formatClock(lastCompletedAt)}.`;
    }

    return 'Send a prompt and watch the laptop execution timeline update in real time.';
  }, [humanPrompt, isWorking, lastCompletedAt]);

  const appendUserMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'user',
        text,
        time: new Date(),
      },
    ]);
  };

  const submitPrompt = (event) => {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || !socketRef.current) {
      return;
    }

    if (humanPrompt) {
      appendUserMessage(trimmed);
      socketRef.current.emit('human_input', { input: trimmed });
      setHumanPrompt(null);
      setInput('');
      return;
    }

    if (isWorking) {
      return;
    }

    appendUserMessage(trimmed);
    setActiveEvents([]);
    setIsWorking(true);
    setSidebarOpen(false);
    socketRef.current.emit('start_task', { task: trimmed });
    setInput('');
  };

  const stopTask = () => {
    socketRef.current?.emit('cancel_task');
  };

  return (
    <div className="shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      {sidebarOpen ? <button className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" /> : null}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="sidebar-label">Remote laptop workspace</p>
            <h1>Agentic Chat</h1>
          </div>
          <button className="sidebar-close mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Hide sidebar">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-card primary">
          <p className="chat-label sidebar-eyebrow">Professional remote control</p>
          <h2 className="sidebar-hero-title">Execution steps, screenshots, and results in one conversation</h2>
        </div>

        <div className="sidebar-card status-stack">
          <div className="sidebar-card-title">
            <Monitor size={16} />
            <span>{isConnected ? 'Backend online' : 'Backend offline'}</span>
          </div>
          <div className="metric-list">
            <div className="metric-inline">
              <span className="metric-label">Mode</span>
              <strong>Live laptop execution</strong>
            </div>
            <div className="metric-inline">
              <span className="metric-label">Timeline events</span>
              <strong>{messages.reduce((sum, message) => sum + (message.events?.length || 0), 0) + activeEvents.length}</strong>
            </div>
            <div className="metric-inline">
              <span className="metric-label">Screenshots</span>
              <strong>{totalScreenshots}</strong>
            </div>
          </div>
          <code>{BACKEND_URL}</code>
        </div>

        <div className="sidebar-card">
          <div className="sidebar-card-title">
            <Command size={16} />
            <span>Starter prompts</span>
          </div>
          <div className="starter-list">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                className="starter-chip"
                onClick={() => {
                  setInput(starter);
                  setSidebarOpen(false);
                }}
              >
                {starter}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="chat-panel">
        <header className="chat-header glass">
          <div className="header-actions">
            <button className="sidebar-toggle" onClick={() => setSidebarOpen((prev) => !prev)} aria-label="Toggle sidebar">
              {sidebarOpen ? <PanelLeftClose size={18} /> : <Menu size={18} />}
            </button>
          </div>
          <div>
            <p className="chat-label">Agentic Chat</p>
            <h2>Talk to your laptop</h2>
          </div>

          <div className={`connection-pill ${isConnected ? 'online' : 'offline'}`}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isConnected ? 'Backend online' : 'Backend offline'}</span>
          </div>
        </header>

        <section className="chat-stream">
          {messages.length === 0 && !isWorking ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Bot size={24} />
              </div>
              <h3>Start a task</h3>
            </div>
          ) : null}

          {messages.map((message) => (
            <article key={message.id} className={`message-row ${message.type}`}>
              <div className="avatar">{message.type === 'user' ? <User size={15} /> : <Bot size={15} />}</div>
              <div className={`bubble glass ${message.type === 'assistant' ? 'assistant-report' : ''}`}>
                <div className="bubble-meta">
                  <span>{message.type === 'user' ? 'You' : 'Agent'}</span>
                  <time>{formatClock(message.time)}</time>
                </div>
                <p className="bubble-text">{message.text}</p>

                {message.events?.length ? <EventTimeline events={message.events} /> : null}
              </div>
            </article>
          ))}

          {isWorking ? (
            <article className="message-row assistant working">
              <div className="avatar">
                {humanPrompt ? <AlertCircle size={15} /> : <LoaderCircle size={15} className="spin" />}
              </div>
              <div className="bubble glass assistant-report live-report">
                <div className="bubble-meta">
                  <span>{humanPrompt ? 'Action needed' : 'Live execution'}</span>
                  <time>{formatClock(new Date())}</time>
                </div>
                <p className="bubble-text">
                  {humanPrompt
                    ? humanPrompt
                    : 'The laptop backend is executing your request. New steps and screenshots appear below as they happen.'}
                </p>

                {activeEvents.length ? <EventTimeline events={activeEvents} live /> : null}
              </div>
            </article>
          ) : null}

          <div ref={messagesEndRef} />
        </section>

        {!messages.length && !isWorking ? (
          <div className={`status-bar glass ${humanPrompt ? 'warning' : ''}`}>
            <span className="status-dot" />
            <p>{helperLabel}</p>
          </div>
        ) : null}

        <form className="composer" onSubmit={submitPrompt}>
          <div className={`composer-shell glass ${humanPrompt ? 'needs-reply' : ''}`}>
            <textarea
              ref={textareaRef}
              rows="1"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                humanPrompt
                  ? 'Reply after completing the required action on the laptop...'
                  : 'Describe what the laptop should do next...'
              }
              disabled={isWorking && !humanPrompt}
            />
          </div>

          {isWorking && !humanPrompt ? (
            <button type="button" className="composer-button stop" onClick={stopTask}>
              <Square size={16} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              className="composer-button send"
              disabled={!input.trim() || (!isConnected && !humanPrompt)}
            >
              <ArrowUp size={16} />
              <span>{humanPrompt ? 'Reply' : 'Send'}</span>
            </button>
          )}
        </form>
      </main>
    </div>
  );
}

export default App;
