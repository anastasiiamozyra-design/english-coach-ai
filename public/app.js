const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
let selectedLevel = localStorage.getItem('english-level') || '';
let history = [];
let recognition = null;
let turnCounter = 0;

const el = (id) => document.getElementById(id);
const levelGrid = el('levelGrid');
const onboarding = el('onboarding');
const chatScreen = el('chatScreen');
const messages = el('messages');
const input = el('messageInput');

function renderLevels() {
  levelGrid.innerHTML = '';
  for (const level of levels) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `level-btn ${selectedLevel === level ? 'selected' : ''}`;
    button.textContent = level;
    button.onclick = () => {
      selectedLevel = level;
      el('startBtn').disabled = false;
      renderLevels();
    };
    levelGrid.appendChild(button);
  }
  el('startBtn').disabled = !selectedLevel;
}

function addAssistantMessage(text) {
  const div = document.createElement('div');
  div.className = 'message assistant';
  div.textContent = text;
  messages.appendChild(div);
  scrollToLatest();
}

function addUserTurn(text) {
  const id = `turn-${++turnCounter}`;
  const turn = document.createElement('article');
  turn.className = 'user-turn';
  turn.id = id;

  const bubble = document.createElement('div');
  bubble.className = 'message user';
  bubble.textContent = text;

  const feedbackHost = document.createElement('div');
  feedbackHost.className = 'turn-feedback-host';
  feedbackHost.dataset.state = 'pending';

  turn.append(bubble, feedbackHost);
  messages.appendChild(turn);
  scrollToLatest();
  return feedbackHost;
}

function normalizeForComparison(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderTurnFeedback(host, data, originalMessage) {
  const correction = String(data.correction || '').trim();
  if (!correction || normalizeForComparison(correction) === normalizeForComparison(originalMessage)) {
    host.remove();
    return;
  }

  const details = document.createElement('details');
  details.className = 'turn-feedback has-correction';
  details.open = true;

  const summary = document.createElement('summary');
  summary.innerHTML = '<span class="feedback-icon">✓</span><span>Correction</span><span class="summary-action"><span class="show-label">Show</span><span class="hide-label">Hide</span></span>';
  details.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'turn-feedback-body';
  body.appendChild(createFeedbackSection('Correction', correction));

  details.appendChild(body);
  host.replaceChildren(details);
  host.dataset.state = 'ready';
  scrollToLatest();
}

function createFeedbackSection(labelText, content) {
  const section = document.createElement('section');
  section.className = 'feedback-section';

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = labelText;

  const paragraph = document.createElement('p');
  paragraph.textContent = content;

  section.append(label, paragraph);
  return section;
}

function scrollToLatest() {
  requestAnimationFrame(() => {
    messages.scrollTop = messages.scrollHeight;
  });
}

function startChat() {
  localStorage.setItem('english-level', selectedLevel);
  el('levelBadge').textContent = selectedLevel;
  onboarding.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  messages.innerHTML = '';
  history = [];
  turnCounter = 0;
  addAssistantMessage(`Hi! We're speaking at ${selectedLevel} level. What would you like to talk about today?`);
  input.focus();
}

function speak(text) {
  if (!el('autoSpeak').checked || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = selectedLevel === 'A1' || selectedLevel === 'A2' ? 0.88 : 1;
  speechSynthesis.speak(utterance);
}

async function sendMessage(message) {
  const feedbackHost = addUserTurn(message);
  const previousHistory = [...history];
  history.push({ role: 'user', content: message });
  el('status').textContent = 'The coach is thinking …';
  el('sendBtn').disabled = true;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, level: selectedLevel, history: previousHistory })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Fehler');

    renderTurnFeedback(feedbackHost, data, message);
    addAssistantMessage(data.reply);
    history.push({ role: 'assistant', content: data.reply });
    speak(data.reply);
    el('status').textContent = data.demo ? 'Demo mode without API key' : data.encouragement || '';
  } catch (error) {
    feedbackHost.remove();
    addAssistantMessage('Sorry, a technical error occurred. Please try again.');
    el('status').textContent = error.message;
  } finally {
    el('sendBtn').disabled = false;
  }
}

el('chatForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  input.value = '';
  input.style.height = 'auto';
  sendMessage(message);
});

input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 130)}px`;
});

function setupSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    el('micBtn').disabled = true;
    el('micBtn').title = 'Spracherkennung wird in diesem Browser nicht unterstützt.';
    return;
  }

  recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onstart = () => {
    el('micBtn').classList.add('listening');
    el('status').textContent = 'Listening …';
  };
  recognition.onend = () => el('micBtn').classList.remove('listening');
  recognition.onerror = () => {
    el('status').textContent = 'Voice input could not be recognized.';
  };
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results).map((result) => result[0].transcript).join('');
    input.value = transcript;
    if (event.results[event.results.length - 1].isFinal) input.focus();
  };
  el('micBtn').onclick = () => recognition.start();
}

el('startBtn').onclick = startChat;
el('changeLevelBtn').onclick = () => {
  chatScreen.classList.add('hidden');
  onboarding.classList.remove('hidden');
};

renderLevels();
setupSpeechRecognition();
