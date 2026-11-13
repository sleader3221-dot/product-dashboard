// Offline command parser used when the Gemini Live session is unavailable
// (no API key, quota reached, offline). Handles the core commands in Hindi,
// Kannada and English so the dashboard stays usable by voice for free.
// Output: { tool, args, reply? } in the same shape the Live model produces.

import { normalizeText, parseSpokenNumber, detectLanguage } from './language.js';

const RX = {
  undo: /\b(undo|wapas karo|wapas kar do|pehle jaisa|cancel last)\b|वापस|ವಾಪಸ್|ರದ್ದು|ಹಿಂದಕ್ಕೆ/,
  low: /(low stock|kam stock|stock kam|kam maal|kam bache|kadime stock|ಕಡಿಮೆ ಸ್ಟಾಕ್|ಕಡಿಮೆ|कम स्टॉक|कम बचे)/,
  out: /(out of stock|khatam|khatm|stock nahi|mugide|khaali|ಮುಗಿದ|ಖಾಲಿ|खत्म|ख़त्म)/,
  all: /^(show all|sab dikhao|sabhi dikhao|saare products|clear( filters)?|reset|ella thorisu|ಎಲ್ಲಾ ತೋರಿಸು|सब दिखाओ)$/,
  summary: /(summary|kitne products|total products|eshtu products|ಎಷ್ಟು ಪ್ರಾಡಕ್ಟ್|कितने प्रोडक्ट|overview|hisaab)/,
  suggest: /(suggest|suggestion|salah|sujhav|kya karu|kya karna chahiye|salahe|ಸಲಹೆ|सुझाव|सलाह)/,
  remove: /(delete|hata do|hatao|remove|nikal do|tegedu|ಡಿಲೀಟ್|ತೆಗೆ|हटा|डिलीट)/,
  setStock: /(stock|स्टॉक|ಸ್ಟಾಕ್).*(kar do|karo|set|make|maadi|ಮಾಡಿ|कर दो|करो|to)|(set|make).*(stock)/,
  addStock: /(aur|add|plus|badha|jodo|seri|ಸೇರಿಸಿ|जोड़|बढ़ा)/,
  minusStock: /(kam karo|kam kar do|minus|ghatao|reduce|kadime maadi|ಕಡಿಮೆ ಮಾಡಿ|घटा)/,
  sortCheap: /(sasta|cheap|kam daam|low price|ಕಡಿಮೆ ಬೆಲೆ|सस्ता)/,
  sortCostly: /(mehenga|costly|expensive|high price|zyada daam|ಹೆಚ್ಚು ಬೆಲೆ|महंगा)/,
  table: /(table view|list view|table mein|ಟೇಬಲ್)/,
  grid: /(grid view|card view|grid mein|ಗ್ರಿಡ್)/,
};

// Words to strip so what remains is the product phrase.
const FILLER = /\b(ka|ki|ke|ko|stock|price|daam|kitna|kitne|kitni|hai|hain|kar|do|karo|dikhao|dikhaiye|show|me|set|make|to|please|ji|aur|add|plus|the|of|units?|piece|pieces|packet|wala|wali|delete|hata|hatao|remove|search|find|dhundo|eshtu|ide|maadi|thorisu|beku|bele|minus|kam)\b/g;

function productPhrase(text) {
  return text
    .replace(/[0-9]+(\.[0-9]+)?/g, ' ')
    .replace(FILLER, ' ')
    .replace(/(स्टॉक|ಸ್ಟಾಕ್|कर दो|करो|ಮಾಡಿ|ತೋರಿಸು|ಎಷ್ಟು|ಬೆಲೆ|कितना|दिखाओ|ಇದೆ|ಡಿಲೀಟ್|ತೆಗೆ|हटा|डिलीट)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCommand(raw) {
  const text = normalizeText(raw);
  const lang = detectLanguage(raw);
  if (!text) return null;

  if (RX.undo.test(text)) return { tool: 'undo_last_action', args: {}, lang };
  if (RX.all.test(text)) return { tool: 'show_on_screen', args: { action: 'show_all' }, lang };
  if (RX.table.test(text)) return { tool: 'show_on_screen', args: { action: 'set_view', view: 'table' }, lang };
  if (RX.grid.test(text)) return { tool: 'show_on_screen', args: { action: 'set_view', view: 'grid' }, lang };
  if (RX.suggest.test(text)) return { tool: 'suggest_actions', args: { focus: 'overview' }, lang };

  const phrase = productPhrase(text);
  const n = parseSpokenNumber(text);

  if (RX.remove.test(text)) {
    if (RX.out.test(text)) return { tool: 'delete_products', args: { filter: { stock_status: 'out' } }, lang };
    if (phrase) return { tool: 'delete_products', args: { filter: { query: phrase } }, lang, needsSingleMatch: true };
  }

  if (n !== null && phrase && (RX.setStock.test(text) || RX.addStock.test(text) || RX.minusStock.test(text))) {
    if (RX.minusStock.test(text)) return { tool: 'adjust_stock', args: { change: -Math.abs(n) }, query: phrase, lang };
    if (RX.addStock.test(text) && !RX.setStock.test(text)) return { tool: 'adjust_stock', args: { change: Math.abs(n) }, query: phrase, lang };
    return { tool: 'adjust_stock', args: { set_to: n }, query: phrase, lang };
  }

  if (RX.low.test(text)) return { tool: 'search_products', args: { query: '', stock_status: 'low' }, lang };
  if (RX.out.test(text)) return { tool: 'search_products', args: { query: '', stock_status: 'out' }, lang };
  if (RX.summary.test(text)) return { tool: 'get_inventory_summary', args: {}, lang };
  if (RX.sortCheap.test(text)) return { tool: 'show_on_screen', args: { action: 'sort', sort: 'price-asc' }, lang };
  if (RX.sortCostly.test(text)) return { tool: 'show_on_screen', args: { action: 'sort', sort: 'price-desc' }, lang };

  if (phrase) return { tool: 'search_products', args: { query: phrase }, lang };
  return null;
}

const T = {
  en: {
    notUnderstood: 'Sorry, I did not catch that. Try "show low stock" or "rice stock 20".',
    found: (n, top) => (n ? `Found ${n}. ${top}.` : 'No product matched.'),
    low: (n, top) => (n ? `${n} products are low on stock. ${top}.` : 'Nothing is low on stock.'),
    out: (n, top) => (n ? `${n} products are out of stock. ${top}.` : 'Nothing is out of stock.'),
    stock: (t, a, b) => `${t}: stock ${a} to ${b}. Say undo to reverse.`,
    which: (opts) => `Which one: ${opts}?`,
    summary: (s) => `${s.total_products} products, ${s.low_stock_count} low on stock, ${s.out_of_stock_count} out of stock.`,
    confirm: (n) => `Please check the ${n} items on screen and tap the button to confirm.`,
    undone: (l) => `Undone: ${l}.`,
    nothingUndo: 'Nothing to undo.',
    done: 'Done.',
    suggest: (s) => (s.length ? `${s.length} suggestions. First: ${s[0].product.title}, ${s[0].reason}` : 'Nothing needs attention right now.'),
  },
  hi: {
    notUnderstood: 'Maaf kijiye, samajh nahi aaya. Boliye "low stock dikhao" ya "rice ka stock 20 kar do".',
    found: (n, top) => (n ? `${n} mile. ${top}.` : 'Koi product nahi mila.'),
    low: (n, top) => (n ? `${n} products ka stock kam hai. ${top}.` : 'Kisi ka stock kam nahi hai.'),
    out: (n, top) => (n ? `${n} products khatam hain. ${top}.` : 'Koi product khatam nahi hai.'),
    stock: (t, a, b) => `${t} ka stock ${a} se ${b} kar diya. Undo bolkar wapas kar sakte hain.`,
    which: (opts) => `Kaun sa: ${opts}?`,
    summary: (s) => `Kul ${s.total_products} products, ${s.low_stock_count} ka stock kam, ${s.out_of_stock_count} khatam.`,
    confirm: (n) => `Screen pe ${n} items dekh lijiye aur confirm button dabaiye.`,
    undone: (l) => `Wapas kar diya: ${l}.`,
    nothingUndo: 'Wapas karne ko kuch nahi hai.',
    done: 'Ho gaya.',
    suggest: (s) => (s.length ? `${s.length} sujhav hain. Pehla: ${s[0].product.title}, ${s[0].reason}` : 'Abhi kuch karne ki zaroorat nahi.'),
  },
  kn: {
    notUnderstood: 'ಕ್ಷಮಿಸಿ, ಅರ್ಥ ಆಗಲಿಲ್ಲ. "low stock ತೋರಿಸು" ಅಥವಾ "rice stock 20 ಮಾಡಿ" ಅಂತ ಹೇಳಿ.',
    found: (n, top) => (n ? `${n} ಸಿಕ್ಕಿವೆ. ${top}.` : 'ಯಾವ ಪ್ರಾಡಕ್ಟ್ ಸಿಗಲಿಲ್ಲ.'),
    low: (n, top) => (n ? `${n} ಪ್ರಾಡಕ್ಟ್ ಸ್ಟಾಕ್ ಕಡಿಮೆ ಇದೆ. ${top}.` : 'ಯಾವುದರ ಸ್ಟಾಕ್ ಕಡಿಮೆ ಇಲ್ಲ.'),
    out: (n, top) => (n ? `${n} ಪ್ರಾಡಕ್ಟ್ ಮುಗಿದಿವೆ. ${top}.` : 'ಯಾವುದೂ ಮುಗಿದಿಲ್ಲ.'),
    stock: (t, a, b) => `${t} ಸ್ಟಾಕ್ ${a} ಇಂದ ${b} ಮಾಡಿದೆ. undo ಅಂದರೆ ವಾಪಸ್ ಆಗುತ್ತೆ.`,
    which: (opts) => `ಯಾವುದು: ${opts}?`,
    summary: (s) => `ಒಟ್ಟು ${s.total_products} ಪ್ರಾಡಕ್ಟ್, ${s.low_stock_count} ಸ್ಟಾಕ್ ಕಡಿಮೆ, ${s.out_of_stock_count} ಮುಗಿದಿವೆ.`,
    confirm: (n) => `ಸ್ಕ್ರೀನ್ ಮೇಲೆ ${n} ಐಟಂ ನೋಡಿ, ಬಟನ್ ಒತ್ತಿ ಖಚಿತಪಡಿಸಿ.`,
    undone: (l) => `ವಾಪಸ್ ಮಾಡಿದೆ: ${l}.`,
    nothingUndo: 'ವಾಪಸ್ ಮಾಡಲು ಏನೂ ಇಲ್ಲ.',
    done: 'ಆಯ್ತು.',
    suggest: (s) => (s.length ? `${s.length} ಸಲಹೆಗಳಿವೆ. ಮೊದಲನೆಯದು: ${s[0].product.title}, ${s[0].reason}` : 'ಈಗ ಏನೂ ಮಾಡಬೇಕಿಲ್ಲ.'),
  },
};

function topThree(results) {
  return (results || []).slice(0, 3).map((r) => `${r.title} (${r.stock})`).join(', ');
}

/**
 * Runs one utterance end to end with the executor and returns the text to speak.
 * `lang` overrides detection (from the language picker).
 */
export async function runFallback(raw, executor, langPref = 'auto') {
  const cmd = parseCommand(raw);
  const lang = langPref !== 'auto' ? langPref : cmd?.lang || detectLanguage(raw);
  const t = T[lang] || T.en;
  if (!cmd) return t.notUnderstood;

  // Commands about one named product: resolve it first.
  if (cmd.query) {
    const found = await executor.execute('search_products', { query: cmd.query, show_on_screen: false });
    const strong = (found.results || []).filter((r) => r.match_confidence >= 0.5);
    if (!strong.length) return t.found(0, '');
    if (strong.length > 1 && strong[0].match_confidence === strong[1].match_confidence) {
      return t.which(strong.slice(0, 3).map((r) => r.title).join(', '));
    }
    const res = await executor.execute(cmd.tool, { ...cmd.args, product_id: strong[0].id });
    if (!res.ok) return res.error;
    return t.stock(res.product, res.stock_before, res.stock_after);
  }

  const res = await executor.execute(cmd.tool, cmd.args);
  if (res.ok === false) return cmd.tool === 'undo_last_action' ? t.nothingUndo : res.error;

  switch (cmd.tool) {
    case 'search_products':
      if (cmd.args.stock_status === 'low') return t.low(res.total_matches, topThree(res.results));
      if (cmd.args.stock_status === 'out') return t.out(res.total_matches, topThree(res.results));
      return t.found(res.total_matches, topThree(res.results));
    case 'get_inventory_summary': return t.summary(res);
    case 'suggest_actions': return t.suggest(res.suggestions || []);
    case 'delete_products':
    case 'bulk_adjust_stock': return t.confirm(res.count);
    case 'undo_last_action': return t.undone(res.undone);
    default: return t.done;
  }
}
