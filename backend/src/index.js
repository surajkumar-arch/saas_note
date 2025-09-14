require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('./prisma');   // ✅ use shared prisma client

const app = express();

/* ------------------------
   ✅ CORS Middleware
------------------------ */
const allowedOrigins = [
  "http://localhost:5173",
  "https://saas-note-ste7.vercel.app",
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

app.use(express.json());

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
    if (!email || !password)
      return res.status(400).json({ error: 'email and password required' });

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

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, tenant: user.tenant.slug }
    });
  } catch (err) {
    console.error("Login error:", err);
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
   ✅ Other Routes (Upgrade, Notes CRUD)
------------------------ */
// ... (same as your existing code, just using prisma = require('./prisma'))

/* ------------------------
   ✅ Export for Vercel
------------------------ */
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
