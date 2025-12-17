import pool from '../config/db.js';

/**
 * =========================
 * SCAN QR + REGISTRAR ASISTENCIA
 * =========================
 */
export const scanQR = async (req, res) => {
  const { qr_token } = req.body;
  const userId = req.user.userId; // viene del JWT

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

    // 2️⃣ Verificar expiración del QR
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
    //  Bloquear si la reunión está cerrada
    if (!meetingResult.rows[0].is_active) {
     return res.status(400).json({
        message: 'Meeting is closed'
        });
    }

    const startTime = new Date(meetingResult.rows[0].start_time);
    const now = new Date();

    // 4️⃣ Calcular diferencia en minutos
    const diffMinutes = Math.floor((now - startTime) / 60000);

    let status = 'absent';
    if (diffMinutes <= 5) status = 'early';
    else if (diffMinutes <= 10) status = 'late';

    // 5️⃣ Verificar si ya existe asistencia
    const existingAttendance = await pool.query(
      `SELECT id FROM attendance
       WHERE user_id = $1 AND meeting_id = $2`,
      [userId, meeting_id]
    );

    if (existingAttendance.rows.length > 0) {
      // Buscar reintento autorizado
      const retryResult = await pool.query(
        `SELECT id, used
         FROM attendance_retries
         WHERE user_id = $1 AND meeting_id = $2`,
        [userId, meeting_id]
      );

      // No hay reintento o ya fue usado
      if (retryResult.rows.length === 0 || retryResult.rows[0].used) {
        return res.status(409).json({
          message: 'Attendance already registered'
        });
      }

      // Marcar reintento como usado
      await pool.query(
        `UPDATE attendance_retries
         SET used = true
         WHERE id = $1`,
        [retryResult.rows[0].id]
      );
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

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * =========================
 * ADMIN — AUTORIZAR REINTENTO
 * =========================
 */
export const grantRetry = async (req, res) => {
  const { user_id, meeting_id } = req.body;
  const adminId = req.user.userId;

  if (!user_id || !meeting_id) {
    return res.status(400).json({
      message: 'user_id and meeting_id required'
    });
  }

  try {
    // Verificar si ya existe reintento
    const existing = await pool.query(
      `SELECT id FROM attendance_retries
       WHERE user_id = $1 AND meeting_id = $2`,
      [user_id, meeting_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: 'Retry already granted'
      });
    }

    // Crear reintento
    await pool.query(
      `INSERT INTO attendance_retries (user_id, meeting_id, granted_by)
       VALUES ($1, $2, $3)`,
      [user_id, meeting_id, adminId]
    );

    res.json({
      message: 'Retry granted successfully'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * =========================
 * ADMIN —Lista a los asistentes
 * =========================
 */
export const getAttendanceByMeeting = async (req, res) => {
  const { meetingId } = req.params;

  if (!meetingId) {
    return res.status(400).json({ message: 'meetingId required' });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        a.user_id,
        u.full_name,
        u.email,
        a.status,
        a.scan_time
      FROM attendance a
      JOIN users u ON u.id = a.user_id
      WHERE a.meeting_id = $1
      ORDER BY a.scan_time
      `,
      [meetingId]
    );

    res.json({
      meeting_id: meetingId,
      attendance: result.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
//Ausentes automaticos 

export const closeMeeting = async (req, res) => {
  const { meetingId } = req.params;

  try {
    // 1️⃣ Verificar que la reunión exista y esté activa
    const meetingResult = await pool.query(
      `SELECT id, start_time, duration_minutes, is_active
       FROM meetings
       WHERE id = $1`,
      [meetingId]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    if (!meeting.is_active) {
      return res.status(400).json({ message: 'Meeting already closed' });
    }

    // 2️⃣ Calcular hora de cierre
    const startTime = new Date(meeting.start_time);
    const endTime = new Date(startTime.getTime() + meeting.duration_minutes * 60000);

    if (new Date() < endTime) {
      return res.status(400).json({
        message: 'Meeting has not finished yet'
      });
    }

    // 3️⃣ Insertar ausentes (usuarios sin asistencia)
    await pool.query(
      `
      INSERT INTO attendance (user_id, meeting_id, status)
      SELECT u.id, $1, 'absent'
      FROM users u
      WHERE u.role = 'user'
      AND NOT EXISTS (
        SELECT 1 FROM attendance a
        WHERE a.user_id = u.id
        AND a.meeting_id = $1
      )
      `,
      [meetingId]
    );

    // 4️⃣ Marcar reunión como cerrada
    await pool.query(
      `UPDATE meetings
       SET is_active = false
       WHERE id = $1`,
      [meetingId]
    );

    res.json({
      message: 'Meeting closed successfully',
      meeting_id: meetingId
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


//Reportes

export const getAttendanceReport = async (req, res) => {
  const { meetingId } = req.params;

  try {
    // Total de usuarios (solo role user)
    const totalUsersResult = await pool.query(
      `SELECT COUNT(*) FROM users WHERE role = 'user'`
    );

    const totalUsers = parseInt(totalUsersResult.rows[0].count);

    // Conteo por estado
    const reportResult = await pool.query(
      `
      SELECT
        status,
        COUNT(*) AS count
      FROM attendance
      WHERE meeting_id = $1
      GROUP BY status
      `,
      [meetingId]
    );

    // Inicializar contadores
    let early = 0;
    let late = 0;
    let absent = 0;

    reportResult.rows.forEach(row => {
      if (row.status === 'early') early = parseInt(row.count);
      if (row.status === 'late') late = parseInt(row.count);
      if (row.status === 'absent') absent = parseInt(row.count);
    });

    res.json({
      meeting_id: meetingId,
      total_users: totalUsers,
      early,
      late,
      absent
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
