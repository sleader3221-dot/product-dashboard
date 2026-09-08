# Product Management Dashboard

A fully responsive product management dashboard built with **Next.js 14** and **Tailwind CSS**, designed for real-time inventory tracking, product CRUD operations, and executive-grade reporting.

🔗 **[Live Demo](https://product-dashboard-steel-two.vercel.app/)**

---

## Tech Stack

| Tool | Purpose |
|---|---|
| Next.js 14 (App Router) | React framework |
| Tailwind CSS | Styling |
| React Context + useReducer | State management |
| react-hot-toast | User feedback notifications |
| Lucide React | Icons |
| DummyJSON API | Product data (mock REST API) |
| jsPDF + jspdf-autotable | PDF export |

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
git clone https://github.com/sleader3221-dot/product-dashboard.git
cd product-dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Reference

**Base URL:** `https://dummyjson.com`

| Operation | Method | Endpoint |
|---|---|---|
| List products | `GET` | `/products?limit=100` |
| Search products | `GET` | `/products/search?q={query}` |
| Get categories | `GET` | `/products/categories` |
| Filter by category | `GET` | `/products/category/{slug}` |
| Add product | `POST` | `/products/add` |
| Update product | `PUT` | `/products/{id}` |
| Delete product | `DELETE` | `/products/{id}` |

---

## Features

### Core
- Product listing with image, name, category, price, and stock
- Real-time debounced search by product name
- Category filter tabs (API-driven)
- Add product with full form validation
- Edit product with pre-populated form
- Delete product with confirmation dialog
- Loading skeleton animations
- Error state with retry button
- Empty state for no results
- Toast notifications for all CRUD operations
- Fully responsive (mobile + desktop)

### Inventory & Filtering
- **KPI Quick-Filters** — Click any KPI card (Total Products, Low Stock ≤10, Out of Stock) to instantly filter the product grid; counters update in real time as products are added or deleted.
- **Dynamic Stock Alert Badges** — Color-coded inventory health at a glance:
  - 🟢 Stock > 10 → `In Stock`
  - 🟡 Stock 1–10 → `Low Stock (X left)`
  - 🔴 Stock = 0 → `Out of Stock` *(with pulse animation)*
- **Active Filter Pills Bar** — Pill indicators for all active filters (category, search, stock) with individual removal and a one-click "Reset all".

### Product Details
- **Quick View Modal** — Click any product image or title to open a rich detail modal with an image gallery switcher, star ratings, discount badge, description, and quick Edit/Delete actions.

### Sorting & Export
- **Operational Sort** — Sort by Default, Price (Low→High / High→Low), Stock: Low to High (restock priority), or Name A→Z.
- **Executive PDF Report** — Exports a branded, multi-page inventory audit PDF (via jsPDF) with dynamic valuation, low-stock alerts, autoTable styling, and a confidential footer — ready for suppliers, accountants, or store managers.

### Pagination
- Client-side pagination at 16 items per page with a range indicator (`Showing 1–16 of 194`), windowed page buttons, and smooth scroll-to-top.

---

## Known Limitations

DummyJSON is a **mock API** — `POST`, `PUT`, and `DELETE` responses are simulated and do not persist on DummyJSON's public servers. The app handles this with full **client-side store persistence** and **optimistic UI updates**: additions, edits, and deletions are reflected immediately in the in-memory data pool and UI.

Product images are served from DummyJSON's CDN; broken image URLs fall back to a placeholder icon gracefully.
