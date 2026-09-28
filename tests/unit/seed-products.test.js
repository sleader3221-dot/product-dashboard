import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import seedProducts from '../../lib/seedProducts.json' with { type: 'json' };

describe('seed product catalogue', () => {
  it('contains the complete DummyJSON catalogue', () => {
    assert.ok(Array.isArray(seedProducts));
    assert.equal(seedProducts.length, 194);
  });

  it('uses unique numeric ids', () => {
    const ids = seedProducts.map((product) => product.id);

    ids.forEach((id) => assert.equal(typeof id, 'number', `id ${id} is not a number`));
    assert.equal(new Set(ids).size, ids.length, 'duplicate product ids found');
  });

  it('provides every field the dashboard renders', () => {
    for (const product of seedProducts) {
      assert.equal(typeof product.title, 'string', `title missing on product ${product.id}`);
      assert.ok(product.title.trim().length > 0, `blank title on product ${product.id}`);
      assert.equal(typeof product.category, 'string', `category missing on product ${product.id}`);
      assert.ok(product.category.trim().length > 0, `blank category on product ${product.id}`);
      assert.match(
        product.thumbnail,
        /^https:\/\//,
        `thumbnail on product ${product.id} is not an https URL`
      );
      assert.ok(
        Array.isArray(product.images) && product.images.length > 0,
        `product ${product.id} has no gallery images`
      );
    }
  });

  it('keeps price and stock values usable by the store', () => {
    for (const product of seedProducts) {
      assert.ok(Number(product.price) > 0, `price must be positive on product ${product.id}`);
      assert.ok(
        Number.isInteger(Number(product.stock)),
        `stock must be a whole number on product ${product.id}`
      );
      assert.ok(Number(product.stock) >= 0, `stock cannot be negative on product ${product.id}`);
    }
  });

  it('keeps catalogue ids below the store high-water mark', () => {
    // lib/store.js starts maxIdEver at 200, so seed ids must stay at or below it
    // for newly created products never to collide with the catalogue.
    const maxId = Math.max(...seedProducts.map((product) => Number(product.id)));

    assert.ok(maxId <= 200, `expected the highest seed id to be <= 200 but found ${maxId}`);
  });
});