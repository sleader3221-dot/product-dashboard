import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parseSpokenNumber, detectLanguage, normalizeDigits } from '../../lib/voice/language.js';
import { matchProducts, inventorySummary, computeSuggestions, expandQuery } from '../../lib/voice/catalog.js';
import { EmotionTracker } from '../../lib/voice/emotion.js';
import { parseCommand, runFallback } from '../../lib/voice/fallbackParser.js';
import { createExecutor } from '../../lib/voice/executor.js';
import { FUNCTION_DECLARATIONS, TOOL_RISK } from '../../lib/voice/tools.js';
import { buildSystemInstruction } from '../../lib/voice/systemPrompt.js';

const seed = JSON.parse(readFileSync(new URL('../../lib/seedProducts.json', import.meta.url), 'utf8'));

describe('language', () => {
  it('parses digits in every script', () => {
    assert.equal(normalizeDigits('२० और ೨೦'), '20 और 20');
    assert.equal(parseSpokenNumber('stock २५ kar do'), 25);
  });
  it('parses spoken numbers in Hindi, Kannada and English', () => {
    assert.equal(parseSpokenNumber('rice ka stock bees kar do'), 20);
    assert.equal(parseSpokenNumber('do sau'), 200);
    assert.equal(parseSpokenNumber('dhai sau'), 250);
    assert.equal(parseSpokenNumber('ಇಪ್ಪತ್ತು ಮಾಡಿ'), 20);
    assert.equal(parseSpokenNumber('twenty five units'), 25);
    assert.equal(parseSpokenNumber('पचास'), 50);
    assert.equal(parseSpokenNumber('no number here'), null);
  });
  it('detects language', () => {
    assert.equal(detectLanguage('ಅಕ್ಕಿ ಸ್ಟಾಕ್ ಎಷ್ಟು'), 'kn');
    assert.equal(detectLanguage('चावल कितना है'), 'hi');
    assert.equal(detectLanguage('rice ka stock kitna hai'), 'hi');
    assert.equal(detectLanguage('how much rice is left'), 'en');
  });
});

describe('catalog matcher', () => {
  it('maps Hindi and Kannada words to catalog products', () => {
    assert.ok(expandQuery('chawal').includes('rice'));
    for (const q of ['chawal', 'ಅಕ್ಕಿ', 'चावल', 'rice']) {
      const [top] = matchProducts(seed, q);
      assert.ok(top, `no match for ${q}`);
      assert.match(top.product.title, /rice/i, `wrong top match for ${q}`);
      assert.ok(top.confidence >= 0.5, `low confidence for ${q}`);
    }
  });
  it('tolerates small spelling differences', () => {
    const [top] = matchProducts(seed, 'potatos');
    assert.match(top.product.title, /potato/i);
  });
  it('returns nothing for unrelated words', () => {
    assert.equal(matchProducts(seed, 'zzqqxx').length, 0);
  });
  it('summarises inventory and suggests from data only', () => {
    const s = inventorySummary(seed);
    assert.equal(s.total_products, seed.length);
    const sug = computeSuggestions([{ id: 1, title: 'Test Oil', price: 10, costPrice: 12, stock: 0, category: 'groceries' }]);
    assert.ok(sug.some((x) => x.kind === 'restock'));
    assert.ok(sug.some((x) => x.kind === 'pricing' && /below cost/.test(x.reason)));
  });
});

describe('emotion tracker', () => {
  it('rises with frustration signals and decays over time', () => {
    let t = 0;
    const e = new EmotionTracker(() => t);
    e.onUserUtterance('rice ka stock dikhao');
    e.onUserUtterance('rice ka stock dikhao');
    e.onUserUtterance('nahi nahi galat hai, bekaar');
    assert.equal(e.snapshot().state, 'frustrated');
    assert.ok(e.snapshot().guidance);
    t += 5 * 60_000;
    assert.equal(e.snapshot().state, 'calm');
  });
  it('flags rushed users', () => {
    const e = new EmotionTracker();
    e.onUserUtterance('jaldi se low stock batao');
    assert.equal(e.snapshot().state, 'rushed');
  });
});

describe('tools contract', () => {
  it('every declared tool has a risk level and a handler', async () => {
    const ex = createExecutor(makeCtx([]).ctx);
    for (const fd of FUNCTION_DECLARATIONS) {
      assert.ok(TOOL_RISK[fd.name], `missing risk for ${fd.name}`);
      const r = await ex.execute(fd.name, {});
      assert.notEqual(r.error, `Unknown tool ${fd.name}.`);
    }
  });
  it('system prompt forbids money movement and invented numbers', () => {
    const p = buildSystemInstruction({ language: 'kn' });
    assert.match(p, /cannot take payments/);
    assert.match(p, /Never guess or invent/);
    assert.match(p, /Kannada/);
  });
});

function makeCtx(initial) {
  const state = { products: initial.map((p) => ({ ...p })), confirmations: [], highlighted: [] };
  const ctx = {
    getProducts: () => state.products,
    getCategories: () => ['groceries', 'beauty'],
    actions: {
      update: async (id, data) => {
        state.products = state.products.map((p) => (Number(p.id) === Number(id) ? { ...p, ...data } : p));
        return true;
      },
      add: async (data) => {
        const p = { ...data, id: 1000 + state.products.length };
        state.products = [p, ...state.products];
        return p;
      },
      remove: async (id) => {
        state.products = state.products.filter((p) => Number(p.id) !== Number(id));
        return true;
      },
      restore: async (p) => {
        state.products = [p, ...state.products];
        return true;
      },
    },
    ui: { highlight: (ids) => state.highlighted.push(...ids), showIds: () => {} },
    requestConfirmation: (req) => state.confirmations.push(req),
    emotion: new EmotionTracker(),
  };
  return { ctx, state };
}

const SAMPLE = [
  { id: 1, title: 'Basmati Rice', category: 'groceries', price: 5, stock: 12, tags: ['rice'] },
  { id: 2, title: 'Cooking Oil', category: 'groceries', price: 4, stock: 0, tags: ['oil'] },
  { id: 3, title: 'Milk', category: 'groceries', price: 2, stock: 3, tags: ['dairy'] },
];

describe('executor', () => {
  it('sets stock, validates, and undoes', async () => {
    const { ctx, state } = makeCtx(SAMPLE);
    const ex = createExecutor(ctx);
    const r = await ex.execute('adjust_stock', { product_id: 1, set_to: 20 });
    assert.equal(r.ok, true);
    assert.equal(r.stock_before, 12);
    assert.equal(state.products.find((p) => p.id === 1).stock, 20);
    const bad = await ex.execute('adjust_stock', { product_id: 1, change: -50 });
    assert.equal(bad.ok, false);
    await ex.execute('undo_last_action', {});
    assert.equal(state.products.find((p) => p.id === 1).stock, 12);
  });

  it('never deletes without the on-screen confirmation', async () => {
    const { ctx, state } = makeCtx(SAMPLE);
    const ex = createExecutor(ctx);
    const r = await ex.execute('delete_products', { filter: { stock_status: 'out' } });
    assert.equal(r.status, 'waiting_for_user_to_tap_confirm');
    assert.equal(state.products.length, 3, 'nothing deleted before confirm');
    await state.confirmations[0].run();
    assert.equal(state.products.length, 2);
    await ex.execute('undo_last_action', {});
    assert.equal(state.products.length, 3, 'undo restores deleted products');
  });

  it('rejects unknown categories with suggestions', async () => {
    const { ctx } = makeCtx(SAMPLE);
    const ex = createExecutor(ctx);
    const r = await ex.execute('add_product', { title: 'Toor Dal', category: 'grocery', price: 3, stock: 10 });
    assert.equal(r.ok, true, 'grocery should resolve to groceries');
    const r2 = await ex.execute('add_product', { title: 'Toor Dal', category: 'zzz', price: 3, stock: 10 });
    assert.equal(r2.ok, false);
    assert.ok(r2.closest_categories.length);
  });

  it('attaches mood guidance when the user is frustrated', async () => {
    const { ctx } = makeCtx(SAMPLE);
    ctx.emotion.onUserUtterance('bekaar hai yeh, galat, phir se');
    ctx.emotion.onUserUtterance('bekaar hai yeh, galat, phir se');
    const ex = createExecutor(ctx);
    const r = await ex.execute('get_inventory_summary', {});
    assert.ok(r.user_state_guidance);
  });
});

describe('offline fallback', () => {
  it('parses core commands in three languages', () => {
    assert.equal(parseCommand('low stock dikhao').args.stock_status, 'low');
    assert.equal(parseCommand('ಕಡಿಮೆ ಸ್ಟಾಕ್ ತೋರಿಸು').args.stock_status, 'low');
    const set = parseCommand('rice ka stock 20 kar do');
    assert.equal(set.tool, 'adjust_stock');
    assert.equal(set.args.set_to, 20);
    assert.equal(set.query, 'rice');
    assert.equal(parseCommand('undo').tool, 'undo_last_action');
    assert.equal(parseCommand('out of stock wale delete kar do').tool, 'delete_products');
  });
  it('runs a stock change end to end and answers in Hindi', async () => {
    const { ctx, state } = makeCtx(SAMPLE);
    const ex = createExecutor(ctx);
    const reply = await runFallback('chawal ka stock bees kar do', ex);
    assert.equal(state.products.find((p) => p.id === 1).stock, 20);
    assert.match(reply, /12 se 20/);
  });
  it('answers in Kannada', async () => {
    const { ctx } = makeCtx(SAMPLE);
    const ex = createExecutor(ctx);
    const reply = await runFallback('ಕಡಿಮೆ ಸ್ಟಾಕ್ ತೋರಿಸು', ex);
    assert.match(reply, /ಸ್ಟಾಕ್ ಕಡಿಮೆ ಇದೆ/);
  });
});
