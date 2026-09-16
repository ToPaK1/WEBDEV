const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-webdev-secret';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@webdev.local').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'webdev.json');

app.use(cors());
app.use(express.json({ limit: '100kb' }));

function ensureDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], messages: [], projects: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored).split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function base64Url(value) {
  return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createToken(payload) {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 1000 * 60 * 60 * 24 * 7 }));
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function readToken(token) {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function auth(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : '';
  const user = readToken(token);
  if (!user) return res.status(401).json({ message: 'Authentication required.' });
  req.user = user;
  next();
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
  next();
}

ensureDb();

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'WEBDEV API' }));

app.post('/api/auth/signup', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!name || !email || password.length < 6) return res.status(400).json({ message: 'Name, valid email and 6+ character password are required.' });

  const db = readDb();
  if (db.users.some(user => user.email === email)) return res.status(409).json({ message: 'An account with this email already exists.' });
  const user = { id: crypto.randomUUID(), name, email, passwordHash: hashPassword(password), role: 'customer', createdAt: new Date().toISOString() };
  db.users.push(user);
  writeDb(db);
  const token = createToken({ sub: user.id, name: user.name, email: user.email, role: user.role });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const admin = { id: 'admin', name: 'WEBDEV Admin', email: ADMIN_EMAIL, role: 'admin' };
    return res.json({ token: createToken({ sub: admin.id, name: admin.name, email: admin.email, role: admin.role }), user: admin });
  }

  const db = readDb();
  const user = db.users.find(item => item.email === email && verifyPassword(password, item.passwordHash));
  if (!user) return res.status(401).json({ message: 'Invalid email or password.' });
  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ token: createToken({ sub: user.id, name: user.name, email: user.email, role: user.role }), user: safeUser });
});

app.post('/api/contact', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const message = String(req.body?.message || '').trim();
  if (!name || !email || message.length < 10) return res.status(400).json({ message: 'Please provide your name, email and project details.' });
  const db = readDb();
  const item = { id: crypto.randomUUID(), name, email, message, status: 'new', createdAt: new Date().toISOString() };
  db.messages.unshift(item);
  writeDb(db);
  console.log(`New WEBDEV contact from ${name} <${email}>`);
  res.status(201).json({ message: 'Your message has been received.', id: item.id });
});

app.get('/api/admin/dashboard', auth, adminOnly, (_req, res) => {
  const db = readDb();
  res.json({
    stats: { customers: db.users.length, messages: db.messages.length, unreadMessages: db.messages.filter(item => item.status === 'new').length },
    customers: db.users.map(({ id, name, email, role, createdAt }) => ({ id, name, email, role, createdAt })),
    messages: db.messages
  });
});

app.patch('/api/admin/messages/:id', auth, adminOnly, (req, res) => {
  const db = readDb();
  const message = db.messages.find(item => item.id === req.params.id);
  if (!message) return res.status(404).json({ message: 'Message not found.' });
  message.status = req.body?.status === 'read' ? 'read' : 'new';
  writeDb(db);
  res.json(message);
});

app.get('/api/admin/projects', auth, adminOnly, (_req, res) => {
  const db = readDb();
  res.json(db.projects);
});

app.post('/api/admin/projects', auth, adminOnly, (req, res) => {
  const db = readDb();
  const project = { id: crypto.randomUUID(), title: String(req.body?.title || '').trim(), type: String(req.body?.type || '').trim(), url: String(req.body?.url || '').trim() };
  if (!project.title) return res.status(400).json({ message: 'Project title is required.' });
  db.projects.push(project);
  writeDb(db);
  res.status(201).json(project);
});

app.listen(PORT, () => {
  console.log(`WEBDEV API running on http://localhost:${PORT}`);
  console.log(`Admin email: ${ADMIN_EMAIL}`);
  console.log('Set ADMIN_PASSWORD and JWT_SECRET in .env/environment before production use.');
});
