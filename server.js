const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-webdev-secret';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@webdev.local').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const MAIL_USER = (process.env.MAIL_USER || '').trim();
const MAIL_APP_PASSWORD = (process.env.MAIL_APP_PASSWORD || '').trim().replace(/\s/g, '');
const CONTACT_TO = (process.env.CONTACT_TO || 'm3asbhomelkeber2@gmail.com').trim();
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'webdev.json');
const rateBuckets = new Map();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); next(); });

function rateLimit({ windowMs = 15 * 60 * 1000, max = 20 } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`; const now = Date.now(); const bucket = rateBuckets.get(key) || { start: now, count: 0 };
    if (now - bucket.start >= windowMs) { bucket.start = now; bucket.count = 0; }
    bucket.count += 1; rateBuckets.set(key, bucket);
    if (bucket.count > max) return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    next();
  };
}
function ensureDb() { if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true }); if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], messages: [], projects: [] }, null, 2)); }
function readDb() { ensureDb(); try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { return { users: [], messages: [], projects: [] }; } }
function writeDb(db) { ensureDb(); const tempFile = `${DB_FILE}.tmp`; fs.writeFileSync(tempFile, JSON.stringify(db, null, 2)); fs.renameSync(tempFile, DB_FILE); }
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) { const hash = crypto.scryptSync(password, salt, 64).toString('hex'); return `${salt}:${hash}`; }
function verifyPassword(password, stored) { try { const [salt, expected] = String(stored).split(':'); if (!salt || !expected) return false; const actual = crypto.scryptSync(password, salt, 64).toString('hex'); const expectedBuffer = Buffer.from(expected, 'hex'); const actualBuffer = Buffer.from(actual, 'hex'); return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer); } catch { return false; } }
function base64Url(value) { return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function createToken(payload) { const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' })); const body = base64Url(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })); const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url'); return `${header}.${body}.${signature}`; }
function readToken(token) { try { const [header, body, signature] = token.split('.'); if (!header || !body || !signature) return null; const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url'); const signatureBuffer = Buffer.from(signature); const expectedBuffer = Buffer.from(expected); if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null; const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); if (!payload.exp || payload.exp < Date.now()) return null; return payload; } catch { return null; } }
function auth(req, res, next) { const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : ''; const user = readToken(token); if (!user) return res.status(401).json({ message: 'Authentication required.' }); req.user = user; next(); }
function adminOnly(req, res, next) { if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' }); next(); }

const mailer = MAIL_USER && MAIL_APP_PASSWORD ? nodemailer.createTransport({ service: 'gmail', auth: { user: MAIL_USER, pass: MAIL_APP_PASSWORD } }) : null;

async function sendContactEmail({ name, email, business, message }) {
  if (!mailer) throw new Error('Contact email is not configured. Set MAIL_USER and MAIL_APP_PASSWORD in .env.');
  await mailer.sendMail({
    from: `WEBDEV Portfolio <${MAIL_USER}>`,
    to: CONTACT_TO,
    replyTo: email,
    subject: `New WEBDEV inquiry — ${business || 'Website project'} — ${name}`,
    text: `New website inquiry\n\nName: ${name}\nEmail: ${email}\nBusiness type: ${business || 'Not specified'}\n\nMessage:\n${message}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><h2>New WEBDEV inquiry</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Business type:</strong> ${escapeHtml(business || 'Not specified')}</p><hr><p><strong>Message:</strong></p><p style="white-space:pre-wrap">${escapeHtml(message)}</p></div>`
  });
}
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }

ensureDb();
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'WEBDEV API', timestamp: new Date().toISOString(), emailConfigured: Boolean(mailer) }));
app.post('/api/auth/signup', rateLimit({ max: 8 }), (req, res) => {
  const name = String(req.body?.name || '').trim(); const email = String(req.body?.email || '').trim().toLowerCase(); const password = String(req.body?.password || '');
  if (name.length < 2 || name.length > 80 || !isValidEmail(email) || password.length < 6 || password.length > 128) return res.status(400).json({ message: 'Enter a valid name, email and a 6-128 character password.' });
  const db = readDb(); if (db.users.some(user => user.email === email)) return res.status(409).json({ message: 'An account with this email already exists.' });
  const user = { id: crypto.randomUUID(), name, email, passwordHash: hashPassword(password), role: 'customer', createdAt: new Date().toISOString() }; db.users.push(user); writeDb(db);
  const token = createToken({ sub: user.id, name: user.name, email: user.email, role: user.role }); res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
app.post('/api/auth/login', rateLimit({ max: 10 }), (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase(); const password = String(req.body?.password || ''); if (!isValidEmail(email) || !password) return res.status(400).json({ message: 'Email and password are required.' });
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) { const admin = { id: 'admin', name: 'WEBDEV Admin', email: ADMIN_EMAIL, role: 'admin' }; return res.json({ token: createToken({ sub: admin.id, name: admin.name, email: admin.email, role: admin.role }), user: admin }); }
  const db = readDb(); const user = db.users.find(item => item.email === email && verifyPassword(password, item.passwordHash)); if (!user) return res.status(401).json({ message: 'Invalid email or password.' });
  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role }; res.json({ token: createToken({ sub: user.id, name: user.name, email: user.email, role: user.role }), user: safeUser });
});
app.post('/api/contact', rateLimit({ max: 6 }), async (req, res) => {
  const name = String(req.body?.name || '').trim(); const email = String(req.body?.email || '').trim().toLowerCase(); const business = String(req.body?.business || '').trim(); const message = String(req.body?.message || '').trim();
  if (name.length < 2 || name.length > 80 || !isValidEmail(email) || business.length > 80 || message.length < 10 || message.length > 5000) return res.status(400).json({ message: 'Please provide a valid name, email, business type and project details (10-5000 characters).' });
  const db = readDb(); const item = { id: crypto.randomUUID(), name, email, business, message, status: 'new', createdAt: new Date().toISOString() }; db.messages.unshift(item); writeDb(db);
  try {
    await sendContactEmail({ name, email, business, message });
    console.log(`New WEBDEV contact emailed to ${CONTACT_TO} from ${name} <${email}>`);
    return res.status(201).json({ message: 'Your message has been sent successfully.', id: item.id });
  } catch (error) {
    console.error('Contact email failed:', error.message);
    return res.status(503).json({ message: 'Your message was saved, but the email could not be sent. Check the mail settings and try again.' });
  }
});
app.get('/api/admin/dashboard', auth, adminOnly, (_req, res) => { const db = readDb(); res.json({ stats: { customers: db.users.length, messages: db.messages.length, unreadMessages: db.messages.filter(item => item.status === 'new').length }, customers: db.users.map(({ id, name, email, role, createdAt }) => ({ id, name, email, role, createdAt })), messages: db.messages }); });
app.patch('/api/admin/messages/:id', auth, adminOnly, (req, res) => { const db = readDb(); const message = db.messages.find(item => item.id === req.params.id); if (!message) return res.status(404).json({ message: 'Message not found.' }); message.status = req.body?.status === 'read' ? 'read' : 'new'; writeDb(db); res.json(message); });
app.get('/api/admin/projects', auth, adminOnly, (_req, res) => { const db = readDb(); res.json(db.projects); });
app.post('/api/admin/projects', auth, adminOnly, (req, res) => { const title = String(req.body?.title || '').trim(); const type = String(req.body?.type || '').trim(); const url = String(req.body?.url || '').trim(); if (!title || title.length > 120) return res.status(400).json({ message: 'Project title is required and must be under 120 characters.' }); if (url && !/^https?:\/\//i.test(url)) return res.status(400).json({ message: 'Project URL must start with http:// or https://.' }); const db = readDb(); const project = { id: crypto.randomUUID(), title, type: type.slice(0, 80), url }; db.projects.push(project); writeDb(db); res.status(201).json(project); });
app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ message: 'Internal server error.' }); });
app.listen(PORT, () => { console.log(`WEBDEV API running on http://localhost:${PORT}`); console.log(`Admin email: ${ADMIN_EMAIL}`); console.log(`Contact email target: ${CONTACT_TO}`); console.log(`Contact email configured: ${Boolean(mailer)}`); console.log('Set ADMIN_PASSWORD, JWT_SECRET and MAIL_APP_PASSWORD in .env/environment before production use.'); });
