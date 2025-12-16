import pool from '../config/db.js';

export const scanQR = async (req, res) => {
  const { qr_token } = req.body;
  const userId = req.user.userId; // 👈 viene del JWT

  if (!qr_token) {
    return res.status(400).json({ message: 'QR token required' });
  }

  try {
    // 1️⃣ Buscar QR válido
    const qrResult = await pool.query(
      `SELECT meeting_id, expires_at
       FROM qr_tokens
       WHERE token = $1`,
      [qr_token]
    );

    if (qrResult.rows.length === 0) {
      return res.status(404).json({ message: 'QR not found' });
    }

    const { meeting_id, expires_at } = qrResult.rows[0];

    // 2️⃣ Verificar expiración
    if (new Date(expires_at) < new Date()) {
      return res.status(400).json({ message: 'QR expired' });
    }

    // 3️⃣ Obtener inicio de la reunión
    const meetingResult = await pool.query(
      `SELECT start_time
       FROM meetings
       WHERE id = $1`,
      [meeting_id]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const startTime = new Date(meetingResult.rows[0].start_time);
    const now = new Date();

    // 4️⃣ Calcular diferencia en minutos
    const diffMinutes = Math.floor((now - startTime) / 60000);

    let status = 'absent';
    if (diffMinutes <= 5) status = 'early';
    else if (diffMinutes <= 10) status = 'late';

    // 5️⃣ Verificar duplicado
    const existing = await pool.query(
      `SELECT id FROM attendance
       WHERE user_id = $1 AND meeting_id = $2`,
      [userId, meeting_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: 'Attendance already registered'
      });
    }

    // 6️⃣ Guardar asistencia
    await pool.query(
      `INSERT INTO attendance (user_id, meeting_id, status)
       VALUES ($1, $2, $3)`,
      [userId, meeting_id, status]
    );

    // 7️⃣ Respuesta final
    res.json({
      message: 'Attendance recorded',
      status
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
