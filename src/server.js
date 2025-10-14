import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import salaryRoutes from './routes/salaries.js';
import checkClockRoutes from './routes/checkClocks.js';
import checkClockSettingRoutes from './routes/checkClockSettings.js';
import letterRoutes from './routes/letters.js';

const app = express();
app.use(cors({
  origin: ['http://localhost:3000','http://127.0.0.1:3000'], // tambah IP Mac jika perlu
  credentials: true
}));
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => res.json({ status: 'ok', service: 'HRIS API' }));

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/check-clocks', checkClockRoutes);
app.use('/api/check-clock-settings', checkClockSettingRoutes);
app.use('/api/letters', letterRoutes);

const PORT = process.env.PORT || 4000;
const HOST = '0.0.0.0'; // penting agar bisa diakses dari laptop lain (LAN)
app.listen(PORT, HOST, () => console.log(`HRIS API running on http://${HOST}:${PORT}`));
