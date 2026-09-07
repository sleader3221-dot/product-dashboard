import { NextResponse } from 'next/server';
import store from '@/lib/store';

const BASE_URL = 'https://dummyjson.com';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const category = searchParams.get('category');
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 0;

  try {
    const result = store.getAll({ q, category, limit });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve products', products: [] },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Add to singleton server store immediately
    const newProduct = store.add(body);

    // Call upstream DummyJSON in background
    fetch(`${BASE_URL}/products/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});

    return NextResponse.json(newProduct);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to add product' },
      { status: 500 }
    );
  }
}
