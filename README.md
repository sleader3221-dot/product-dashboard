# Product Management Dashboard

[![CI](https://github.com/sleader3221-dot/product-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/sleader3221-dot/product-dashboard/actions/workflows/ci.yml)
[![CodeQL](https://github.com/sleader3221-dot/product-dashboard/actions/workflows/codeql.yml/badge.svg)](https://github.com/sleader3221-dot/product-dashboard/actions/workflows/codeql.yml)
[![Deploy to Vercel](https://github.com/sleader3221-dot/product-dashboard/actions/workflows/deploy-vercel.yml/badge.svg)](https://github.com/sleader3221-dot/product-dashboard/actions/workflows/deploy-vercel.yml)

A fully responsive product management dashboard built with **Next.js 16** and **Tailwind CSS**, designed for real-time inventory tracking, product CRUD operations, and executive-grade reporting.

🔗 **[Live Demo](https://product-dashboard-steel-two.vercel.app/)**

---

## Tech Stack

| Tool | Purpose |
|---|---|
| Next.js 16 (App Router, Turbopack) | React framework |
| React 19 | UI runtime |
| Tailwind CSS | Styling |
| React Context + useReducer | State management |
| react-hot-toast | User feedback notifications |
| Lucide React | Icons |
| DummyJSON API | Product data (mock REST API) |
| jsPDF + jspdf-autotable | PDF export |
| GitHub Actions | Lint, tests, security scanning, Vercel deploy |
| Node.js built-in test runner | Unit tests + HTTP smoke tests |

---

## Getting Started

**Prerequisites:** Node.js 22+ (see `.nvmrc`)

```bash
git clone https://github.com/sleader3221-dot/product-dashboard.git
cd product-dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & CI/CD

Every push and pull request runs the pipeline in `.github/workflows/ci.yml`:
ESLint, workflow linting (actionlint), unit tests on Node 22 and 24, a production
build, HTTP smoke tests against that build, and a dependency audit. CodeQL,
dependency review, Dependabot and an opt-in Vercel deployment round it out.

| Workflow | Triggers | What it gates |
|---|---|---|
| `ci.yml` | push / PR to `main` | lint, workflow lint, unit tests (Node 22 + 24), build, API smoke tests, `npm audit` |
| `codeql.yml` | push / PR + weekly | CodeQL `security-and-quality` analysis |
| `dependency-review.yml` | pull requests | blocks high/critical dependency changes |
| `deploy-vercel.yml` | after CI on `main`, `v*` tags, manual | Vercel deploy (skipped until the secrets exist) |
| `release.yml` | `v*` tags | GitHub release with generated notes |
| `security-audit.yml` | weekly + lockfile changes | `npm audit` on production dependencies |

```bash
npm run verify        # lint + unit tests + production build (what CI enforces)
npm run test:unit     # fast unit tests (node --test)
npm run test:coverage # unit tests + coverage table
npm run build         # required before the smoke tests
npm run test:api      # boots next start and tests the real HTTP API
```

Verified locally: 33 unit tests and 14 API smoke tests pass, coverage is 100% on
`lib/api.js` and `utils/validation.js`, and `npm audit --omit=dev` reports 0
vulnerabilities.

Merge protection should require the `CI success` status check (see
**[docs/github-actions.md](docs/github-actions.md)** for branch protection,
Vercel secrets, release flow and troubleshooting).

---

## API Reference

The dashboard ships its own JSON API and treats DummyJSON as the upstream data
source.

### Dashboard API (same origin)

| Operation | Method | Endpoint |
|---|---|---|
| List / search / filter products | `GET` | `/api/products?q={query}&category={slug}&limit={n}` |
| Create product | `POST` | `/api/products` |
| Update product | `PUT` | `/api/products/{id}` |
| Delete product | `DELETE` | `/api/products/{id}` |
| Categories | `GET` | `/api/categories` (proxied from DummyJSON, local fallback list) |

`GET /api/products` responds with `{ products, total, storeStats }`, where
`storeStats` carries `totalProducts`, `lowStockCount` and `outOfStockCount`.

### Upstream source — `https://dummyjson.com`

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

The API routes additionally keep changes in a single in-memory store (`lib/store.js`) that is shared per server process: every cold start or redeploy resets the catalogue to the 194 seeded DummyJSON products, and a multi-instance deployment would keep one store per instance. Browser `localStorage` persistence is per-browser and per-device.

Product images are served from DummyJSON's CDN; broken image URLs fall back to a placeholder icon gracefully.
