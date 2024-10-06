const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { authMiddleware } = require('./auth');

// Obter notificações do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(notifications);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Marcar notificação como lida
router.patch('/:notificationId', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { notificationId } = req.params;
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, req.user.userId]
    );
    res.json({ message: 'Notificação marcada como lida' });
  } catch (error) {
    console.error('Erro ao atualizar notificação:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;