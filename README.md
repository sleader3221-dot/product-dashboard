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

## 🌟 Top 1% Touches (DukaanSe Kirana & Retail Mindset)

1. **Dynamic Stock Alert Badges (Inventory Health):**
   - Stock > 10: Emerald Green (`bg-emerald-50 text-emerald-700`) ➔ `"In stock"`
   - Stock 1–10: Amber Warning (`bg-amber-50 text-amber-700`) ➔ `"Low stock (X left)"`
   - Stock = 0: Rose Alert with Pulse Animation (`bg-rose-50 text-rose-700`) ➔ `"Out of stock"`
   - *Value for DukaanSe:* Enables local store managers to immediately identify items needing replenishment before stockouts occur.

2. **Operational Sort Dropdown (Price & Replenishment Priority):**
   - Sort by **Default / Featured**
   - Sort by **Price: Low to High** and **Price: High to Low**
   - Sort by **Stock: Low to High (Restock Priority)** — allows shopkeepers to instantly generate re-order purchasing lists.
   - Sort by **Stock: High to Low** and **Name: A to Z**

3. **Store Overview Metrics Pills (Header Counters):**
   - Real-time KPI summary bar showing:
     - 📦 **Total Products**
     - 🏷️ **Active Departments / Categories**
     - ⚠️ **Low Stock Count (≤10)**
     - 🚨 **Out of Stock Count**
   - Provides store owners with an executive snapshot of inventory health with zero performance overhead.

## Known Limitations

- **DummyJSON is a mock API:** POST/PUT/DELETE responses are simulated and do not actually persist data server-side. The app handles this with **optimistic UI updates** — state is updated locally after a successful API response.
- **Product images** come from DummyJSON's CDN; broken image URLs show a fallback icon.
