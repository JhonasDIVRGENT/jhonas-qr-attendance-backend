import express from 'express';
import cors from 'cors';
import pool from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import { authenticate, authorize } from './middlewares/auth.middleware.js';
import meetingsRoutes from './routes/meetings.routes.js';
import publicRoutes from './routes/public.routes.js';
import qrRoutes from './routes/qr.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';


const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ db_time: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.use('/auth', authRoutes);



app.get('/admin-test',
  authenticate,
  authorize(['admin']),
  (req, res) => {
    res.json({ message: 'Admin access granted' });
  }
);

app.use('/meetings', meetingsRoutes);

app.use('/public', publicRoutes);
app.use('/qr', qrRoutes);

app.use('/attendance', attendanceRoutes);

export default app;
