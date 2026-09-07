import { NextResponse } from 'next/server';

const BASE_URL = 'https://dummyjson.com';

const FALLBACK_CATEGORIES = [
  { slug: 'beauty', name: 'Beauty' },
  { slug: 'fragrances', name: 'Fragrances' },
  { slug: 'furniture', name: 'Furniture' },
  { slug: 'groceries', name: 'Groceries' },
  { slug: 'home-decoration', name: 'Home Decoration' },
  { slug: 'kitchen-accessories', name: 'Kitchen Accessories' },
  { slug: 'laptops', name: 'Laptops' },
  { slug: 'mens-shirts', name: 'Mens Shirts' },
  { slug: 'mens-shoes', name: 'Mens Shoes' },
  { slug: 'mens-watches', name: 'Mens Watches' },
  { slug: 'mobile-accessories', name: 'Mobile Accessories' },
  { slug: 'motorcycle', name: 'Motorcycle' },
  { slug: 'skin-care', name: 'Skin Care' },
  { slug: 'smartphones', name: 'Smartphones' },
  { slug: 'sports-accessories', name: 'Sports Accessories' },
  { slug: 'sunglasses', name: 'Sunglasses' },
  { slug: 'tablets', name: 'Tablets' },
  { slug: 'tops', name: 'Tops' },
  { slug: 'vehicle', name: 'Vehicle' },
  { slug: 'womens-bags', name: 'Womens Bags' },
  { slug: 'womens-dresses', name: 'Womens Dresses' },
  { slug: 'womens-jewellery', name: 'Womens Jewellery' },
  { slug: 'womens-shoes', name: 'Womens Shoes' },
  { slug: 'womens-watches', name: 'Womens Watches' },
];

export async function GET() {
  try {
    const res = await fetch(`${BASE_URL}/products/categories`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json(FALLBACK_CATEGORIES);
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return NextResponse.json(data);
    }
    return NextResponse.json(FALLBACK_CATEGORIES);
  } catch {
    return NextResponse.json(FALLBACK_CATEGORIES);
  }
}
