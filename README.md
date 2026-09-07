# Product Management Dashboard

A fully responsive product management dashboard built with Next.js and Tailwind CSS.

## Live Demo

[https://your-app.vercel.app](https://your-app.vercel.app)

## Setup Instructions

**Prerequisites:** Node.js 18+

```bash
git clone https://github.com/sleader3221-dot/product-dashboard.git
cd product-dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Technology Used

| Tool | Purpose |
|------|---------|
| Next.js 14 (App Router) | React framework |
| Tailwind CSS | Styling |
| React Context + useReducer | State management |
| react-hot-toast | User feedback notifications |
| Lucide React | Icons |
| DummyJSON API | Product data (mock REST API) |

## API Used

**Base URL:** `https://dummyjson.com`

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get products | GET | `/products?limit=100` |
| Search | GET | `/products/search?q={query}` |
| Get categories | GET | `/products/categories` |
| Filter by category | GET | `/products/category/{slug}` |
| Add product | POST | `/products/add` |
| Update product | PUT | `/products/{id}` |
| Delete product | DELETE | `/products/{id}` |

## Features Implemented

- ✅ Product listing with image, name, category, price, and stock
- ✅ Real-time debounced search by product name
- ✅ Category filter tabs (API-driven)
- ✅ Add product with full form validation
- ✅ Edit product (pre-populated form)
- ✅ Delete product with confirmation dialog
- ✅ Loading skeleton animation
- ✅ Error state with retry button
- ✅ Empty state for no results
- ✅ Toast notifications for all operations
- ✅ Fully responsive (mobile + desktop)
- ✅ Meaningful Git commit history

## Known Limitations

- **DummyJSON is a mock API:** POST/PUT/DELETE responses are simulated and do not actually persist data server-side. The app handles this with **optimistic UI updates** — state is updated locally after a successful API response.
- **Product images** come from DummyJSON's CDN; broken image URLs show a fallback icon.
