SaaS Notes App (React + Express)
================================

This project is a compact full-stack sample implementing a multi-tenant notes SaaS app.
It is intended for local testing and demonstration. It uses SQLite (via Prisma) so you can run locally without provisioning Postgres.

Features:
- Multi-tenant shared schema (tenants: acme, globex)
- JWT-based authentication
- Roles: admin, member
- Subscription gating: Free plan (3-note limit), Pro plan (unlimited)
- Notes CRUD with tenant isolation
- Upgrade endpoint (admin-only)
- Health endpoint
- Minimal React frontend with Tailwind (login, list/create/delete notes, upgrade CTA)
- Seed script to create tenants and test users:
  - admin@acme.test (admin, password: password)
  - user@acme.test  (member, password: password)
  - admin@globex.test (admin, password: password)
  - user@globex.test  (member, password: password)

Important:
- This build uses SQLite for ease of setup. For production or assignment deployment targeting Postgres, change DATABASE_URL in backend/.env to your Postgres URL and update prisma schema.

Run backend:
--------------
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev

Run frontend:
--------------
cd frontend
npm install
npm run dev

Default envs:
- backend/.env (example provided)

Zip created at: /mnt/data/saas-notes-app.zip