import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import { productApi } from '../../lib/api.js';

/**
 * Records every call the API client makes to `fetch` and replies with a canned
 * response, so the client contract can be tested without a running server.
 */
function stubFetch(payload, { ok = true, status = 200, rejectJson = false } = {}) {
  const calls = [];

  mock.method(globalThis, 'fetch', async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok,
      status,
      json: async () => {
        if (rejectJson) throw new Error('Unexpected token < in JSON');
        return payload;
      },
    };
  });

  return calls;
}

describe('productApi', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('loads the catalogue with a limit when one is provided', async () => {
    const calls = stubFetch({ products: [], total: 0 });

    const result = await productApi.getAll(10);

    assert.deepEqual(result, { products: [], total: 0 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/products?limit=10');
    assert.equal(calls[0].options.method, undefined, 'GET requests must not set a method');
  });

  it('omits the limit parameter when none is provided', async () => {
    const calls = stubFetch({ products: [] });

    await productApi.getAll();

    assert.equal(calls[0].url, '/api/products');
  });

  it('URL-encodes search terms', async () => {
    const calls = stubFetch({ products: [] });
    const query = 'mens "classic" shoe & watch';

    await productApi.search(query);

    assert.equal(calls[0].url, `/api/products?q=${encodeURIComponent(query)}`);
  });

  it('URL-encodes category filters', async () => {
    const calls = stubFetch({ products: [] });

    await productApi.getByCategory('womens-dresses');

    assert.equal(calls[0].url, '/api/products?category=womens-dresses');
  });

  it('loads the category list', async () => {
    const categories = [{ slug: 'beauty', name: 'Beauty' }];
    const calls = stubFetch(categories);

    const result = await productApi.getCategories();

    assert.deepEqual(result, categories);
    assert.equal(calls[0].url, '/api/categories');
  });

  it('creates products with a JSON POST body', async () => {
    const calls = stubFetch({ id: 195 });
    const newProduct = { title: 'Test Product', price: 10, stock: 3 };

    const created = await productApi.add(newProduct);

    assert.deepEqual(created, { id: 195 });
    assert.equal(calls[0].url, '/api/products');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
    assert.equal(calls[0].options.body, JSON.stringify(newProduct));
  });

  it('updates a single product by id', async () => {
    const calls = stubFetch({ id: 7, price: 99 });

    const updated = await productApi.update(7, { price: 99 });

    assert.equal(updated.price, 99);
    assert.equal(calls[0].url, '/api/products/7');
    assert.equal(calls[0].options.method, 'PUT');
    assert.equal(calls[0].options.body, JSON.stringify({ price: 99 }));
  });

  it('deletes a single product by id', async () => {
    const calls = stubFetch({ id: 7, isDeleted: true });

    const result = await productApi.remove(7);

    assert.equal(result.isDeleted, true);
    assert.equal(calls[0].url, '/api/products/7');
    assert.equal(calls[0].options.method, 'DELETE');
  });

  it('surfaces the server-provided error message', async () => {
    stubFetch({ message: 'Product not found' }, { ok: false, status: 404 });

    await assert.rejects(() => productApi.remove(9999), {
      name: 'Error',
      message: 'Product not found',
    });
  });

  it('falls back to a generic HTTP error when the body is not JSON', async () => {
    stubFetch(null, { ok: false, status: 502, rejectJson: true });

    await assert.rejects(() => productApi.getAll(), { message: 'HTTP error 502' });
  });
});