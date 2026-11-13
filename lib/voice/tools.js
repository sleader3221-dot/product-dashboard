// Tool declarations the Live model can call. The same list is used when the
// server mints the ephemeral token (locked into the session) and by the
// client-side executor. Keep descriptions short: they cost tokens every turn.

const STOCK_STATUS = { type: 'STRING', enum: ['any', 'in', 'low', 'out'], description: 'low = 1-10 units, out = 0' };
const IDS = { type: 'ARRAY', items: { type: 'INTEGER' }, description: 'Product ids from an earlier tool result' };
const FILTER = {
  type: 'OBJECT',
  description: 'Select products by filter instead of ids',
  properties: {
    stock_status: STOCK_STATUS,
    category: { type: 'STRING', description: 'Category slug, e.g. groceries' },
    query: { type: 'STRING', description: 'Product words' },
  },
};

export const TOOL_RISK = {
  search_products: 'read',
  get_product: 'read',
  get_inventory_summary: 'read',
  suggest_actions: 'read',
  get_screen_state: 'read',
  show_on_screen: 'ui',
  open_product: 'ui',
  update_product: 'write',
  adjust_stock: 'write',
  add_product: 'write',
  bulk_adjust_stock: 'confirm',
  delete_products: 'confirm',
  undo_last_action: 'write',
  report_user_state: 'meta',
};

export const FUNCTION_DECLARATIONS = [
  {
    name: 'search_products',
    description:
      'Find products in this store. Use for any question about a product, price or stock. Pass the user\'s words AND English catalog words (e.g. "aata flour", "ಹಾಲು milk"). Results also show on screen unless show_on_screen is false.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'User words plus English catalog words. Empty to list by filter only.' },
        category: { type: 'STRING' },
        stock_status: STOCK_STATUS,
        show_on_screen: { type: 'BOOLEAN' },
      },
    },
  },
  {
    name: 'get_product',
    description: 'Full details of one product by id.',
    parameters: { type: 'OBJECT', properties: { product_id: { type: 'INTEGER' } }, required: ['product_id'] },
  },
  {
    name: 'get_inventory_summary',
    description: 'Totals: product count, categories, low and out-of-stock counts, units, stock value, lowest items.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'suggest_actions',
    description: 'Data-backed suggestions (restock, pricing below cost or thin margin, discount slow movers) each with a reason.',
    parameters: {
      type: 'OBJECT',
      properties: { focus: { type: 'STRING', enum: ['overview', 'restock', 'pricing', 'cleanup'] } },
    },
  },
  {
    name: 'get_screen_state',
    description: 'What the user is looking at now: filters, sort, view, page, open dialog.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'show_on_screen',
    description: 'Change what the dashboard shows.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: {
          type: 'STRING',
          enum: ['show_all', 'show_ids', 'filter_low_stock', 'filter_out_of_stock', 'filter_category', 'sort', 'set_view', 'go_to_page', 'clear_filters'],
        },
        product_ids: IDS,
        category: { type: 'STRING' },
        sort: { type: 'STRING', enum: ['default', 'price-asc', 'price-desc', 'stock-asc', 'stock-desc', 'name-asc'] },
        view: { type: 'STRING', enum: ['grid', 'table'] },
        page: { type: 'INTEGER' },
      },
      required: ['action'],
    },
  },
  {
    name: 'open_product',
    description: 'Open a product on screen: quick view or the edit form.',
    parameters: {
      type: 'OBJECT',
      properties: { product_id: { type: 'INTEGER' }, mode: { type: 'STRING', enum: ['view', 'edit'] } },
      required: ['product_id'],
    },
  },
  {
    name: 'update_product',
    description: 'Change fields of ONE product. Read the change back to the user and get a yes before calling.',
    parameters: {
      type: 'OBJECT',
      properties: {
        product_id: { type: 'INTEGER' },
        title: { type: 'STRING' },
        price: { type: 'NUMBER' },
        stock: { type: 'INTEGER' },
        category: { type: 'STRING' },
        cost_price: { type: 'NUMBER' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'adjust_stock',
    description: 'Stock of ONE product: add/remove units (change) or set an exact number (set_to). Confirm aloud first.',
    parameters: {
      type: 'OBJECT',
      properties: {
        product_id: { type: 'INTEGER' },
        change: { type: 'INTEGER', description: '+ to add, - to remove' },
        set_to: { type: 'INTEGER' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'add_product',
    description: 'Create a new product. Ask for any missing title, category, price or stock first. Confirm aloud first.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        category: { type: 'STRING', description: 'Existing category slug' },
        price: { type: 'NUMBER' },
        stock: { type: 'INTEGER' },
        cost_price: { type: 'NUMBER' },
        thumbnail: { type: 'STRING', description: 'Image URL if the user gave one' },
      },
      required: ['title', 'category', 'price', 'stock'],
    },
  },
  {
    name: 'bulk_adjust_stock',
    description: 'Change stock of several products. Opens an on-screen confirmation; the user must tap Confirm.',
    parameters: {
      type: 'OBJECT',
      properties: { product_ids: IDS, filter: FILTER, change: { type: 'INTEGER' }, set_to: { type: 'INTEGER' } },
    },
  },
  {
    name: 'delete_products',
    description: 'Delete one or more products. Always opens an on-screen confirmation; the user must tap Delete.',
    parameters: { type: 'OBJECT', properties: { product_ids: IDS, filter: FILTER } },
  },
  {
    name: 'undo_last_action',
    description: 'Undo the most recent change made in this session (voice or confirmed on screen).',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'report_user_state',
    description: 'Call silently when the user\'s mood clearly changes (from tone or words). Never mention it.',
    parameters: {
      type: 'OBJECT',
      properties: {
        state: { type: 'STRING', enum: ['calm', 'happy', 'confused', 'frustrated', 'angry', 'rushed', 'sad'] },
        confidence: { type: 'NUMBER', description: '0 to 1' },
        cue: { type: 'STRING', description: 'What you noticed, a few words' },
      },
      required: ['state', 'confidence'],
    },
  },
];
