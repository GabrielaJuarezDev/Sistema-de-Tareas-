const express = require('express');

const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toTaskRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    completed: Boolean(row.completed),
    due_at: row.due_at || null,
    remind_at: row.remind_at || null,
    created_at: row.created_at,
  };
}

router.get('/', requireAuth, (req, res) => {
  const userId = req.user.id;
  const rows = db
    .prepare(
      `
      SELECT id, title, description, completed, due_at, remind_at, created_at
      FROM tasks
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC, id DESC
      `
    )
    .all(userId);

  return res.json(rows.map(toTaskRow));
});

router.post('/', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { title, description, due_at, remind_at } = req.body || {};

  if (typeof title !== 'string' || title.trim().length < 1) {
    return res.status(400).json({ error: 'title is required' });
  }

  const dueAt = typeof due_at === 'string' && due_at.trim() ? due_at.trim() : null;
  const remindAt = typeof remind_at === 'string' && remind_at.trim() ? remind_at.trim() : null;

  const info = db
    .prepare(
      `
      INSERT INTO tasks (user_id, title, description, due_at, remind_at)
      VALUES (?, ?, ?, ?, ?)
      `
    )
    .run(
      userId,
      title.trim(),
      typeof description === 'string' ? description : null,
      dueAt,
      remindAt
    );

  const task = db
    .prepare(
      `
      SELECT id, title, description, completed, due_at, remind_at, created_at
      FROM tasks
      WHERE id = ? AND user_id = ?
      `
    )
    .get(info.lastInsertRowid, userId);

  return res.status(201).json(toTaskRow(task));
});

router.patch('/:id', requireAuth, (req, res) => {
  const userId = req.user.id;
  const taskId = Number(req.params.id);
  const { completed, due_at, remind_at } = req.body || {};

  if (!Number.isFinite(taskId)) {
    return res.status(400).json({ error: 'Invalid task id' });
  }

  const hasCompleted = typeof completed === 'boolean';
  const hasDueAt = typeof due_at === 'string' || due_at === null;
  const hasRemindAt = typeof remind_at === 'string' || remind_at === null;

  if (!hasCompleted && !hasDueAt && !hasRemindAt) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const sets = [];
  const values = [];
  if (hasCompleted) {
    sets.push('completed = ?');
    values.push(completed ? 1 : 0);
  }
  if (typeof due_at === 'string' || due_at === null) {
    sets.push('due_at = ?');
    values.push(typeof due_at === 'string' && due_at.trim() ? due_at.trim() : null);
  }
  if (typeof remind_at === 'string' || remind_at === null) {
    sets.push('remind_at = ?');
    values.push(typeof remind_at === 'string' && remind_at.trim() ? remind_at.trim() : null);
  }

  const info = db
    .prepare(
      `
      UPDATE tasks
      SET ${sets.join(', ')}
      WHERE id = ? AND user_id = ?
      `
    )
    .run(...values, taskId, userId);

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const task = db
    .prepare(
      `
      SELECT id, title, description, completed, due_at, remind_at, created_at
      FROM tasks
      WHERE id = ? AND user_id = ?
      `
    )
    .get(taskId, userId);

  return res.json(toTaskRow(task));
});

router.delete('/:id', requireAuth, (req, res) => {
  const userId = req.user.id;
  const taskId = Number(req.params.id);

  if (!Number.isFinite(taskId)) {
    return res.status(400).json({ error: 'Invalid task id' });
  }

  const info = db
    .prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?')
    .run(taskId, userId);

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }

  return res.json({ ok: true });
});

module.exports = router;

