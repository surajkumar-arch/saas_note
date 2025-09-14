const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error'], // Optional: reduce noise
  });
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'error', 'info', 'warn'], // Helpful for debugging locally
    });
  }
  prisma = global.prisma;
}

module.exports = prisma;
