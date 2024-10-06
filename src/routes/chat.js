const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getPool } = require('../db');
const { authMiddleware } = require('./auth');

// Configurar o armazenamento de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Tipo de arquivo não permitido'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // limite de 5MB
  }
});

// Obter histórico de mensagens para uma consulta específica
router.get('/:appointmentId', authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const pool = getPool();

    const [messages] = await pool.query(
      `SELECT cm.*, u.name as sender_name 
       FROM chat_messages cm 
       JOIN users u ON cm.sender_id = u.id 
       WHERE cm.appointment_id = ? 
       ORDER BY cm.timestamp ASC`,
      [appointmentId]
    );

    res.json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens do chat:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Salvar uma nova mensagem
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { appointmentId, message } = req.body;
    const senderId = req.user.userId;
    const pool = getPool();

    const [result] = await pool.query(
      'INSERT INTO chat_messages (appointment_id, sender_id, message) VALUES (?, ?, ?)',
      [appointmentId, senderId, message]
    );

    res.status(201).json({ message: 'Mensagem salva com sucesso', messageId: result.insertId });
  } catch (error) {
    console.error('Erro ao salvar mensagem do chat:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Salvar uma nova mensagem com arquivo
router.post('/with-file', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { appointmentId, message } = req.body;
    const senderId = req.user.userId;
    const pool = getPool();

    let filePath = null;
    if (req.file) {
      filePath = req.file.path;
    }

    const [result] = await pool.query(
      'INSERT INTO chat_messages (appointment_id, sender_id, message, file_path) VALUES (?, ?, ?, ?)',
      [appointmentId, senderId, message, filePath]
    );

    res.status(201).json({ message: 'Mensagem salva com sucesso', messageId: result.insertId, filePath });
  } catch (error) {
    console.error('Erro ao salvar mensagem do chat:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;