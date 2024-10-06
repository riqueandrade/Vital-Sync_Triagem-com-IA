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

    // Criar notificação de lembrete para o paciente
    await createAppointmentReminder(pool, patient_id, result.insertId, new Date(date));

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

// Obter detalhes de uma consulta específica
router.get('/:appointmentId', authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const pool = getPool();

    const [appointment] = await pool.query(
      `SELECT a.*, 
              p.name AS patientName, 
              d.name AS doctorName 
       FROM appointments a
       JOIN users p ON a.patient_id = p.id
       JOIN users d ON a.doctor_id = d.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    if (appointment.length === 0) {
      return res.status(404).json({ message: 'Consulta não encontrada' });
    }

    res.json(appointment[0]);
  } catch (error) {
    console.error('Erro ao buscar detalhes da consulta:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Obter horários disponíveis para um médico específico
router.get('/available-slots/:doctorId', authMiddleware, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    const pool = getPool();

    // Buscar horários ocupados do médico na data especificada
    const [bookedSlots] = await pool.query(
      'SELECT date FROM appointments WHERE doctor_id = ? AND DATE(date) = ?',
      [doctorId, date]
    );

    // Gerar todos os horários possíveis (exemplo: das 9h às 17h, a cada 30 minutos)
    const allSlots = generateTimeSlots('09:00', '17:00', 30);

    // Filtrar horários disponíveis
    const availableSlots = allSlots.filter(slot => 
      !bookedSlots.some(bookedSlot => 
        new Date(bookedSlot.date).toTimeString().startsWith(slot)
      )
    );

    res.json(availableSlots);
  } catch (error) {
    console.error('Erro ao buscar horários disponíveis:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para obter as próximas consultas do usuário
router.get('/upcoming', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.userId;
    const userRole = req.user.role;

    let query;
    let queryParams;

    if (userRole === 'patient') {
      query = `
        SELECT a.*, u.name as doctorName 
        FROM appointments a
        JOIN users u ON a.doctor_id = u.id
        WHERE a.patient_id = ? AND a.date > NOW() AND a.status = 'scheduled'
        ORDER BY a.date ASC
      `;
      queryParams = [userId];
    } else if (userRole === 'doctor') {
      query = `
        SELECT a.*, u.name as patientName 
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        WHERE a.doctor_id = ? AND a.date > NOW() AND a.status = 'scheduled'
        ORDER BY a.date ASC
      `;
      queryParams = [userId];
    } else {
      return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    const [appointments] = await pool.query(query, queryParams);
    res.json(appointments);
  } catch (error) {
    console.error('Erro ao buscar próximas consultas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para obter as consultas pendentes de avaliação
router.get('/pending-ratings', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== 'patient') {
      return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    const query = `
      SELECT a.*, u.name as doctorName 
      FROM appointments a
      JOIN users u ON a.doctor_id = u.id
      LEFT JOIN ratings r ON a.id = r.appointment_id
      WHERE a.patient_id = ? AND a.status = 'completed' AND r.id IS NULL
      ORDER BY a.date DESC
    `;

    const [appointments] = await pool.query(query, [userId]);
    res.json(appointments);
  } catch (error) {
    console.error('Erro ao buscar consultas pendentes de avaliação:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

function generateTimeSlots(start, end, intervalMinutes) {
  const slots = [];
  let current = new Date(`2000-01-01T${start}`);
  const endTime = new Date(`2000-01-01T${end}`);

  while (current < endTime) {
    slots.push(current.toTimeString().slice(0, 5));
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }

  return slots;
}

// Função para criar notificação de lembrete
async function createAppointmentReminder(pool, userId, appointmentId, appointmentDate) {
  const reminderDate = new Date(appointmentDate);
  reminderDate.setDate(reminderDate.getDate() - 1); // Notificação 1 dia antes da consulta

  const message = `Lembrete: Você tem uma consulta agendada para amanhã, ${appointmentDate.toLocaleString()}.`;

  await pool.query(
    'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
    [userId, message]
  );
}

module.exports = router;