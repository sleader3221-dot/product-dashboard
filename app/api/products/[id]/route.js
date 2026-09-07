import { NextResponse } from 'next/server';

const BASE_URL = 'https://dummyjson.com';

export async function PUT(request, context) {
  const { params } = context;
  const { id } = await params;
  const numericId = Number(id);

  try {
    const body = await request.json();
    if (!isNaN(numericId) && numericId <= 194) {
      const res = await fetch(`${BASE_URL}/products/${numericId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    }
    // Optimistic fallback for session products
    return NextResponse.json({ id: isNaN(numericId) ? id : numericId, ...body });
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
  const numericId = Number(id);

  try {
    if (!isNaN(numericId) && numericId <= 194) {
      const res = await fetch(`${BASE_URL}/products/${numericId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    }
    // Optimistic fallback for session products
    return NextResponse.json({
      id: isNaN(numericId) ? id : numericId,
      isDeleted: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}
