require('dotenv').config({ path: require('path').join(__dirname, '.env') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

const image = fs.readFileSync(path.join(__dirname, 'uploads', 'photo-1795266049965-275697976.jpg')).toString('base64');

async function attempt(model) {
  const started = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY3}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: 'image/jpeg', data: image } }, { text: 'Is this coffee beans? Reply JSON {"is_coffee": true|false, "grade_tier": "Washed G2"}' }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512, responseMimeType: 'application/json' },
      }),
    });
    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || body?.error?.message;
    return `KEY3 ${model}: ${res.status} ${Date.now() - started}ms ${String(text).replace(/\s+/g, ' ').slice(0, 100)}`;
  } catch (err) {
    return `KEY3 ${model}: failed ${Date.now() - started}ms ${err.message}`;
  }
}

(async () => {
  for (const line of await Promise.all([attempt('gemini-3.7-flash'), attempt('gemini-3.8-flash')])) console.log(line);
})();
