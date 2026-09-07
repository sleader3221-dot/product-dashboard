import { NextResponse } from 'next/server';

const BASE_URL = 'https://dummyjson.com';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const category = searchParams.get('category');
  const limit = searchParams.get('limit') || '100';

  let targetUrl = `${BASE_URL}/products?limit=${limit}`;
  if (q && q.trim()) {
    targetUrl = `${BASE_URL}/products/search?q=${encodeURIComponent(q.trim())}`;
  } else if (category && category !== 'all') {
    targetUrl = `${BASE_URL}/products/category/${encodeURIComponent(category)}`;
  }

  try {
    const res = await fetch(targetUrl, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Upstream API responded with ${res.status}`);
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch products', products: [] },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BASE_URL}/products/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Failed to add product: ${res.status}`);
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to add product' },
      { status: 500 }
    );
  }
}
