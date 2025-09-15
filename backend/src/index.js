require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('./prisma');   // shared prisma client

const app = express();
app.use(express.json());

/* ------------------------
   ✅ CORS Middleware
------------------------ */
const allowedOrigins = [
  "http://localhost:5173",
  "https://saas-note-ste7.vercel.app"
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

/* ------------------------
   ✅ DB Connection Test
------------------------ */
prisma.$connect()
  .then(() => console.log("✅ DB Connected successfully"))
  .catch((err) => {
    console.error("❌ DB Connection failed:", err.message);
  });

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const PORT = process.env.PORT || 4000;

/* ------------------------
   ✅ Health Route
------------------------ */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* ------------------------
   ✅ Auth - Login
------------------------ */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = jwt.sign(
      { sub: user.id, role: user.role, tenant: user.tenant.slug },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, tenant: user.tenant.slug }
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "server error" });
  }
});

/* ------------------------
   ✅ Middleware
------------------------ */
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing authorization' });

  const parts = auth.split(' ');
  if (parts.length !== 2)
    return res.status(401).json({ error: 'invalid authorization header' });

  try {
    const payload = jwt.verify(parts[1], JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, tenant: payload.tenant };
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

/* ------------------------
   ✅ Notes CRUD
------------------------ */
app.get('/api/notes', authMiddleware, async (req, res) => {
  try {
    const notes = await prisma.note.findMany({
      where: { tenant: { slug: req.user.tenant } }
    });
    res.json(notes);
  } catch (err) {
    console.error("❌ Notes fetch error:", err.message);
    res.status(500).json({ error: "server error" });
  }
});

app.post('/api/notes', authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "title and content required" });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: req.user.tenant },
      include: { notes: true }
    });

    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    // ✅ Free Plan Limit
    if (tenant.plan === 'free' && tenant.notes.length >= 3) {
      return res.status(403).json({ error: "Note limit reached. Upgrade to Pro." });
    }

    const note = await prisma.note.create({
      data: {
        title,
        content,
        tenant: { connect: { id: tenant.id } },
        owner: { connect: { id: req.user.id } }
      }
    });

    res.json(note);
  } catch (err) {
    console.error("❌ Note create error:", err);
    res.status(500).json({ error: "failed to create note" });
  }
});

app.put('/api/notes/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const note = await prisma.note.update({
      where: { id },
      data: { title, content }
    });

    res.json(note);
  } catch (err) {
    console.error("❌ Note update error:", err.message);
    res.status(500).json({ error: "failed to update note" });
  }
});

app.delete('/api/notes/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.note.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Note delete error:", err.message);
    res.status(500).json({ error: "failed to delete note" });
  }
});

/* ------------------------
   ✅ Upgrade Tenant Plan (Admin Only)
------------------------ */
app.post('/api/tenants/:slug/upgrade', authMiddleware, async (req, res) => {
  try {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Only admins can upgrade tenant plan' });
    }

    const { slug } = req.params;
    const tenant = await prisma.tenant.update({
      where: { slug },
      data: { plan: 'pro' }
    });

    res.json({ message: "Tenant upgraded to Pro", tenant });
  } catch (err) {
    console.error("❌ Upgrade error:", err.message);
    res.status(500).json({ error: "failed to upgrade tenant" });
  }
});

/* ------------------------
   ✅ Invite User (Admin Only)
------------------------ */
app.post('/api/tenants/:slug/invite', authMiddleware, async (req, res) => {
  try {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Only admins can invite users' });
    }

    const { slug } = req.params;
    const { email, role = 'member' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email required' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const passwordHash = await bcrypt.hash('password', 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role.toLowerCase(),
        tenant: { connect: { id: tenant.id } }
      }
    });

    res.json({
      message: 'User invited successfully',
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error("❌ Invite error:", err);
    res.status(500).json({ error: 'failed to invite user' });
  }
});

/* ------------------------
   ✅ Export for Vercel
------------------------ */
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
