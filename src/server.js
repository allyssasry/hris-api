import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from "dotenv";
dotenv.config();

import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import salaryRoutes from './routes/salaries.js';
import letterRoutes from './routes/letters.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import passwordRoutes from './routes/passwordRoutes.js';
import adminCheckclockRoutes from "./routes/adminCheckclockRoutes.js";
import userCheckclockRoutes from './routes/userCheckclockRoutes.js';
import leaveRoutes from './routes/leave.routes.js';
import companyRoutes from "./routes/companyRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);
// 🔥 WAJIB: MATIKAN ETAG
app.disable("etag");


// MIDDLEWARE
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
// 🔥 FORCE NO CACHE
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// STATIC UPLOADS
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/uploads/avatars', express.static(path.join(process.cwd(), 'uploads/avatars')));

// CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
];

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true
}));

// SECURITY
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

// HEALTH CHECK
app.get("/", (_req, res) => res.json({ status: "ok", service: "HRIS API" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/salaries", salaryRoutes);
app.use("/api/letters", letterRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/user", userCheckclockRoutes);

app.use("/api/admin/checkclock", adminCheckclockRoutes);

app.use("/api/company", companyRoutes);
// 🛑 Penting: HAPUS ROUTE CHECKCLOCK LAMA
// app.use(checkclockRoutes);

app.use(leaveRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// ERROR HANDLER
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message,
  });
});

// START SERVER
const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`HRIS API running at http://${HOST}:${PORT}`);
});
