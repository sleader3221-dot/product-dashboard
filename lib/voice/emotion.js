// Emotion layer. The Live model hears tone directly; this tracker adds hard
// signals from behaviour (repeats, self-corrections, undo, cancels, barge-ins,
// frustration words) plus the model's own report_user_state calls, and turns
// them into one short guidance line that rides along with every tool result.
// Everything here is an estimate, used only to adapt the agent's style.

import { normalizeText } from './language.js';

const HALF_LIFE_MS = 60_000;

const FRUSTRATION_WORDS = [
  // Hindi / Hinglish
  'bekaar', 'bakwas', 'gussa', 'pagal', 'kya kar raha', 'phir se', 'kitni baar', 'samajh nahi', 'galat',
  'बेकार', 'बकवास', 'गुस्सा', 'गलत', 'फिर से', 'कितनी बार',
  // Kannada
  'saaku', 'thappu', 'yaake heege', 'artha agilla', 'bejaaru', 'ಸಾಕು', 'ತಪ್ಪು', 'ಬೇಜಾರು', 'ಅರ್ಥ ಆಗಿಲ್ಲ',
  // English
  'wrong', 'useless', 'not what i said', 'again', 'stupid', 'annoying', 'ugh',
];
const CORRECTION_WORDS = ['nahi nahi', 'no no', 'no wait', 'illa illa', 'not that', 'woh nahi', 'ಅಲ್ಲ', 'नहीं नहीं'];
const RUSH_WORDS = ['jaldi', 'jaldi se', 'quick', 'fast', 'hurry', 'bega', 'ಬೇಗ', 'जल्दी'];
const CONFUSED_WORDS = ['kaise', 'samjha nahi', 'samajh nahi aaya', 'how do i', 'what do i', 'hege', 'ಹೇಗೆ', 'कैसे', 'matlab'];
const HAPPY_WORDS = ['thank', 'thanks', 'shukriya', 'dhanyavaad', 'badhiya', 'mast', 'super', 'chennagide', 'ಧನ್ಯವಾದ', 'ಚೆನ್ನಾಗಿದೆ', 'धन्यवाद', 'बढ़िया'];

function has(text, list) {
  return list.some((w) => text.includes(w));
}

export class EmotionTracker {
  constructor(now = () => Date.now()) {
    this.now = now;
    this.score = 0; // frustration 0..1
    this.updatedAt = now();
    this.lastUtterances = [];
    this.reported = null; // { state, confidence, at }
    this.flags = { rushed: 0, confused: 0, happy: 0 };
  }

  decay() {
    const t = this.now();
    const factor = Math.pow(0.5, (t - this.updatedAt) / HALF_LIFE_MS);
    this.score *= factor;
    for (const k of Object.keys(this.flags)) this.flags[k] *= factor;
    this.updatedAt = t;
  }

  bump(amount) {
    this.decay();
    this.score = Math.max(0, Math.min(1, this.score + amount));
  }

  onUserUtterance(raw) {
    const text = normalizeText(raw);
    if (!text) return;
    this.decay();
    if (has(text, FRUSTRATION_WORDS)) this.bump(0.3);
    if (has(text, CORRECTION_WORDS)) this.bump(0.15);
    if (has(text, RUSH_WORDS)) this.flags.rushed = Math.min(1, this.flags.rushed + 0.6);
    if (has(text, CONFUSED_WORDS)) this.flags.confused = Math.min(1, this.flags.confused + 0.6);
    if (has(text, HAPPY_WORDS)) {
      this.flags.happy = Math.min(1, this.flags.happy + 0.6);
      this.score *= 0.6;
    }
    // Saying nearly the same thing again usually means the last answer failed.
    if (this.lastUtterances.some((u) => similarity(u, text) > 0.8)) this.bump(0.2);
    this.lastUtterances = [text, ...this.lastUtterances].slice(0, 3);
  }

  onUndo() { this.bump(0.15); }
  onCancel() { this.bump(0.1); }
  onBargeIn() { this.bump(0.05); }
  onToolError() { this.bump(0.1); }

  onModelReport(state, confidence = 0.5) {
    this.decay();
    this.reported = { state, confidence: Number(confidence) || 0.5, at: this.now() };
    if (state === 'frustrated' || state === 'angry') this.bump(0.25 * this.reported.confidence + 0.1);
    if (state === 'rushed') this.flags.rushed = Math.min(1, this.flags.rushed + 0.5);
    if (state === 'confused') this.flags.confused = Math.min(1, this.flags.confused + 0.5);
    if (state === 'happy' || state === 'calm') this.score *= 0.7;
  }

  /** Current best estimate: { state, frustration, guidance } */
  snapshot() {
    this.decay();
    const recentReport = this.reported && this.now() - this.reported.at < 90_000 ? this.reported : null;
    let state = 'calm';
    if (this.score >= 0.6) state = 'frustrated';
    else if (this.flags.confused >= 0.4) state = 'confused';
    else if (this.flags.rushed >= 0.4) state = 'rushed';
    else if (this.score >= 0.35) state = 'impatient';
    else if (this.flags.happy >= 0.4) state = 'happy';
    if (recentReport && recentReport.confidence >= 0.7 && state === 'calm') state = recentReport.state;
    return { state, frustration: Number(this.score.toFixed(2)), guidance: GUIDANCE[state] || null };
  }
}

const GUIDANCE = {
  frustrated: 'User seems frustrated. Apologise once, keep the reply to one short sentence, confirm exactly what you understood, and offer the on-screen option.',
  angry: 'User seems upset. Stay calm and respectful, one short sentence, fix the problem first, no extra suggestions.',
  impatient: 'User seems impatient. Be brief and get straight to the result.',
  confused: 'User seems unsure. Guide one step at a time with one example phrase they can say.',
  rushed: 'User is in a hurry. Skip pleasantries; answer in as few words as possible.',
  sad: 'Be gentle and brief.',
  happy: null,
  calm: null,
};

function similarity(a, b) {
  const A = new Set(a.split(' '));
  const B = new Set(b.split(' '));
  let shared = 0;
  for (const w of A) if (B.has(w)) shared += 1;
  return shared / Math.max(A.size, B.size, 1);
}
