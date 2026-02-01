import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from "dotenv";
import passport from "passport";
dotenv.config();

// Initialize Passport Google OAuth Strategy
import "./config/passport.js";

import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import salaryRoutes from './routes/salaries.js';
import letterRoutes from './routes/letters.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import passwordRoutes from './routes/passwordRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import adminCheckclockRoutes from "./routes/adminCheckclockRoutes.js";
import userCheckclockRoutes from './routes/userCheckclockRoutes.js';
import leaveRoutes from './routes/leave.routes.js';
import companyRoutes from "./routes/companyRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import googleAuthRoutes from "./routes/googleAuthRoutes.js";

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

// CORS - Production Ready
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  // Add your Vercel frontend URLs here
  process.env.FRONTEND_URL,
  "https://cmlabs-hris-17.vercel.app",  // Ganti dengan URL Vercel kamu
].filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // Allow requests with no origin (mobile apps, Postman, etc)
    if (!origin) return cb(null, true);
    
    // Check if origin is allowed or matches vercel pattern
    if (allowedOrigins.includes(origin) || 
        origin.endsWith('.vercel.app') ||
        origin.includes('vercel.app')) {
      cb(null, true);
    } else {
      console.log('CORS blocked:', origin);
      cb(new Error("Not allowed by CORS: " + origin));
    }
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

// PASSPORT INITIALIZATION
app.use(passport.initialize());

// HEALTH CHECK
app.get("/", (_req, res) => res.json({ status: "ok", service: "HRIS API" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/auth", googleAuthRoutes); // Google OAuth routes
app.use("/api/password", passwordRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/salaries", salaryRoutes);
app.use("/api/letters", letterRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/user", userCheckclockRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/locations", locationRoutes);

app.use("/api/admin/checkclock", adminCheckclockRoutes);
app.use("/api/schedules", scheduleRoutes);

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

// START SERVER (only when not in Vercel)
const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0";

if (process.env.VERCEL !== '1') {
  app.listen(PORT, HOST, () => {
    console.log(`HRIS API running at http://${HOST}:${PORT}`);
  });
}

// Export for Vercel Serverless
export default app;
