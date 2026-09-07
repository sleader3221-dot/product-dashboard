# Product Management Dashboard

A fully responsive product management dashboard built with Next.js and Tailwind CSS.

## Live Demo

[https://product-dashboard-steel-two.vercel.app/](https://product-dashboard-steel-two.vercel.app/)

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
- ✅ Category filter tabs (API-driven with instant zero-latency switching)
- ✅ Add product with full form validation
- ✅ Edit product (pre-populated form)
- ✅ Delete product with confirmation dialog
- ✅ Loading skeleton animation
- ✅ Error state with retry button
- ✅ Empty state for no results
- ✅ Toast notifications for all operations
- ✅ Fully responsive (mobile + desktop)
- ✅ Meaningful Git commit history
- ✅ **Clickable KPI Quick-Filters**: Click on "Total Products", "Low Stock (≤10)", or "Out of Stock" cards to instantly filter the entire catalog.
- ✅ **Search Clear ("X") & Active Filter Pills Bar**: One-click clear for search queries and multi-pill indicator showing active category, search, and stock filters with individual removal and one-click "Reset all".
- ✅ **Product Details / Quick View Modal**: Click on any product image or title to open a rich modal with image gallery switcher, rating stars, discount badge, description, and quick edit/delete buttons.
- ✅ **Executive PDF Audit & Reorder Report**: Real-time PDF generator using `jspdf` and `jspdf-autotable` with navy brand header, dynamic valuation, low-stock alerts, autoTable styling, and multi-page confidential footer.
- ✅ **Client-Side Pagination**: Clean 16 items/page with range indicator (`Showing 1–16 of 194`), windowed page buttons, and smooth scroll to top.

## 🌟 Top 1% Touches (DukaanSe Kirana & Retail Mindset)

1. **Interactive KPI Quick-Filters & Live Inventory Counts:**
   - The 4 top KPI cards (Total Products, Active Categories, Low Stock ≤10, Out of Stock) are dynamic filter triggers.
   - Clicking "Low Stock" instantly filters the grid to all items needing replenishment and highlights the active metric card.
   - Real-time catalog synchronization: Adding or deleting products immediately increments or decrements the counters in real time.

2. **Dynamic Stock Alert Badges (Inventory Health):**
   - Stock > 10: Emerald Green (`bg-emerald-50 text-emerald-700`) ➔ `"In stock"`
   - Stock 1–10: Amber Warning (`bg-amber-50 text-amber-700`) ➔ `"Low stock (X left)"`
   - Stock = 0: Rose Alert with Pulse Animation (`bg-rose-50 text-rose-700`) ➔ `"Out of stock"`
   - *Value for DukaanSe:* Enables local store managers to immediately identify items needing replenishment before stockouts occur.

3. **Operational Sort & Executive PDF Inventory Audit Report:**
   - Sort by **Default / Featured**, **Price: Low to High**, **Price: High to Low**, **Stock: Low to High (Restock Priority)**, and **Name: A to Z**.
   - Store owners can filter by "Low Stock", sort by "Stock: Low to High", and click **"Export PDF"** to generate an executive-grade replenishment audit sheet ready for suppliers, accountants, or store managers.

4. **Product Details & Thumbnail Gallery:**
   - Shop owners can inspect all product images, verify pricing, stock, rating, and description without navigating away from the dashboard.

## Known Limitations

- **DummyJSON is a mock API:** POST/PUT/DELETE responses are simulated and do not actually persist data on DummyJSON's public servers. The app handles this with **full client-side store persistence and optimistic UI updates** — additions, edits, and deletions update the in-memory singleton pool and UI in real time.
- **Product images** come from DummyJSON's CDN; broken image URLs gracefully display a fallback icon.
