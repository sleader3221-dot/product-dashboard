// Runs the model's tool calls against the dashboard. Environment-agnostic: the
// dashboard passes a `ctx` with data accessors, write actions and UI controls,
// so the same executor works in the official app with a different ctx.

import {
  trigramSimilarity, matchProducts, filterByStock, brief, inventorySummary, computeSuggestions, stockStatus,
} from './catalog.js';
import { TOOL_RISK } from './tools.js';

const MAX_LIST = 8;

function fail(message, extra = {}) {
  return { ok: false, error: message, ...extra };
}

function isNonNegInt(n) {
  return Number.isInteger(n) && n >= 0;
}

export function createExecutor(ctx) {
  const undoStack = [];

  const products = () => ctx.getProducts() || [];
  const findById = (id) => products().find((p) => Number(p.id) === Number(id));

  function selectProducts({ product_ids, filter } = {}) {
    if (Array.isArray(product_ids) && product_ids.length) {
      const found = product_ids.map(findById).filter(Boolean);
      return { items: found, missing: product_ids.filter((id) => !findById(id)) };
    }
    if (filter && (filter.stock_status || filter.category || filter.query)) {
      let list = products();
      if (filter.category) list = list.filter((p) => (p.category || '').toLowerCase() === filter.category.toLowerCase());
      list = filterByStock(list, filter.stock_status);
      if (filter.query) {
        const ids = new Set(matchProducts(list, filter.query, { limit: 50 }).filter((m) => m.confidence >= 0.5).map((m) => Number(m.product.id)));
        list = list.filter((p) => ids.has(Number(p.id)));
      }
      return { items: list, missing: [] };
    }
    return { items: [], missing: [] };
  }

  function pushUndo(label, undo) {
    undoStack.push({ label, undo, at: Date.now() });
    if (undoStack.length > 20) undoStack.shift();
    ctx.onChange?.({ label, canUndo: true });
  }

  function categoryCheck(category) {
    const cats = (ctx.getCategories?.() || []).map((c) => (typeof c === 'string' ? c : c.slug));
    if (!cats.length) return { ok: true, slug: category };
    const slug = String(category || '').toLowerCase().trim().replace(/\s+/g, '-');
    if (cats.includes(slug)) return { ok: true, slug };
    const ranked = cats
      .map((c) => ({ c, sim: trigramSimilarity(slug, c) }))
      .sort((a, b) => b.sim - a.sim);
    if (ranked[0] && ranked[0].sim >= 0.5 && (!ranked[1] || ranked[0].sim - ranked[1].sim >= 0.15)) {
      return { ok: true, slug: ranked[0].c };
    }
    const close = cats.filter((c) => c.includes(slug) || slug.includes(c) || c.split('-').some((w) => slug.includes(w)));
    return { ok: false, suggestions: (close.length ? close : cats).slice(0, 6) };
  }

  async function setStock(product, newStock, label) {
    const before = Number(product.stock) || 0;
    const ok = await ctx.actions.update(product.id, { stock: newStock });
    if (!ok) return fail('The update failed. Ask the user to try again or use the edit button.');
    ctx.ui.highlight?.([Number(product.id)]);
    pushUndo(label || `${product.title} stock ${before} → ${newStock}`, () => ctx.actions.update(product.id, { stock: before }));
    return { ok: true, product: product.title, product_id: Number(product.id), stock_before: before, stock_after: newStock, undo_available: true };
  }

  const handlers = {
    search_products({ query = '', category, stock_status = 'any', show_on_screen = true }) {
      let list = products();
      if (category) list = list.filter((p) => (p.category || '').toLowerCase() === category.toLowerCase());
      list = filterByStock(list, stock_status);

      let matches;
      if (query && query.trim()) {
        matches = matchProducts(list, query, { limit: 20 });
      } else {
        // Listing by filter: most urgent (lowest stock) first.
        matches = [...list]
          .sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0))
          .map((p) => ({ product: p, score: 1, confidence: 1 }));
      }
      const strong = matches.filter((m) => m.confidence >= 0.5);
      const shown = (strong.length ? strong : matches);
      if (show_on_screen && shown.length) {
        ctx.ui.showIds?.(
          shown.map((m) => Number(m.product.id)),
          query || { low: 'Low stock', out: 'Out of stock', in: 'In stock' }[stock_status] || category || 'All products'
        );
      }
      return {
        ok: true,
        total_matches: shown.length,
        results: shown.slice(0, MAX_LIST).map((m) => ({ ...brief(m.product), match_confidence: m.confidence })),
        note: !matches.length
          ? 'No product matched. Say so and offer to search differently.'
          : strong.length === 0
            ? 'Only weak matches. Ask the user which one they meant.'
            : shown.length > MAX_LIST ? `Showing ${MAX_LIST} of ${shown.length}; the rest are on screen.` : undefined,
      };
    },

    get_product({ product_id }) {
      const p = findById(product_id);
      if (!p) return fail(`No product with id ${product_id}.`);
      return {
        ok: true,
        product: {
          ...brief(p),
          description: p.description ? String(p.description).slice(0, 220) : undefined,
          cost_price: p.costPrice ?? undefined,
          rating: p.rating ?? undefined,
          discount_percent: p.discountPercentage ?? undefined,
          sku: p.sku ?? undefined,
        },
      };
    },

    get_inventory_summary() {
      return { ok: true, ...inventorySummary(products()) };
    },

    suggest_actions({ focus = 'overview' }) {
      const suggestions = computeSuggestions(products(), focus);
      return { ok: true, suggestions, note: suggestions.length ? undefined : 'Nothing needs attention right now.' };
    },

    get_screen_state() {
      return { ok: true, ...(ctx.ui.getScreenState?.() || {}) };
    },

    show_on_screen({ action, product_ids, category, sort, view, page }) {
      const ui = ctx.ui;
      switch (action) {
        case 'show_all':
        case 'clear_filters': ui.clearFilters?.(); break;
        case 'show_ids':
          if (!product_ids?.length) return fail('product_ids is required for show_ids.');
          ui.showIds?.(product_ids.map(Number), 'selected');
          break;
        case 'filter_low_stock': ui.setStockFilter?.('low_stock'); break;
        case 'filter_out_of_stock': ui.setStockFilter?.('out_of_stock'); break;
        case 'filter_category': {
          const c = categoryCheck(category);
          if (!c.ok) return fail(`Unknown category "${category}".`, { closest_categories: c.suggestions });
          ui.setCategory?.(c.slug);
          break;
        }
        case 'sort': ui.setSort?.(sort || 'default'); break;
        case 'set_view': ui.setView?.(view === 'table' ? 'table' : 'grid'); break;
        case 'go_to_page': ui.goToPage?.(Math.max(1, Number(page) || 1)); break;
        default: return fail(`Unknown action ${action}.`);
      }
      return { ok: true, done: action };
    },

    open_product({ product_id, mode = 'view' }) {
      const p = findById(product_id);
      if (!p) return fail(`No product with id ${product_id}.`);
      ctx.ui.openProduct?.(p, mode);
      return { ok: true, opened: p.title, mode };
    },

    async update_product({ product_id, title, price, stock, category, cost_price }) {
      const p = findById(product_id);
      if (!p) return fail(`No product with id ${product_id}.`);
      const changes = {};
      if (title !== undefined) {
        if (String(title).trim().length < 3) return fail('Title must be at least 3 characters.');
        changes.title = String(title).trim();
      }
      if (price !== undefined) {
        if (!(Number(price) > 0)) return fail('Price must be more than 0.');
        changes.price = Number(Number(price).toFixed(2));
      }
      if (stock !== undefined) {
        if (!isNonNegInt(Number(stock))) return fail('Stock must be a whole number, 0 or more.');
        changes.stock = Number(stock);
      }
      if (category !== undefined) {
        const c = categoryCheck(category);
        if (!c.ok) return fail(`Unknown category "${category}".`, { closest_categories: c.suggestions });
        changes.category = c.slug;
      }
      if (cost_price !== undefined) {
        if (!(Number(cost_price) >= 0)) return fail('Cost price cannot be negative.');
        changes.costPrice = Number(Number(cost_price).toFixed(2));
      }
      if (!Object.keys(changes).length) return fail('Nothing to change.');

      const before = Object.fromEntries(Object.keys(changes).map((k) => [k, p[k]]));
      const ok = await ctx.actions.update(p.id, changes);
      if (!ok) return fail('The update failed.');
      ctx.ui.highlight?.([Number(p.id)]);
      pushUndo(`${p.title} updated`, () => ctx.actions.update(p.id, before));
      return { ok: true, product: p.title, product_id: Number(p.id), before, after: changes, undo_available: true };
    },

    async adjust_stock({ product_id, change, set_to }) {
      const p = findById(product_id);
      if (!p) return fail(`No product with id ${product_id}.`);
      const current = Number(p.stock) || 0;
      let next;
      if (set_to !== undefined && set_to !== null) next = Number(set_to);
      else if (change !== undefined && change !== null) next = current + Number(change);
      else return fail('Give change or set_to.');
      if (!isNonNegInt(next)) return fail(`That would make stock ${next}; stock must be a whole number, 0 or more.`, { current_stock: current });
      return setStock(p, next);
    },

    async add_product({ title, category, price, stock, cost_price, thumbnail }) {
      if (!title || String(title).trim().length < 3) return fail('Need a product name of at least 3 characters.');
      if (!(Number(price) > 0)) return fail('Need a price above 0.');
      if (!isNonNegInt(Number(stock))) return fail('Need stock as a whole number, 0 or more.');
      const c = categoryCheck(category);
      if (!c.ok) return fail(`Unknown category "${category}".`, { closest_categories: c.suggestions });

      let image = thumbnail;
      try {
        if (!image || !['http:', 'https:'].includes(new URL(image).protocol)) throw new Error('bad');
      } catch {
        image = `https://placehold.co/400x400/png?text=${encodeURIComponent(String(title).trim().slice(0, 24))}`;
      }
      const payload = {
        title: String(title).trim(),
        category: c.slug,
        price: Number(Number(price).toFixed(2)),
        stock: Number(stock),
        thumbnail: image,
      };
      if (cost_price !== undefined && Number(cost_price) >= 0) payload.costPrice = Number(Number(cost_price).toFixed(2));

      const created = await ctx.actions.add(payload);
      if (!created) return fail('Could not add the product.');
      const id = Number(created.id);
      ctx.ui.highlight?.([id]);
      pushUndo(`${payload.title} added`, () => ctx.actions.remove(id));
      return { ok: true, created: { ...brief(created) }, undo_available: true };
    },

    bulk_adjust_stock({ product_ids, filter, change, set_to }) {
      const { items, missing } = selectProducts({ product_ids, filter });
      if (!items.length) return fail('No products matched.', { missing_ids: missing });
      if ((change === undefined || change === null) && (set_to === undefined || set_to === null)) return fail('Give change or set_to.');
      const rows = items.map((p) => {
        const before = Number(p.stock) || 0;
        const after = set_to !== undefined && set_to !== null ? Number(set_to) : before + Number(change);
        return { id: Number(p.id), title: p.title, before, after };
      });
      const bad = rows.filter((r) => !isNonNegInt(r.after));
      if (bad.length) return fail(`${bad.length} products would go below 0 or to a fraction.`, { examples: bad.slice(0, 3) });

      ctx.requestConfirmation({
        kind: 'stock',
        title: `Change stock for ${rows.length} product${rows.length > 1 ? 's' : ''}`,
        confirmLabel: 'Update stock',
        rows: rows.map((r) => ({ ...r, beforeText: String(r.before), afterText: String(r.after) })),
        run: async () => {
          const done = [];
          for (const r of rows) {
            if (await ctx.actions.update(r.id, { stock: r.after })) done.push(r);
          }
          ctx.ui.highlight?.(done.map((r) => r.id));
          pushUndo(`Stock changed on ${done.length} products`, async () => {
            for (const r of done) await ctx.actions.update(r.id, { stock: r.before });
            return true;
          });
          return `stock updated for ${done.length} of ${rows.length} products`;
        },
      });
      return { ok: true, status: 'waiting_for_user_to_tap_confirm', count: rows.length, preview: rows.slice(0, 5) };
    },

    delete_products({ product_ids, filter }) {
      const { items, missing } = selectProducts({ product_ids, filter });
      if (!items.length) return fail('No products matched.', { missing_ids: missing });
      const snapshot = items.map((p) => ({ ...p }));
      ctx.requestConfirmation({
        kind: 'delete',
        title: `Delete ${items.length} product${items.length > 1 ? 's' : ''}`,
        confirmLabel: 'Delete',
        danger: true,
        rows: items.map((p) => ({ id: Number(p.id), title: p.title, beforeText: `${p.stock} in stock`, afterText: 'deleted' })),
        run: async () => {
          const done = [];
          for (const p of snapshot) {
            if (await ctx.actions.remove(p.id)) done.push(p);
          }
          pushUndo(`${done.length} products deleted`, async () => {
            for (const p of done) await ctx.actions.restore(p);
            return true;
          });
          return `deleted ${done.length} of ${snapshot.length} products`;
        },
      });
      return { ok: true, status: 'waiting_for_user_to_tap_confirm', count: items.length, preview: items.slice(0, 5).map(brief) };
    },

    async undo_last_action() {
      const last = undoStack.pop();
      if (!last) return fail('There is nothing to undo in this session.');
      ctx.emotion?.onUndo();
      const ok = await last.undo();
      ctx.onChange?.({ label: `Undid: ${last.label}`, canUndo: undoStack.length > 0 });
      return ok === false ? fail(`Could not undo "${last.label}".`) : { ok: true, undone: last.label };
    },

    report_user_state({ state, confidence = 0.5, cue }) {
      ctx.emotion?.onModelReport(state, confidence);
      ctx.onUserState?.({ state, confidence, cue });
      return { ok: true };
    },
  };

  async function execute(name, args = {}) {
    const handler = handlers[name];
    let result;
    if (!handler) {
      result = fail(`Unknown tool ${name}.`);
    } else {
      try {
        result = await handler(args || {});
      } catch (err) {
        result = fail(err?.message || 'Tool failed.');
      }
    }
    if (result && result.ok === false) ctx.emotion?.onToolError();
    const mood = ctx.emotion?.snapshot();
    if (mood?.guidance && name !== 'report_user_state') result.user_state_guidance = mood.guidance;
    ctx.onToolResult?.({ name, args, result, risk: TOOL_RISK[name] });
    return result;
  }

  return {
    execute,
    canUndo: () => undoStack.length > 0,
    undo: () => execute('undo_last_action', {}),
  };
}

export { stockStatus };
