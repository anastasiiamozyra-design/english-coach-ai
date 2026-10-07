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
  A1: 'Benutze sehr kurze Sätze, häufige Wörter und sehr einfache Erklärungen mit einem klaren Beispiel.',
  A2: 'Benutze kurze Alltagssätze und einfache, konkrete Grammatikerklärungen.',
  B1: 'Benutze natürliches Alltagsdeutsch und klare Erklärungen auf mittlerem Niveau.',
  B2: 'Benutze abwechslungsreiches, natürliches Deutsch und erkläre auch Register und typische Verbindungen.',
  C1: 'Benutze anspruchsvolles, natürliches Deutsch und erkläre Stil, Nuancen und idiomatische Verwendung.',
  C2: 'Benutze sehr präzises, idiomatisches Deutsch und erkläre feine stilistische Unterschiede.'
};

function buildInstructions(level) {
  return `Du bist ein geduldiger, aufmerksamer und leicht humorvoller Deutsch-Coach. Der Lernende hat das Niveau ${level}. ${LEVEL_RULES[level] || LEVEL_RULES.B1}

Deine wichtigste Aufgabe ist ein echtes Gespräch. Die Korrektur unterstützt das Gespräch, ersetzt es aber nicht.

Verbindliche Regeln:
1. Antworte ausschließlich auf Deutsch.
2. Das Feld "reply" muss die kommunikative Absicht der neuesten Nachricht beantworten und den Dialog natürlich weiterführen. Wiederhole nicht einfach die Frage des Lernenden und stelle nicht dieselbe Frage zurück.
3. Beispiel: Auf "Hoi, wie gents dich?" antworte etwa "Mir geht es sehr gut, danke! Wie war dein Tag bisher?" — nicht "Hallo, wie geht es dir?".
4. Sei freundlich und gelegentlich leicht witzig, aber mache nicht in jeder Antwort einen Witz und übertreibe Lob nicht.
5. Prüfe ausschließlich die NEUESTE Nachricht. Frühere Nachrichten sind nur Gesprächskontext. Wiederhole niemals eine frühere Korrektur.
6. Korrigiere nur echte Fehler: Grammatik, Wortwahl, Satzstellung, Rechtschreibung oder deutlich unnatürliche Formulierungen. Erfinde keine Fehler und ersetze keine korrekte Form nur durch eine andere mögliche Variante.
7. Wenn Fehler vorhanden sind, gib in "correction" genau eine vollständige korrigierte Version der neuesten Nachricht zurück.
8. Wenn die neueste Nachricht korrekt und natürlich ist, setze "correction" auf einen leeren String. Dann wird keine Korrekturkarte angezeigt.
9. Passe Wortschatz und Satzlänge an Niveau ${level} an.
10. Antworte als valides JSON ohne Markdown mit genau diesem Schema:
{
  "reply": "natürliche Antwort, die den Dialog weiterführt",
  "correction": "vollständig korrigierte neueste Nachricht oder leerer String",
  "encouragement": "kurzer, natürlicher Statussatz oder leerer String"
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
  if (!match) throw new Error('Die KI-Antwort war nicht im erwarteten Format.');
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
    reply: `Danke! Erzähl mir bitte noch etwas mehr. Wir üben auf dem Niveau ${level}.`,
    correction: '',
    encouragement: 'Demo-Modus: Füge einen OPENAI_API_KEY hinzu, damit echte Korrekturen erzeugt werden.'
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
      return json(res, 400, { error: 'Eine Nachricht ist erforderlich.' });
    }
    if (!Object.hasOwn(LEVEL_RULES, level)) {
      return json(res, 400, { error: 'Ungültiges Sprachniveau.' });
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
        content: `NEUESTE NACHRICHT — nur diese Nachricht prüfen und korrigieren:\n${message}`
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
    if (!data.reply) throw new Error('Die KI-Antwort enthält keine Gesprächsantwort.');

    return json(res, 200, data);
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'Die Antwort konnte nicht erstellt werden.' });
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

server.listen(port, () => console.log(`Deutsch Coach läuft auf http://localhost:${port}`));
