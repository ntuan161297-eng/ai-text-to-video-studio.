import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

async function testKeys() {
  const geminiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
  const openAIKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : '';

  console.log('Testing Gemini API with key prefix:', geminiKey.slice(0, 8), 'length:', geminiKey.length);
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`,
      { contents: [{ role: 'user', parts: [{ text: 'Xin chào' }] }] },
      { timeout: 10000 }
    );
    console.log('Gemini SUCCESS:', res.status);
  } catch (err: any) {
    console.log('Gemini FAILED:', err.response?.status, err.response?.data?.error?.message || err.message);
  }

  console.log('\nTesting OpenAI API with key prefix:', openAIKey.slice(0, 8), 'length:', openAIKey.length);
  try {
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Xin chào' }],
        max_tokens: 10,
      },
      {
        headers: {
          Authorization: `Bearer ${openAIKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    console.log('OpenAI SUCCESS:', res.status, res.data.choices[0]?.message?.content);
  } catch (err: any) {
    console.log('OpenAI FAILED:', err.response?.status, err.response?.data?.error?.message || err.message);
  }
}

testKeys();
