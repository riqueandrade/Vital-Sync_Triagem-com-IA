const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Função de IA para triagem de sintomas
async function analyzeSymptoms(symptoms) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Você é um assistente médico especializado em triagem de sintomas." },
        { role: "user", content: `Analise os seguintes sintomas e forneça uma possível condição médica e recomendações: ${symptoms}` }
      ],
      max_tokens: 150
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Erro ao analisar sintomas com IA:', error);
    return 'Não foi possível analisar os sintomas. Por favor, consulte um médico.';
  }
}

router.post('/', authMiddleware, async (req, res) => {
  const { symptoms } = req.body;

  if (!symptoms) {
    return res.status(400).json({ message: 'É necessário fornecer uma descrição dos sintomas.' });
  }

  try {
    const result = await analyzeSymptoms(symptoms);
    res.json({ analysis: result });
  } catch (error) {
    console.error('Erro na triagem de sintomas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;