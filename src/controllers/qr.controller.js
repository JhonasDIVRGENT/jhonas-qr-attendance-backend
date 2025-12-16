import crypto from 'crypto';
import pool from '../config/db.js';

const QR_EXP_MINUTES = 2;

export const forceRegenerateQR = async (req, res) => {
  const { meetingId } = req.params;

  try {
    // 1) Crear nuevo QR (sin importar si hay uno vigente)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + QR_EXP_MINUTES * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO qr_tokens (meeting_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING token, expires_at`,
      [meetingId, token, expiresAt]
    );

    res.json({
      message: 'QR regenerated',
      ...result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
