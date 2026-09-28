import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateProductForm } from '../../utils/validation.js';

const validProduct = {
  title: 'Wireless Mouse',
  category: 'mobile-accessories',
  price: 42.5,
  costPrice: 30,
  stock: 7,
  thumbnail: 'https://cdn.dummyjson.com/product-images/mobile-accessories/wireless-mouse/1.webp',
};

const emptyForm = {
  title: '',
  category: '',
  price: '',
  costPrice: '',
  stock: '',
  thumbnail: '',
};

describe('validateProductForm', () => {
  it('accepts a complete, valid product payload', () => {
    const result = validateProductForm(validProduct);

    assert.equal(result.isValid, true);
    assert.deepEqual(result.errors, {});
  });

  it('treats cost price as optional', () => {
    const { costPrice, ...withoutCostPrice } = validProduct;

    assert.equal(validateProductForm(withoutCostPrice).isValid, true);
    assert.equal(validateProductForm({ ...validProduct, costPrice: '' }).isValid, true);
    assert.equal(validateProductForm({ ...validProduct, costPrice: null }).isValid, true);
  });

  describe('title', () => {
    it('requires a non-blank name of at least 3 characters', () => {
      assert.equal(
        validateProductForm({ ...validProduct, title: '' }).errors.title,
        'Product name is required'
      );
      assert.equal(
        validateProductForm({ ...validProduct, title: '   ' }).errors.title,
        'Product name is required'
      );
      assert.equal(
        validateProductForm({ ...validProduct, title: 'ab' }).errors.title,
        'Product name must be at least 3 characters'
      );
    });

    it('accepts a name of exactly 3 characters', () => {
      assert.equal(validateProductForm({ ...validProduct, title: 'abc' }).errors.title, undefined);
    });
  });

  describe('category', () => {
    it('rejects missing, blank, "all" and untrimmed "all" values', () => {
      assert.equal(
        validateProductForm({ ...validProduct, category: '' }).errors.category,
        'Category is required'
      );
      assert.equal(
        validateProductForm({ ...validProduct, category: 'all' }).errors.category,
        'Category is required'
      );
      assert.equal(
        validateProductForm({ ...validProduct, category: '  all ' }).errors.category,
        'Category is required'
      );
    });
  });

  describe('price', () => {
    it('requires a value', () => {
      assert.equal(
        validateProductForm({ ...validProduct, price: '' }).errors.price,
        'Price is required'
      );
      assert.equal(
        validateProductForm({ ...validProduct, price: null }).errors.price,
        'Price is required'
      );
    });

    it('rejects non-numeric and non-positive values', () => {
      assert.equal(
        validateProductForm({ ...validProduct, price: 'free' }).errors.price,
        'Price must be a valid number'
      );
      assert.equal(
        validateProductForm({ ...validProduct, price: 0 }).errors.price,
        'Price must be greater than 0'
      );
      assert.equal(
        validateProductForm({ ...validProduct, price: -12.5 }).errors.price,
        'Price must be greater than 0'
      );
    });

    it('accepts numeric strings coming from form inputs', () => {
      assert.equal(validateProductForm({ ...validProduct, price: '19.99' }).isValid, true);
    });
  });

  describe('stock', () => {
    it('requires a value', () => {
      assert.equal(
        validateProductForm({ ...validProduct, stock: '' }).errors.stock,
        'Stock is required'
      );
    });

    it('rejects non-numeric, negative and fractional stock', () => {
      assert.equal(
        validateProductForm({ ...validProduct, stock: 'many' }).errors.stock,
        'Stock must be a valid number'
      );
      assert.equal(
        validateProductForm({ ...validProduct, stock: -1 }).errors.stock,
        'Stock cannot be negative'
      );
      assert.equal(
        validateProductForm({ ...validProduct, stock: 2.5 }).errors.stock,
        'Stock must be a whole number (no decimals)'
      );
    });

    it('accepts zero and integer strings', () => {
      assert.equal(validateProductForm({ ...validProduct, stock: 0 }).isValid, true);
      assert.equal(validateProductForm({ ...validProduct, stock: '148' }).isValid, true);
    });
  });

  describe('thumbnail', () => {
    it('requires a URL', () => {
      assert.equal(
        validateProductForm({ ...validProduct, thumbnail: '' }).errors.thumbnail,
        'Image URL is required'
      );
    });

    it('rejects malformed and non-HTTP(S) URLs', () => {
      assert.equal(
        validateProductForm({ ...validProduct, thumbnail: 'not-a-url' }).errors.thumbnail,
        'Please enter a valid HTTP/HTTPS URL'
      );
      assert.equal(
        validateProductForm({ ...validProduct, thumbnail: 'ftp://files.example.com/a.png' })
          .errors.thumbnail,
        'Image URL must start with http:// or https://'
      );
    });

    it('accepts http and https URLs', () => {
      assert.equal(
        validateProductForm({ ...validProduct, thumbnail: 'http://localhost:3000/a.png' }).isValid,
        true
      );
    });
  });

  describe('costPrice', () => {
    it('rejects non-numeric and negative cost prices', () => {
      assert.equal(
        validateProductForm({ ...validProduct, costPrice: 'cheap' }).errors.costPrice,
        'Cost price must be a valid number'
      );
      assert.equal(
        validateProductForm({ ...validProduct, costPrice: -0.01 }).errors.costPrice,
        'Cost price cannot be negative'
      );
    });

    it('accepts zero cost price', () => {
      assert.equal(validateProductForm({ ...validProduct, costPrice: 0 }).isValid, true);
    });
  });

  describe('result shape', () => {
    it('reports every required field for an empty form', () => {
      const result = validateProductForm(emptyForm);

      assert.equal(result.isValid, false);
      assert.deepEqual(Object.keys(result.errors).sort(), [
        'category',
        'price',
        'stock',
        'thumbnail',
        'title',
      ]);
    });

    it('never throws when called without arguments', () => {
      const result = validateProductForm(undefined);

      assert.equal(result.isValid, false);
      assert.equal(Object.keys(result.errors).length, 5);
    });
  });
});