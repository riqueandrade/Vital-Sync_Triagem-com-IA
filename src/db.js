const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

async function initDatabase() {
  try {
    // Criar conexão sem especificar o banco de dados
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    // Criar o banco de dados se não existir
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    
    // Usar o banco de dados
    await connection.query(`USE ${process.env.DB_NAME}`);

    // Criar tabela de usuários
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('patient', 'doctor') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela de consultas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT,
        doctor_id INT,
        date DATETIME,
        status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
        notes TEXT,
        FOREIGN KEY (patient_id) REFERENCES users(id),
        FOREIGN KEY (doctor_id) REFERENCES users(id)
      )
    `);

    // Criar tabela de histórico médico
    await connection.query(`
      CREATE TABLE IF NOT EXISTS medical_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        \`condition\` VARCHAR(255),
        diagnosis_date DATE,
        treatment TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    console.log('Banco de dados inicializado com sucesso');
    
    // Fechar a conexão inicial
    await connection.end();

    // Criar o pool de conexões
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('Pool de conexões criado com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar o banco de dados:', error);
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('O pool de conexões não foi inicializado');
  }
  return pool;
}

module.exports = { initDatabase, getPool };