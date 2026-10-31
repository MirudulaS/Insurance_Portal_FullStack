const pool = require('../db/pool');
const { asyncHandler, ApiError, nextId } = require('../utils/helpers');
const socket = require('../sockets');

function toNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedId: row.related_id,
    isRead: !!row.is_read,
    createdAt: row.created_at,
  };
}

const getAll = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json(rows.map(toNotification));
});

const markAsRead = asyncHandler(async (req, res) => {
  const [existing] = await pool.query('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!existing[0]) throw new ApiError(404, 'Notification not found.');
  await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  const [rows] = await pool.query('SELECT * FROM notifications WHERE id = ?', [req.params.id]);
  res.json(toNotification(rows[0]));
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
  res.status(204).send();
});

// Called by other controllers (never exposed as its own route) to create a
// notification row and push it live over Socket.IO to that one user.
async function createNotification({ userId, type, title, message, relatedId }) {
  const id = await nextId(pool, 'NOT', 'notifications');
  await pool.query('INSERT INTO notifications (id, user_id, type, title, message, related_id) VALUES (?,?,?,?,?,?)', [
    id,
    userId,
    type,
    title,
    message,
    relatedId || null,
  ]);
  const [rows] = await pool.query('SELECT * FROM notifications WHERE id = ?', [id]);
  const notification = toNotification(rows[0]);
  socket.emitToUser(userId, 'notification:new', notification);
  return notification;
}

module.exports = { getAll, markAsRead, markAllAsRead, createNotification };
