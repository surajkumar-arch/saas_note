require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const app = express();

/* ------------------------
   ✅ Manual CORS (works reliably on Vercel)
------------------------ */
app.use((req, res, next) => {
  const allowedOrigins = [
    "http://localhost:5173",                 // local frontend
    "https://saas-note-g5rh.vercel.app"      // deployed frontend
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204); // ✅ handle preflight
  }

  next();
});

// ✅ JSON parser
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
  console.log("Login request body:", req.body);
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

  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.sub,
      role: payload.role,
      tenant: payload.tenant
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

/* ------------------------
   ✅ Upgrade + Notes CRUD (unchanged)
------------------------ */
// (Keep your tenant upgrade & notes routes as-is)

/* ------------------------
   ✅ Export for Vercel
------------------------ */
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}
module.exports = app;
