const express = require('express');
const { getPool } = require('../db');
const router = express.Router();

// Importe o middleware de autenticação
const { authMiddleware } = require('./auth');

// Criar uma nova consulta
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { patient_id, doctor_id, date, notes } = req.body;
    const pool = getPool();

    const [result] = await pool.query(
      'INSERT INTO appointments (patient_id, doctor_id, date, notes) VALUES (?, ?, ?, ?)',
      [patient_id, doctor_id, date, notes]
    );

    res.status(201).json({ message: 'Consulta agendada com sucesso', appointmentId: result.insertId });
  } catch (error) {
    console.error('Erro ao agendar consulta:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Obter todas as consultas de um usuário (paciente ou médico)
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();

    const [appointments] = await pool.query(
      'SELECT * FROM appointments WHERE patient_id = ? OR doctor_id = ?',
      [userId, userId]
    );

    res.json(appointments);
  } catch (error) {
    console.error('Erro ao buscar consultas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Atualizar status de uma consulta
router.patch('/:appointmentId', authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;
    const pool = getPool();

    await pool.query(
      'UPDATE appointments SET status = ? WHERE id = ?',
      [status, appointmentId]
    );

    res.json({ message: 'Status da consulta atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar status da consulta:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para obter as consultas do usuário
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.userId;
    const userRole = req.user.role;

    let query;
    let queryParams;

    if (userRole === 'patient') {
      query = 'SELECT * FROM appointments WHERE patient_id = ?';
      queryParams = [userId];
    } else if (userRole === 'doctor') {
      query = 'SELECT * FROM appointments WHERE doctor_id = ?';
      queryParams = [userId];
    } else {
      return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    const [appointments] = await pool.query(query, queryParams);
    res.json(appointments);
  } catch (error) {
    console.error('Erro ao buscar consultas do usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;