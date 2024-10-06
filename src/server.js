const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const { initDatabase } = require('./db');
const { router: authRoutes } = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const medicalHistoryRoutes = require('./routes/medicalHistory');
const symptomCheckerRoutes = require('./routes/symptomChecker');
const notificationRoutes = require('./routes/notifications');
const chatRoutes = require('./routes/chat');
const ratingRoutes = require('./routes/ratings');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;

// Configurações de segurança
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(xss());
app.use(cors());
app.use(express.json({ limit: '10kb' })); // Limita o tamanho do corpo da requisição

// Configurar rate limiting
const limiter = rateLimit({
  max: 100, // Limite de 100 requisições
  windowMs: 60 * 60 * 1000, // por hora
  message: 'Muitas requisições deste IP, por favor tente novamente em uma hora!'
});
app.use('/api', limiter);

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medical-history', medicalHistoryRoutes);
app.use('/api/symptom-checker', symptomCheckerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ratings', ratingRoutes);

// Rota para todas as outras requisições
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Lógica do Socket.IO
io.on('connection', (socket) => {
  console.log('Novo cliente conectado');

  socket.on('join room', (room) => {
    socket.join(room);
    console.log(`Cliente entrou na sala: ${room}`);
  });

  socket.on('chat message', async (data) => {
    try {
      const pool = getPool();
      const [result] = await pool.query(
        'INSERT INTO chat_messages (appointment_id, sender_id, message) VALUES (?, ?, ?)',
        [data.room, data.senderId, data.text]
      );

      const [sender] = await pool.query('SELECT name FROM users WHERE id = ?', [data.senderId]);
      const [appointment] = await pool.query('SELECT patient_id, doctor_id FROM appointments WHERE id = ?', [data.room]);

      const messageWithSender = {
        ...data,
        id: result.insertId,
        sender_name: sender[0].name
      };

      io.to(data.room).emit('chat message', messageWithSender);

      // Enviar notificação para o outro participante do chat
      const recipientId = data.senderId === appointment[0].patient_id ? appointment[0].doctor_id : appointment[0].patient_id;
      io.to(`user_${recipientId}`).emit('new chat notification', {
        appointmentId: data.room,
        senderName: sender[0].name,
        message: data.text
      });
    } catch (error) {
      console.error('Erro ao salvar mensagem do chat:', error);
    }
  });

  socket.on('typing', (data) => {
    socket.to(data.room).emit('typing', { userId: data.userId });
  });

  socket.on('stop typing', (data) => {
    socket.to(data.room).emit('stop typing', { userId: data.userId });
  });

  socket.on('user online', (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

async function startServer() {
  try {
    await initDatabase();
    server.listen(port, () => {
      console.log(`Servidor rodando na porta ${port}`);
    });
  } catch (error) {
    console.error('Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

startServer();