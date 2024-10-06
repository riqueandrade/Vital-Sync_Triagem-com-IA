const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { authMiddleware } = require('./auth');

// Adicionar uma avaliação
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { appointmentId, rating, comment } = req.body;
    const pool = getPool();

    const [result] = await pool.query(
      'INSERT INTO ratings (appointment_id, rating, comment) VALUES (?, ?, ?)',
      [appointmentId, rating, comment]
    );

    res.status(201).json({ message: 'Avaliação adicionada com sucesso', ratingId: result.insertId });
  } catch (error) {
    console.error('Erro ao adicionar avaliação:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Obter avaliações de um médico
router.get('/doctor/:doctorId', authMiddleware, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const pool = getPool();

    const [ratings] = await pool.query(
      `SELECT r.*, a.date as appointment_date 
       FROM ratings r 
       JOIN appointments a ON r.appointment_id = a.id 
       WHERE a.doctor_id = ?`,
      [doctorId]
    );

    res.json(ratings);
  } catch (error) {
    console.error('Erro ao buscar avaliações:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;