// Language helpers shared by the voice agent: script detection, digit
// normalisation and spoken-number parsing for Hindi, Kannada and English
// (including Hinglish / Kannada written in Latin script).
// Pure functions only, so they run in the browser, on the server and in tests.

const DEVANAGARI = /[\u0900-\u097F]/;
const KANNADA = /[\u0C80-\u0CFF]/;

/** Best guess of the language of a short utterance: 'hi' | 'kn' | 'en'. */
export function detectLanguage(text = '') {
  if (KANNADA.test(text)) return 'kn';
  if (DEVANAGARI.test(text)) return 'hi';
  const t = ` ${text.toLowerCase()} `;
  const kn = [' illa', ' maadi', ' beku', ' eshtu', ' ide ', ' haaku', ' thorisu', ' hudukU', ' saaku', ' houdu', ' banni', ' enu ', ' yaava'];
  const hi = [' hai', ' kar do', ' karo', ' kitna', ' kitne', ' dikhao', ' nahi', ' kya ', ' wala', ' hata', ' mein', ' ka ', ' ki ', ' ke ', ' bhai', ' haan'];
  const knHits = kn.filter((w) => t.includes(w.toLowerCase())).length;
  const hiHits = hi.filter((w) => t.includes(w)).length;
  if (knHits > hiHits && knHits > 0) return 'kn';
  if (hiHits > 0) return 'hi';
  return 'en';
}

/** Converts Devanagari (०-९) and Kannada (೦-೯) digits to ASCII digits. */
export function normalizeDigits(text = '') {
  return text
    .replace(/[\u0966-\u096F]/g, (d) => String(d.charCodeAt(0) - 0x0966))
    .replace(/[\u0CE6-\u0CEF]/g, (d) => String(d.charCodeAt(0) - 0x0CE6));
}

// Spoken number words. Values are units; multipliers are handled separately.
const NUMBER_WORDS = {
  // English
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, half: 0.5, quarter: 0.25, dozen: 12,
  // Hindi (Latin)
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, chhah: 6, che: 6,
  saat: 7, aath: 8, nau: 9, das: 10, gyarah: 11, barah: 12, baarah: 12, terah: 13, chaudah: 14,
  pandrah: 15, solah: 16, satrah: 17, atharah: 18, unnis: 19, bees: 20, pachees: 25, pachchis: 25,
  tees: 30, chalis: 40, chalees: 40, pachas: 50, pachaas: 50, saath: 60, sattar: 70, assi: 80,
  nabbe: 90, aadha: 0.5, adha: 0.5, paav: 0.25, pav: 0.25, dedh: 1.5, dhai: 2.5, dhaai: 2.5,
  darjan: 12,
  // Hindi (Devanagari)
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'छह': 6, 'छः': 6, 'सात': 7,
  'आठ': 8, 'नौ': 9, 'दस': 10, 'बीस': 20, 'पच्चीस': 25, 'तीस': 30, 'चालीस': 40, 'पचास': 50,
  'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90, 'आधा': 0.5, 'पाव': 0.25, 'डेढ़': 1.5,
  'ढाई': 2.5, 'दर्जन': 12,
  // Kannada (Latin)
  ondu: 1, eradu: 2, mooru: 3, muru: 3, naalku: 4, nalku: 4, aidu: 5, aaru: 6, elu: 7, yelu: 7,
  entu: 8, ombattu: 9, hattu: 10, hannondu: 11, hanneradu: 12, ippattu: 20, ipattu: 20,
  muvattu: 30, moovattu: 30, nalavattu: 40, aivattu: 50, aravattu: 60, eppattu: 70,
  embattu: 80, tombattu: 90, ardha: 0.5,
  // Kannada (script)
  'ಒಂದು': 1, 'ಎರಡು': 2, 'ಮೂರು': 3, 'ನಾಲ್ಕು': 4, 'ಐದು': 5, 'ಆರು': 6, 'ಏಳು': 7, 'ಎಂಟು': 8,
  'ಒಂಬತ್ತು': 9, 'ಹತ್ತು': 10, 'ಇಪ್ಪತ್ತು': 20, 'ಮೂವತ್ತು': 30, 'ನಲವತ್ತು': 40, 'ಐವತ್ತು': 50,
  'ಅರವತ್ತು': 60, 'ಎಪ್ಪತ್ತು': 70, 'ಎಂಬತ್ತು': 80, 'ತೊಂಬತ್ತು': 90, 'ಅರ್ಧ': 0.5,
};

const MULTIPLIERS = {
  hundred: 100, sau: 100, 'सौ': 100, nooru: 100, nuru: 100, 'ನೂರು': 100,
  thousand: 1000, hazaar: 1000, hazar: 1000, 'हज़ार': 1000, 'हजार': 1000, saavira: 1000, 'ಸಾವಿರ': 1000,
};

function cleanToken(tok) {
  return tok.toLowerCase().replace(/[.,!?।॥"'()]/g, '');
}

/**
 * Parses the first number in an utterance, from digits or spoken words.
 * Returns null when there is no number. Examples:
 *   "stock 20 kar do" -> 20, "do sau" -> 200, "dhai sau" -> 250,
 *   "ಇಪ್ಪತ್ತು" -> 20, "twenty five" -> 25, "पचास" -> 50.
 */
export function parseSpokenNumber(text = '') {
  const normalized = normalizeDigits(text);
  const digit = normalized.match(/-?\d+(?:\.\d+)?/);
  if (digit) return Number(digit[0]);

  const tokens = normalized.split(/\s+/).map(cleanToken).filter(Boolean);
  let total = 0;
  let current = null;
  let found = false;
  for (const tok of tokens) {
    if (tok in NUMBER_WORDS) {
      current = (current ?? 0) + NUMBER_WORDS[tok];
      found = true;
    } else if (tok in MULTIPLIERS) {
      current = (current ?? 1) * MULTIPLIERS[tok];
      total += current;
      current = null;
      found = true;
    } else if (found) {
      break; // number phrase ended
    }
  }
  if (!found) return null;
  return total + (current ?? 0);
}

/** Lower-case, digit-normalised, punctuation-free text for matching. */
export function normalizeText(text = '') {
  return normalizeDigits(String(text))
    .toLowerCase()
    .replace(/[.,!?।॥"'()[\]{}:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const LANGUAGE_NAMES = { hi: 'Hindi', kn: 'Kannada', en: 'English' };
export const SPEECH_LOCALES = { hi: 'hi-IN', kn: 'kn-IN', en: 'en-IN' };
