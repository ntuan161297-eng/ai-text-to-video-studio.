import 'dotenv/config';
import axios from 'axios';

async function testModels() {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-pro'
  ];

  for (const m of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`;
    try {
      const res = await axios.post(
        url,
        {
          contents: [{ parts: [{ text: 'Trả lời đúng 1 chữ: OK' }] }],
          generationConfig: { maxOutputTokens: 20 }
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
      );
      const text = res.data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`Model [${m}]: SUCCESS -> "${text?.trim()}"`);
    } catch (e: any) {
      console.log(`Model [${m}]: FAILED (${e.response?.status} - ${e.response?.data?.error?.message || e.message})`);
    }
  }
}

testModels();
