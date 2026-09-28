import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { startNextServer } from '../helpers/next-server.mjs';

/**
 * End-to-end smoke tests for the production build.
 *
 * `npm run build` must have produced `.next` first; the helper boots
 * `next start` on TEST_PORT and talks to the real HTTP endpoints.
 */
describe('product dashboard API (production build)', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = await startNextServer();
    baseUrl = server.baseUrl;
  });

  after(async () => {
    await server?.stop();
  });

  const api = (path, init) => fetch(`${baseUrl}${path}`, init);

  const apiJson = async (path, init) => {
    const response = await api(path, init);
    return { response, body: await response.json() };
  };

  const jsonInit = (method, payload) => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  it('renders the dashboard shell', async () => {
    const response = await api('/');
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    assert.match(html, /DukaanSe/);
    assert.match(html, /Total Products/);
  });

  describe('GET /api/products', () => {
    it('serves the seeded catalogue', async () => {
      const { response, body } = await apiJson('/api/products');

      assert.equal(response.status, 200);
      assert.ok(Array.isArray(body.products));
      assert.ok(body.products.length >= 194, `expected >= 194 products, got ${body.products.length}`);
      assert.equal(body.total, body.products.length);
      assert.equal(body.storeStats.totalProducts, body.total);
    });

    it('honours the limit parameter without changing the filtered total', async () => {
      const { body } = await apiJson('/api/products?limit=5');

      assert.equal(body.products.length, 5);
      assert.ok(body.total >= body.products.length);
    });

    it('searches titles, categories and descriptions case-insensitively', async () => {
      const { body } = await apiJson('/api/products?q=PHONE&limit=100');

      assert.ok(body.products.length > 0, 'expected at least one match for "PHONE"');
      assert.ok(
        body.products.every((product) =>
          [product.title, product.category, product.description].some((field) =>
            String(field ?? '').toLowerCase().includes('phone')
          )
        )
      );
      assert.ok(body.total >= body.products.length);
    });

    it('filters by category', async () => {
      const { body } = await apiJson('/api/products?category=beauty&limit=100');

      assert.ok(body.products.length > 0, 'expected beauty products');
      assert.ok(body.products.every((product) => product.category === 'beauty'));
    });

    it('returns an empty result set for an unmatched search', async () => {
      const { body } = await apiJson('/api/products?q=zzz-no-such-product-zzz');

      assert.equal(body.products.length, 0);
      assert.equal(body.total, 0);
    });

    it('reports consistent store statistics', async () => {
      const { body } = await apiJson('/api/products?limit=1');
      const { storeStats } = body;

      assert.equal(typeof storeStats.totalProducts, 'number');
      assert.equal(typeof storeStats.lowStockCount, 'number');
      assert.equal(typeof storeStats.outOfStockCount, 'number');
      assert.ok(
        storeStats.lowStockCount + storeStats.outOfStockCount <= storeStats.totalProducts,
        'low stock and out of stock counts cannot exceed the catalogue size'
      );
    });
  });

  describe('product CRUD', () => {
    const uniqueTitle = `CI smoke test product ${Date.now()}`;
    let createdId;
    let totalBefore;

    it('creates a product and grows the catalogue by one', async () => {
      const { body: before } = await apiJson('/api/products?limit=1');
      totalBefore = before.storeStats.totalProducts;

      const { response, body } = await apiJson(
        '/api/products',
        jsonInit('POST', {
          title: uniqueTitle,
          category: 'beauty',
          price: 12.5,
          stock: 3,
          thumbnail: 'https://example.com/ci-smoke-test.png',
        })
      );

      assert.equal(response.status, 200);
      assert.equal(typeof body.id, 'number');
      assert.equal(body.title, uniqueTitle);
      assert.equal(body.price, 12.5);
      assert.equal(body.stock, 3);

      createdId = body.id;

      const { body: afterCreate } = await apiJson('/api/products?limit=1');
      assert.equal(afterCreate.storeStats.totalProducts, totalBefore + 1);
    });

    it('makes the created product searchable', async () => {
      const { body } = await apiJson(`/api/products?q=${encodeURIComponent(uniqueTitle)}`);

      assert.equal(body.total, 1);
      assert.equal(body.products[0].id, createdId);
    });

    it('updates price and stock', async () => {
      const { response, body } = await apiJson(
        `/api/products/${createdId}`,
        jsonInit('PUT', { price: 9.99, stock: 0 })
      );

      assert.equal(response.status, 200);
      assert.equal(body.id, createdId);
      assert.equal(body.price, 9.99);
      assert.equal(body.stock, 0);

      const { body: persisted } = await apiJson(`/api/products?q=${encodeURIComponent(uniqueTitle)}`);
      assert.equal(persisted.products[0].price, 9.99);
      assert.equal(persisted.products[0].stock, 0);
    });

    it('deletes the product and restores the catalogue size', async () => {
      const { response, body } = await apiJson(`/api/products/${createdId}`, { method: 'DELETE' });

      assert.equal(response.status, 200);
      assert.equal(body.id, createdId);
      assert.equal(body.isDeleted, true);

      const { body: search } = await apiJson(`/api/products?q=${encodeURIComponent(uniqueTitle)}`);
      assert.equal(search.total, 0);

      const { body: stats } = await apiJson('/api/products?limit=1');
      assert.equal(stats.storeStats.totalProducts, totalBefore);
    });

    it('echoes updates for unknown ids instead of throwing', async () => {
      // Documented behaviour of lib/store.js: the payload is echoed back so an
      // optimistic client update cannot crash the UI when the id is gone.
      const { response, body } = await apiJson(
        '/api/products/999999',
        jsonInit('PUT', { price: 1 })
      );

      assert.equal(response.status, 200);
      assert.equal(body.price, 1);
    });

    it('rejects a malformed JSON body with a 500 and an error message', async () => {
      const response = await api('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ not valid json',
      });
      const body = await response.json();

      assert.equal(response.status, 500);
      assert.ok(body.error, 'expected an error message in the response body');
    });
  });

  describe('GET /api/categories', () => {
    it('returns category objects with a slug and a name', async () => {
      const { response, body } = await apiJson('/api/categories');

      assert.equal(response.status, 200);
      assert.ok(Array.isArray(body));
      assert.ok(body.length >= 20, `expected at least 20 categories, got ${body.length}`);

      body.forEach((category) => {
        assert.equal(typeof category.slug, 'string');
        assert.ok(category.slug.length > 0);
        assert.equal(typeof category.name, 'string');
        assert.ok(category.name.length > 0);
      });
    });
  });
});