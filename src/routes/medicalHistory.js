const express = require('express');
const { getPool } = require('../db');
const router = express.Router();

// Importe o middleware de autenticação
const { authMiddleware } = require('./auth');

// Adicionar um novo registro ao histórico médico
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { user_id, condition, diagnosis_date, treatment } = req.body;
    const pool = getPool();

    const [result] = await pool.query(
      'INSERT INTO medical_history (user_id, `condition`, diagnosis_date, treatment) VALUES (?, ?, ?, ?)',
      [user_id, condition, diagnosis_date, treatment]
    );

    res.status(201).json({ message: 'Registro adicionado ao histórico médico', recordId: result.insertId });
  } catch (error) {
    console.error('Erro ao adicionar registro ao histórico médico:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Obter o histórico médico de um usuário
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();

    const [history] = await pool.query(
      'SELECT * FROM medical_history WHERE user_id = ?',
      [userId]
    );

    res.json(history);
  } catch (error) {
    console.error('Erro ao buscar histórico médico:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para obter o histórico médico do usuário
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== 'patient') {
      return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    const [history] = await pool.query('SELECT * FROM medical_history WHERE user_id = ?', [userId]);
    res.json(history);
  } catch (error) {
    console.error('Erro ao buscar histórico médico do usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;