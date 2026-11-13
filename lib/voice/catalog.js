// Catalog intelligence for the voice agent: multilingual product matching,
// inventory stats and data-backed suggestions. Pure functions, no I/O.

import { normalizeText } from './language.js';

export const LOW_STOCK_LIMIT = 10;

// Spoken Hindi / Kannada / Hinglish words -> English catalog words.
// Grows over time (in the official app this table lives in the database and
// is fed by user corrections).
export const SYNONYMS = {
  // Groceries
  aata: ['flour'], atta: ['flour'], 'आटा': ['flour'], hittu: ['flour'], 'ಹಿಟ್ಟು': ['flour'],
  chawal: ['rice'], chaawal: ['rice'], 'चावल': ['rice'], akki: ['rice'], 'ಅಕ್ಕಿ': ['rice'],
  doodh: ['milk'], dudh: ['milk'], 'दूध': ['milk'], haalu: ['milk'], halu: ['milk'], 'ಹಾಲು': ['milk'],
  tel: ['oil'], 'तेल': ['oil'], enne: ['oil'], 'ಎಣ್ಣೆ': ['oil'],
  paani: ['water'], pani: ['water'], 'पानी': ['water'], neeru: ['water'], 'ನೀರು': ['water'],
  anda: ['eggs', 'egg'], ande: ['eggs', 'egg'], 'अंडा': ['eggs'], 'अंडे': ['eggs'], motte: ['eggs'], 'ಮೊಟ್ಟೆ': ['eggs'],
  seb: ['apple'], 'सेब': ['apple'], sebu: ['apple'], 'ಸೇಬು': ['apple'],
  aloo: ['potatoes', 'potato'], aalu: ['potatoes'], 'आलू': ['potatoes'], alugadde: ['potatoes'], 'ಆಲೂಗಡ್ಡೆ': ['potatoes'],
  pyaz: ['onions', 'onion'], pyaaz: ['onions'], 'प्याज': ['onions'], eerulli: ['onions'], 'ಈರುಳ್ಳಿ': ['onions'],
  nimbu: ['lemon'], 'नींबू': ['lemon'], nimbe: ['lemon'], 'ನಿಂಬೆ': ['lemon'],
  shahad: ['honey'], shehad: ['honey'], 'शहद': ['honey'], jenu: ['honey'], 'ಜೇನು': ['honey'],
  machli: ['fish'], machhli: ['fish'], 'मछली': ['fish'], meenu: ['fish'], 'ಮೀನು': ['fish'],
  murga: ['chicken'], murgi: ['chicken'], 'मुर्गा': ['chicken'], koli: ['chicken'], 'ಕೋಳಿ': ['chicken'],
  kheera: ['cucumber'], 'खीरा': ['cucumber'], southekayi: ['cucumber'], 'ಸೌತೆಕಾಯಿ': ['cucumber'],
  mirch: ['chili', 'pepper'], mirchi: ['chili', 'pepper'], 'मिर्च': ['chili'], menasinakayi: ['chili'], 'ಮೆಣಸಿನಕಾಯಿ': ['chili'],
  chini: ['sugar'], cheeni: ['sugar'], 'चीनी': ['sugar'], sakkare: ['sugar'], 'ಸಕ್ಕರೆ': ['sugar'],
  sabun: ['soap'], 'साबुन': ['soap'], sopu: ['soap'], 'ಸೋಪು': ['soap'],
  kaafi: ['coffee'], 'कॉफी': ['coffee'], 'ಕಾಫಿ': ['coffee'],
  ras: ['juice'], 'जूस': ['juice'], 'ಜ್ಯೂಸ್': ['juice'],
  gosht: ['beef', 'meat'], maans: ['meat'],
  kutta: ['dog'], kutte: ['dog'], 'कुत्ते': ['dog'], nayi: ['dog'], 'ನಾಯಿ': ['dog'],
  billi: ['cat'], 'बिल्ली': ['cat'], bekku: ['cat'], 'ಬೆಕ್ಕು': ['cat'],
  khana: ['food'], 'खाना': ['food'], aahara: ['food'], 'ಆಹಾರ': ['food'],
  // General merchandise
  phone: ['smartphones', 'phone'], mobile: ['smartphones', 'phone'], 'फोन': ['smartphones'], 'ಫೋನ್': ['smartphones'],
  ghadi: ['watch', 'watches'], 'घड़ी': ['watch'], gadiyara: ['watch'], 'ಗಡಿಯಾರ': ['watch'],
  joota: ['shoes'], joote: ['shoes'], 'जूते': ['shoes'], chappal: ['shoes'],
  chashma: ['sunglasses'], 'चश्मा': ['sunglasses'], kannadaka: ['sunglasses'],
  kursi: ['chair'], 'कुर्सी': ['chair'], 'ಕುರ್ಚಿ': ['chair'],
  palang: ['bed'], 'पलंग': ['bed'], 'ಮಂಚ': ['bed'],
  itra: ['perfume', 'fragrances'], 'इत्र': ['perfume'], sugandha: ['perfume'],
  kurta: ['shirt'], kameez: ['shirt'], 'ಅಂಗಿ': ['shirt'],
  bag: ['bag', 'bags'], thaila: ['bag'], 'थैला': ['bag'],
};

function tokens(text) {
  return normalizeText(text).split(' ').filter((t) => t.length > 0);
}

function trigrams(word) {
  const w = `  ${word} `;
  const set = new Set();
  for (let i = 0; i < w.length - 2; i += 1) set.add(w.slice(i, i + 3));
  return set;
}

export function trigramSimilarity(a, b) {
  const A = trigrams(a);
  const B = trigrams(b);
  let shared = 0;
  for (const g of A) if (B.has(g)) shared += 1;
  return shared / (A.size + B.size - shared || 1);
}

/** Expands a spoken query into English catalog words (keeps the originals). */
export function expandQuery(query) {
  const out = [];
  for (const t of tokens(query)) {
    out.push(t);
    if (SYNONYMS[t]) out.push(...SYNONYMS[t]);
  }
  // Words that carry no product meaning in any of the three languages.
  const stop = new Set(['ka', 'ki', 'ke', 'the', 'a', 'an', 'of', 'show', 'me', 'dikhao', 'kitna', 'kitne',
    'hai', 'hain', 'stock', 'price', 'kar', 'do', 'please', 'ji', 'wala', 'wali', 'ide', 'eshtu', 'thorisu']);
  return [...new Set(out.filter((t) => !stop.has(t) && t.length > 1))];
}

function productWords(p) {
  const text = [p.title, p.brand, p.category, ...(Array.isArray(p.tags) ? p.tags : [])]
    .filter(Boolean)
    .join(' ');
  return tokens(text.replace(/-/g, ' '));
}

/**
 * Scores every product against a spoken query.
 * Returns [{ product, score, confidence }] sorted best first. confidence is
 * 0..1: the share of query words that found a good match.
 */
export function matchProducts(products, query, { limit = 8 } = {}) {
  const q = expandQuery(query);
  if (q.length === 0) return [];
  const originalCount = Math.max(1, tokens(query).filter((t) => q.includes(t)).length);

  const results = [];
  for (const product of products || []) {
    const words = productWords(product);
    const title = normalizeText(product.title || '');
    let score = 0;
    let matchedOriginals = 0;
    const seenOriginal = new Set();

    for (const term of q) {
      let best = 0;
      for (const w of words) {
        if (w === term) best = Math.max(best, 3);
        else {
          const [short, long] = w.length <= term.length ? [w, term] : [term, w];
          if (short.length >= 3 && long.startsWith(short) && short.length / long.length >= 0.6) best = Math.max(best, 2);
          if (term.length > 3 && w.length > 3) {
            const sim = trigramSimilarity(term, w);
            if (sim >= 0.45) best = Math.max(best, 1 + 1.5 * sim);
          }
        }
      }
      if (best === 0 && term.length > 3 && title.includes(term)) best = 1;
      if (best > 0) {
        score += best;
        // Credit the original spoken word this term came from.
        const origin = tokens(query).find((t) => t === term || (SYNONYMS[t] || []).includes(term));
        if (origin && !seenOriginal.has(origin)) {
          seenOriginal.add(origin);
          matchedOriginals += 1;
        }
      }
    }
    if (score > 0) {
      const confidence = Math.min(1, (matchedOriginals / originalCount) * Math.min(1, score / 3));
      results.push({ product, score, confidence: Number(confidence.toFixed(2)) });
    }
  }
  results.sort((a, b) => b.score - a.score || Number(a.product.id) - Number(b.product.id));
  return results.slice(0, limit);
}

export function stockStatus(p) {
  const s = Number(p.stock) || 0;
  if (s === 0) return 'out';
  if (s <= LOW_STOCK_LIMIT) return 'low';
  return 'in';
}

export function filterByStock(products, status) {
  if (!status || status === 'any') return products;
  return products.filter((p) => stockStatus(p) === status);
}

/** Compact product shape for the model: only what it needs to talk about. */
export function brief(p) {
  return {
    id: Number(p.id),
    title: p.title,
    brand: p.brand || undefined,
    category: p.category,
    price: Number(p.price) || 0,
    stock: Number(p.stock) || 0,
    stock_status: stockStatus(p),
  };
}

export function inventorySummary(products) {
  const list = products || [];
  const categories = new Set(list.map((p) => p.category).filter(Boolean));
  const low = list.filter((p) => stockStatus(p) === 'low');
  const out = list.filter((p) => stockStatus(p) === 'out');
  const stockValue = list.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 0), 0);
  return {
    total_products: list.length,
    categories: categories.size,
    low_stock_count: low.length,
    out_of_stock_count: out.length,
    total_units: list.reduce((s, p) => s + (Number(p.stock) || 0), 0),
    stock_value: Number(stockValue.toFixed(2)),
    lowest_stock: [...low].sort((a, b) => a.stock - b.stock).slice(0, 3).map(brief),
  };
}

/**
 * Suggestions computed only from data, each with a reason the agent can say.
 * focus: 'overview' | 'restock' | 'pricing' | 'cleanup'
 */
export function computeSuggestions(products, focus = 'overview') {
  const list = products || [];
  const out = [];

  if (focus === 'overview' || focus === 'restock') {
    for (const p of list.filter((x) => stockStatus(x) === 'out').slice(0, 5)) {
      out.push({ kind: 'restock', product: brief(p), reason: 'Out of stock: customers cannot order it.', priority: 1 });
    }
    const low = list.filter((x) => stockStatus(x) === 'low').sort((a, b) => a.stock - b.stock);
    for (const p of low.slice(0, 5)) {
      out.push({ kind: 'restock', product: brief(p), reason: `Only ${p.stock} left.`, priority: 2 });
    }
  }

  if (focus === 'overview' || focus === 'pricing') {
    for (const p of list) {
      const cost = Number(p.costPrice);
      const price = Number(p.price);
      if (Number.isFinite(cost) && cost > 0 && price > 0) {
        const margin = (price - cost) / price;
        if (margin < 0) out.push({ kind: 'pricing', product: brief(p), reason: `Selling below cost (cost ${cost}, price ${price}).`, priority: 1 });
        else if (margin < 0.08) out.push({ kind: 'pricing', product: brief(p), reason: `Margin is only ${(margin * 100).toFixed(1)}%.`, priority: 3 });
      }
    }
  }

  if (focus === 'overview' || focus === 'cleanup') {
    const slow = list
      .filter((p) => Number(p.rating) > 0 && Number(p.rating) < 3 && Number(p.stock) > 50)
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 3);
    for (const p of slow) {
      out.push({
        kind: 'discount',
        product: brief(p),
        reason: `Low rating (${Number(p.rating).toFixed(1)}) with ${p.stock} units sitting in stock; a discount could clear it.`,
        priority: 3,
      });
    }
  }

  out.sort((a, b) => a.priority - b.priority);
  return out.slice(0, focus === 'overview' ? 6 : 8);
}
