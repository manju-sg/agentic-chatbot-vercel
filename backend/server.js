const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

dotenv.config();

const AgentBrowser = require('./browser');
const TaskExecutor = require('./agent');

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/screenshots', express.static(path.join(__dirname, 'public', 'screenshots'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  },
}));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'local-laptop-backend',
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

function getPublicBaseUrl(socket) {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  }

  const forwardedProto = socket.handshake.headers['x-forwarded-proto'];
  const host = socket.handshake.headers['x-forwarded-host'] || socket.handshake.headers.host;
  const protocol = forwardedProto || (host && host.includes('localhost') ? 'http' : 'https');

  return host ? `${protocol}://${host}` : `http://localhost:${PORT}`;
}

function normalizeTaskEvent(payload, fallbackType, socket) {
  if (typeof payload === 'string') {
    return {
      kind: fallbackType === 'error' ? 'error' : 'step',
      message: payload,
      timestamp: new Date().toISOString(),
    };
  }

  const event = {
    kind: payload.kind || fallbackType || 'step',
    message: payload.message || '',
    timestamp: payload.timestamp || new Date().toISOString(),
    ...payload,
  };

  if (event.screenshotPath && !event.screenshotUrl) {
    const baseUrl = getPublicBaseUrl(socket);
    event.screenshotUrl = `${baseUrl}/${String(event.screenshotPath).replace(/^\/+/, '')}`;
  }

  return event;
}

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  let browser = null;
  let agentInstance = null;
  let resolveHumanWait = null;

  socket.on('cancel_task', () => {
    if (!agentInstance) {
      return;
    }

    agentInstance.abort();
    socket.emit('task_event', normalizeTaskEvent({
      kind: 'error',
      message: 'Task terminated by user.',
    }, 'error', socket));
    socket.emit('task_complete', { reason: 'terminated' });
  });

  socket.on('human_input', (data) => {
    if (!resolveHumanWait) {
      return;
    }

    socket.emit('task_event', normalizeTaskEvent({
      kind: 'step',
      message: 'Human input received. Resuming the workflow...',
    }, 'step', socket));
    resolveHumanWait(data.input);
    resolveHumanWait = null;
  });

  socket.on('start_task', async (data) => {
    const { task } = data;
    socket.emit('task_event', normalizeTaskEvent({
      kind: 'step',
      message: 'Initializing task...',
    }, 'step', socket));

    try {
      browser = new AgentBrowser();
      agentInstance = new TaskExecutor(
        (payload, type = 'info') => {
          socket.emit('task_event', normalizeTaskEvent(payload, type, socket));
        },
        async (question) =>
          new Promise((resolve) => {
            socket.emit('task_event', normalizeTaskEvent({
              kind: 'human',
              message: question,
            }, 'human', socket));
            socket.emit('require_human', { message: question });
            resolveHumanWait = resolve;
          })
      );

      socket.emit('task_event', normalizeTaskEvent({
        kind: 'step',
        message: 'Agent loop started.',
      }, 'step', socket));
      await agentInstance.runLoop(browser, task);
      socket.emit('task_complete');
    } catch (error) {
      console.error(error);
      socket.emit('task_event', normalizeTaskEvent({
        kind: 'error',
        message: `Error: ${error.message}`,
      }, 'error', socket));
      socket.emit('task_complete', { reason: 'error' });
    }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
