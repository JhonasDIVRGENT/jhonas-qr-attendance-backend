import pool from '../config/db.js';
import crypto from 'crypto';

export const getActiveMeetings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, start_time, duration_minutes
       FROM meetings
       WHERE is_active = true
       ORDER BY start_time ASC`
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const QR_EXP_MINUTES = 2;
export const getPublicQR = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Buscar QR vigente
    const currentQR = await pool.query(
      `SELECT token, expires_at
       FROM qr_tokens
       WHERE meeting_id = $1
       AND expires_at > now()
       ORDER BY created_at DESC
       LIMIT 1`,
      [id]
    );

    if (currentQR.rows.length > 0) {
      return res.json(currentQR.rows[0]);
    }

    // 2. Crear nuevo QR
    const token = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + QR_EXP_MINUTES * 60 * 1000
    );

    const newQR = await pool.query(
      `INSERT INTO qr_tokens (meeting_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING token, expires_at`,
      [id, token, expiresAt]
    );

    res.json(newQR.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};