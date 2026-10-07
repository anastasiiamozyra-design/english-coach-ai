# Technische Spezifikation: Deutsch Coach AI

## 1. Produktziel

Eine Webanwendung, in der Lernende schriftlich und mündlich auf Deutsch kommunizieren. Das System setzt das gewählte Sprachniveau A1–C2 voraus, führt ein natürliches Gespräch weiter, korrigiert Fehler und erklärt jede relevante Korrektur ausschließlich auf Deutsch.

## 2. Zielgruppe

Deutschlernende der Niveaus A1 bis C2, die aktive Sprachpraxis und unmittelbares Feedback benötigen.

## 3. Kernablauf

1. Nutzer öffnet die Anwendung.
2. Nutzer wählt A1, A2, B1, B2, C1 oder C2.
3. System startet einen niveauangepassten Dialog.
4. Nutzer schreibt oder diktiert eine Nachricht.
5. System zeigt eine natürliche Antwort.
6. System zeigt getrennt: Korrektur, neue Wörter.
7. Auf Wunsch wird die Antwort vorgelesen.
8. Der Dialogkontext wird für weitere Nachrichten beibehalten.

## 4. Funktionale Anforderungen

### Muss

- Niveauwahl beim Start
- Textbasierter Chat
- Spracheingabe auf Deutsch
- Deutsche Sprachausgabe
- Ausschließlich deutsche KI-Antwortenen
- Fehlerkorrektur für Grammatik, Lexik, Satzstellung und Natürlichkeit
- Kennzeichnung korrekter Sätze ohne erfundene Fehler
- Responsive Oberfläche
- Serverseitige Speicherung des API-Schlüssels
- Fehlerzustände und Demo-Modus

### Soll

- Gesprächsverlauf lokal oder in einer Datenbank speichern
- Themenwahl, zum Beispiel Alltag, Beruf, Reisen oder Prüfung
- Statistiken nach Fehlertyp
- Persönliche Wortliste
- Wiederholungsübungen aus früheren Fehlern
- Export des Lernfortschritts

## 5. Niveauanpassung

- A1: sehr kurze Sätze, Hochfrequenzwortschatz, einfache Beispiele
- A2: kurze Alltagssätze, grundlegende Grammatikbegriffe
- B1: natürliche Alltagssprache, verständliche Zwischenerklärungen
- B2: differenzierter Wortschatz, Register und Kollokationen
- C1: komplexe Strukturen, Idiomatik und Stil
- C2: präzise Nuancen, idiomatische und stilistische Feinheiten

## 6. Antwortstruktur

Die KI liefert ein strukturiertes Objekt mit:

- `reply`: natürliche Fortsetzung des Gesprächs
- `correction`: korrigierte Version oder leer
- ``: Erklärung auf Deutsch
- `newWords`: neue Wörter mit deutscher Bedeutungserklärung
- `encouragement`: kurzer sachlicher Lernimpuls

## 7. Architektur des MVP

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js und Express
- KI: OpenAI Responses API
- Spracheingabe: Browser Web Speech API
- Sprachausgabe: Browser Speech Synthesis API
- Konfiguration: Umgebungsvariablen

## 8. Datenschutz und Sicherheit

- API-Schlüssel ausschließlich serverseitig
- Keine sensiblen Daten in Logs
- Für Produktion: Rate Limiting, Authentifizierung, HTTPS, Einwilligungs- und Löschfunktionen
- Klare Information, dass Spracheingabe je nach Browser über Browser- oder Betriebssystemdienste verarbeitet werden kann

## 9. Akzeptanzkriterien

- Nutzer kann vor dem ersten Chat ein Niveau auswählen.
- Textnachrichten erzeugen eine deutsche Antwort und deutsches Feedback.
- Mikrofon kann in einem unterstützten Browser deutschen Text erfassen.
- KI-Antwort kann vorgelesen werden.
- Niveauwechsel setzt eine neue Sitzung auf.
- Ohne API-Schlüssel bleibt die Oberfläche im Demo-Modus bedienbar.
- API-Schlüssel erscheint nicht im Frontend-Code oder Netzwerk-Request des Browsers.

## 10. Nächste Produktionsschritte

1. Datenbank und Nutzerkonten ergänzen.
2. Browser-Spracherkennung durch serverseitige Transkription ersetzen, um Qualität und Browserabdeckung zu erhöhen.
3. Serverseitige TTS-Ausgabe ergänzen, um eine konsistentere deutsche Stimme zu liefern.
4. Automatisierte Tests für Niveauwahl, Antwortschema und Fehlerfälle hinzufügen.
5. Monitoring, Kostenlimits und Missbrauchsschutz einführen.


## Behaviour update 2.3

For a correct and natural latest user message, correction and  are empty and no correction card is rendered. For an incorrect latest message, the card contains exactly Korrektur and Erklärung. The reply must answer the communicative intent and continue the conversation naturally.
