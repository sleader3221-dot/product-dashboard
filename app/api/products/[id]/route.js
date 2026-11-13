import { NextResponse } from 'next/server';
import store from '@/lib/store';
import { ProductUpdate, validationError } from '@/lib/productSchema';

const BASE_URL = 'https://dummyjson.com';

export async function PUT(request, context) {
  const { params } = context;
  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = ProductUpdate.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(validationError(parsed), { status: 400 });
    }

    // Update in shared server store immediately
    const updatedProduct = store.update(id, parsed.data);

    // Call upstream DummyJSON in background if valid server product
    const numericId = Number(id);
    if (!isNaN(numericId) && numericId <= 194) {
      fetch(`${BASE_URL}/products/${numericId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => {});
    }

    return NextResponse.json(updatedProduct);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  const { params } = context;
  const { id } = await params;

  try {
    // Delete from shared server store immediately
    const result = store.delete(id);

    // Call upstream DummyJSON in background if valid server product
    const numericId = Number(id);
    if (!isNaN(numericId) && numericId <= 194) {
      fetch(`${BASE_URL}/products/${numericId}`, {
        method: 'DELETE',
      }).catch(() => {});
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}
