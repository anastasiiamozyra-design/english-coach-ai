import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const port = Number(process.env.PORT || 3000);

const LEVEL_RULES = {
  A1: 'Use very short sentences, high-frequency vocabulary and very simple explanations with one clear example.',
  A2: 'Use short everyday sentences and simple, concrete grammar explanations.',
  B1: 'Use natural everyday English and clear intermediate-level explanations.',
  B2: 'Use varied, natural English and explain register, collocations and common phrasing when relevant.',
  C1: 'Use sophisticated, natural English and explain style, nuance and idiomatic usage.',
  C2: 'Use highly precise, idiomatic English and explain subtle stylistic and semantic differences.'
};

function buildInstructions(level) {
  return `You are a patient, attentive and slightly humorous English conversation coach. The learner's CEFR level is ${level}. ${LEVEL_RULES[level] || LEVEL_RULES.B1}

Your primary goal is to maintain a real, natural conversation. Correction supports the conversation; it must not replace it.

Mandatory rules:

1. Reply exclusively in English.

2. The "reply" field must respond to the communicative intent of the learner's latest message and naturally continue the conversation. Do not simply repeat the learner's question and do not ask the same question back.

3. Respond as a natural English-speaking conversation partner rather than as a grammar textbook.

4. Be friendly and occasionally lightly humorous, but do not make a joke in every response and do not overpraise the learner.

5. Check ONLY the LATEST user message for errors. Earlier messages are conversation context only. Never repeat an earlier correction.

6. Correct only genuine errors in grammar, vocabulary, word order, spelling, punctuation, or clearly unnatural phrasing. Do not invent errors and do not replace a correct natural expression merely because another version is possible.

7. If the latest message contains an error, return exactly one complete corrected version of that message in "correction".

8. If the latest message is correct and natural English, set "correction" to an empty string.

9. Adapt vocabulary, grammar complexity and sentence length to CEFR level ${level}.

10. Use natural contemporary English appropriate to the learner's level.

11. Return valid JSON without Markdown using exactly this schema:

{
  "reply": "natural response that continues the conversation",
  "correction": "fully corrected latest message or empty string",
  "encouragement": "short natural status sentence or empty string"
}`;
}

function extractText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const chunks = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n');
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {}

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('The AI response does not contain valid JSON.');
  return JSON.parse(match[0]);
}

function normalizeForComparison(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCoachData(data, originalMessage) {
  const reply = String(data?.reply || '').trim();
  let correction = String(data?.correction || '').trim();
  const encouragement = String(data?.encouragement || '').trim();

  // Deterministic guard: never show a correction card when the model
  // returned the user's original sentence unchanged.
  if (normalizeForComparison(correction) === normalizeForComparison(originalMessage)) {
    correction = '';
  }

  return { reply, correction, encouragement };
}

function mockCoach(message, level) {
  return {
    reply: `Thanks! Tell me a little more. We're practising at ${level} level.`,
    correction: '',
    encouragement: 'Demo mode: Add an OPENAI_API_KEY to enable real corrections.'
  };
}

function json(res, status, payload) {
  const data = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data)
  });
  res.end(data);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error('Request too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function handleChat(req, res) {
  try {
    const { message, level = 'B1', history = [] } = await readJson(req);
    if (!message || typeof message !== 'string') {
      return json(res, 400, { error: 'A message is required.' });
    }
    if (!Object.hasOwn(LEVEL_RULES, level)) {
      return json(res, 400, { error: 'Invalid language level.' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return json(res, 200, { ...mockCoach(message, level), demo: true });
    }

    const trimmedHistory = Array.isArray(history) ? history.slice(-10) : [];
    const input = [
      ...trimmedHistory.map((item) => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: String(item.content || '')
      })),
      {
        role: 'user',
        content: `LATEST MESSAGE — check and correct only this message:\n${message}`
      }
    ];

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        instructions: buildInstructions(level),
        input,
        temperature: 0.35
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI API: ${response.status} ${detail}`);
    }

    const payload = await response.json();
    const data = normalizeCoachData(parseJson(extractText(payload)), message);
    if (!data.reply) throw new Error('The AI response does not contain a conversation reply.');

    return json(res, 200, data);
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'The response could not be generated.' });
  }
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/chat') return handleChat(req, res);
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const requested = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const safe = normalize(requested).replace(/^([.][.][/\\])+/, '');
  const file = join(__dirname, 'public', safe);
  if (!file.startsWith(join(__dirname, 'public'))) return json(res, 403, { error: 'Forbidden' });

  try {
    const data = readFileSync(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    json(res, 404, { error: 'Not found' });
  }
});

server.listen(port, () => console.log(`English Coach is running on http://localhost:${port}`));
