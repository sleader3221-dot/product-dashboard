import { NextResponse } from 'next/server';
import initialProducts from '@/lib/seedProducts.json';

const BASE_URL = 'https://dummyjson.com';

// In-memory products pool initialized with 100 genuine DummyJSON products
let productsPool = [...initialProducts];
let lastSyncTime = 0;
const SYNC_INTERVAL = 1000 * 60 * 15; // 15 minutes

async function syncWithUpstream() {
  const now = Date.now();
  if (now - lastSyncTime < SYNC_INTERVAL) return;

  try {
    const res = await fetch(`${BASE_URL}/products?limit=0`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.products) && data.products.length > 0) {
        // Merge upstream products while preserving newly created session products
        const sessionProducts = productsPool.filter(
          (p) => !data.products.some((up) => up.id === p.id)
        );
        productsPool = [...sessionProducts, ...data.products];
        lastSyncTime = now;
      }
    }
  } catch (err) {
    // Gracefully ignore network errors and continue serving from productsPool
    console.warn('Background sync with DummyJSON paused, serving cached data:', err.message);
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  // Trigger background sync non-blockingly
  syncWithUpstream().catch(() => {});

  try {
    let filtered = [...productsPool];

    // Filter by search query
    if (q && q.trim()) {
      const queryLower = q.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(queryLower)) ||
          (p.category && p.category.toLowerCase().includes(queryLower)) ||
          (p.description && p.description.toLowerCase().includes(queryLower))
      );
    }

    // Filter by category
    if (category && category !== 'all') {
      const catLower = category.toLowerCase().trim();
      filtered = filtered.filter(
        (p) => p.category && p.category.toLowerCase().trim() === catLower
      );
    }

    return NextResponse.json({
      products: filtered.slice(0, limit),
      total: filtered.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to process request', products: [] },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Call upstream DummyJSON
    let upstreamProduct = null;
    try {
      const res = await fetch(`${BASE_URL}/products/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        upstreamProduct = await res.json();
      }
    } catch {
      // Ignore upstream rate limit/offline errors
    }

    const newProduct = {
      id: Date.now(),
      ...body,
      ...(upstreamProduct || {}),
      id: upstreamProduct?.id || Date.now(),
    };

    // Prepend to server memory pool so subsequent filter/search queries include it
    productsPool = [newProduct, ...productsPool];

    return NextResponse.json(newProduct);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to add product' },
      { status: 500 }
    );
  }
}
