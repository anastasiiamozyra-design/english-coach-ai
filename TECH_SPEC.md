# Technical Specification — English Coach AI

## 1. Product Goal

A web application in which learners practise written and spoken English.

The user selects a CEFR language level from A1 to C2, starts a natural conversation with an AI coach, receives corrections when the latest message contains a genuine error, and can use both text and voice interaction.

The main goal is natural English conversation practice. Corrections support the conversation but do not replace it.

## 2. Target Audience

English learners at CEFR levels A1–C2 who want active speaking and writing practice with immediate contextual feedback.

## 3. User Flow

1. The user opens the application.
2. The user selects A1, A2, B1, B2, C1 or C2.
3. The system starts a conversation adapted to the selected level.
4. The user writes or dictates a message in English.
5. The AI responds naturally and continues the conversation.
6. If the latest user message contains a genuine error, the system displays a correction.
7. If the latest user message is already correct and natural, no correction card is shown.
8. The user can optionally have the AI response read aloud.
9. Conversation context is retained for subsequent messages.
10. Changing the CEFR level starts a new conversation session.

## 4. Functional Requirements

### Must

- CEFR level selection from A1 to C2
- Text-based chat
- English voice input
- English speech output
- AI responses exclusively in English
- Natural conversation adapted to the selected CEFR level
- Correction of genuine errors in grammar, vocabulary, word order, spelling, punctuation and clearly unnatural phrasing
- No invented corrections for already correct and natural English
- Correction applies only to the latest user message
- Previous messages are used only as conversation context
- Responsive interface
- Server-side storage of the OpenAI API key
- Demo mode when no API key is available

### Should

- Persistent conversation history
- Topic selection, for example everyday life, work, travel or exam preparation
- Error statistics grouped by error type
- Personal vocabulary list
- Review exercises based on previous mistakes
- Learning-progress export

## 5. CEFR Level Adaptation

- A1: very short sentences, high-frequency vocabulary and very simple explanations
- A2: short everyday sentences and simple grammar explanations
- B1: natural everyday English and clear intermediate-level explanations
- B2: varied natural English with attention to register, collocations and common phrasing
- C1: sophisticated natural English with style, nuance and idiomatic usage
- C2: highly precise and idiomatic English with subtle stylistic and semantic distinctions

## 6. AI Response Structure

The AI returns a structured JSON object containing:

- `reply`: the natural conversational response
- `correction`: the fully corrected version of the latest user message, or an empty string
- `encouragement`: a short natural learning or status message, or an empty string

If the latest user message is correct and natural English, `correction` must be an empty string and no correction card is displayed.

## 7. MVP Architecture

- Frontend: HTML, CSS and Vanilla JavaScript
- Backend: Node.js with the built-in HTTP server
- AI: OpenAI Responses API
- Voice input: Browser Web Speech API
- Voice output: Browser Speech Synthesis API
- Configuration: Environment variables
- Deployment: Vercel

## 8. Voice Behaviour

### Speech Recognition

The browser recognises user speech as English using:

`en-US`

### Speech Synthesis

The browser reads AI responses aloud using:

`en-US`

Speech can be slightly slower for beginner levels such as A1 and A2.

## 9. Data and Security

- The OpenAI API key is stored only on the server side
- The API key must never appear in frontend code
- Sensitive data should not be written to application logs
- Production deployment should use HTTPS
- Production systems should include appropriate rate limiting and abuse protection
- Browser voice functionality may depend on browser and operating-system support

## 10. Acceptance Criteria

- The user can select a CEFR level before starting the first conversation
- Text messages generate an English conversational response
- Correct and natural English messages do not generate unnecessary correction cards
- Incorrect messages can generate a corrected version
- The AI responds to the communicative intent of the user's message rather than merely correcting it
- The AI continues the conversation naturally
- The microphone can capture English speech in a supported browser
- AI responses can be read aloud in English
- Changing the level starts a new session
- The application remains usable in demo mode without an OpenAI API key
- The OpenAI API key does not appear in frontend code or browser requests

## 11. Correction Behaviour

For each turn, only the latest user message is evaluated for correction.

Earlier messages remain available to the AI as conversation context but must not be corrected again.

A correction should be shown only when there is a genuine issue with:

- grammar
- vocabulary
- word order
- spelling
- punctuation
- clearly unnatural English phrasing

A correct natural expression must not be replaced simply because another wording is also possible.

When a correction is required, the `correction` field contains one complete corrected version of the user's latest message.

When no correction is required:

`correction` is an empty string.

## 12. Conversation Behaviour

The AI should behave primarily as a natural English-speaking conversation partner rather than as a grammar textbook.

The response should:

- answer the user's communicative intent
- naturally continue the conversation
- avoid simply repeating the user's question
- avoid asking the same question back unnecessarily
- adapt vocabulary and sentence complexity to the selected CEFR level
- remain friendly without excessive praise
- use occasional light humour when appropriate

## 13. Next Production Steps

1. Add persistent conversation storage and optional user accounts.
2. Add automated tests for CEFR behaviour, response schema and correction logic.
3. Improve browser coverage for speech recognition.
4. Consider server-side speech-to-text if more consistent voice recognition is required.
5. Consider server-side text-to-speech if more consistent English voice quality is required.
6. Add monitoring, cost controls, rate limiting and abuse protection.
