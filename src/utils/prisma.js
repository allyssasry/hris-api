// src/utils/prisma.js
import { PrismaClient } from '@prisma/client';

let prisma;
if (!global.__prisma) {
  global.__prisma = new PrismaClient();
}
prisma = global.__prisma;

// ✅ Tambahan: pastikan aman di environment production
// dan gunakan globalThis sebagai fallback yang lebih standar.
if (process.env.NODE_ENV === 'production') {
  // Di production kita pakai instance baru (tanpa cache global)
  prisma = new PrismaClient();
} else {
  // Di dev kita pastikan tetap pakai cache global supaya tidak bikin
  // koneksi berulang jika hot-reload / nodemon jalan.
  const g = globalThis || global;
  if (!g.__prisma) g.__prisma = prisma || new PrismaClient();
  prisma = g.__prisma;
}

export { prisma };
