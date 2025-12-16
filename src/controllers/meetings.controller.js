import pool from '../config/db.js';

// CREATE (admin)
export const createMeeting = async (req, res) => {
  const { title, start_time, duration_minutes } = req.body;

  if (!title || !start_time || !duration_minutes) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO meetings (title, start_time, duration_minutes, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, start_time, duration_minutes, req.user.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ (admin)
export const getMeetings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM meetings ORDER BY start_time DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//UPDATE

export const updateMeeting = async (req, res) => {
  const { id } = req.params;
  const { title, start_time, duration_minutes, is_active } = req.body;

  try {
    const result = await pool.query(
      `UPDATE meetings
       SET title = $1,
           start_time = $2,
           duration_minutes = $3,
           is_active = $4
       WHERE id = $5
       RETURNING *`,
      [title, start_time, duration_minutes, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//DELETE

export const deleteMeeting = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM meetings WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    res.json({ message: 'Meeting deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//ACTIVAR

export const toggleMeeting = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE meetings
       SET is_active = NOT is_active
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
