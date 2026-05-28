export type Product = {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  unit_price: number;
  cost_price: number;
  reorder_point: number;
  created_at: string;
  updated_at: string;
};

export type Inventory = {
  id: number;
  product_id: number;
  quantity: number;
  avg_cost: number;
  updated_at: string;
};

export type StockWithProduct = Inventory & {
  sku: string;
  name: string;
  reorder_point: number;
};

export type Warehouse = {
  id: number;
  name: string;
};

export type StockMovement = {
  id: number;
  product_id: number;
  warehouse_id: number;
  type: "in" | "out";
  quantity: number;
  memo?: string;
  created_at: string;
};

export type StockMovementWithDetails = StockMovement & {
  product_name: string;
  product_sku: string;
  warehouse_name: string;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type Shipment = {
  id: number;
  order_id: number;
  carrier: string;
  tracking_number: string;
  created_at: string;
};

export type Order = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  campaign_id: number | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
};

export type OrderWithItems = Order & { items: OrderItem[] };

let products: Product[] = [
  {
    id: 1,
    sku: "LAPTOP-001",
    name: "Pro Laptop 15",
    description: "High-performance laptop for professionals",
    unit_price: 149800,
    cost_price: 98000,
    reorder_point: 5,
    created_at: "2026-01-10T09:00:00Z",
    updated_at: "2026-01-10T09:00:00Z",
  },
  {
    id: 2,
    sku: "MOUSE-002",
    name: "Wireless Mouse",
    description: "Ergonomic wireless mouse",
    unit_price: 3980,
    cost_price: 1800,
    reorder_point: 20,
    created_at: "2026-01-10T09:05:00Z",
    updated_at: "2026-01-10T09:05:00Z",
  },
  {
    id: 3,
    sku: "KBOARD-003",
    name: "Mechanical Keyboard",
    description: "Tactile mechanical keyboard",
    unit_price: 12800,
    cost_price: 6500,
    reorder_point: 10,
    created_at: "2026-01-10T09:10:00Z",
    updated_at: "2026-01-10T09:10:00Z",
  },
  {
    id: 4,
    sku: "MONITOR-004",
    name: "4K Monitor 27inch",
    description: "Ultra-HD display for creative work",
    unit_price: 54800,
    cost_price: 32000,
    reorder_point: 3,
    created_at: "2026-01-11T10:00:00Z",
    updated_at: "2026-01-11T10:00:00Z",
  },
  {
    id: 5,
    sku: "HDMI-005",
    name: "HDMI Cable 2m",
    description: "High-speed HDMI 2.1 cable",
    unit_price: 1280,
    cost_price: 420,
    reorder_point: 50,
    created_at: "2026-01-12T11:00:00Z",
    updated_at: "2026-01-12T11:00:00Z",
  },
];

let inventory: Inventory[] = [
  {
    id: 1,
    product_id: 1,
    quantity: 8,
    avg_cost: 98000,
    updated_at: "2026-04-20T08:00:00Z",
  },
  {
    id: 2,
    product_id: 2,
    quantity: 3,
    avg_cost: 1800,
    updated_at: "2026-05-01T08:00:00Z",
  },
  {
    id: 3,
    product_id: 3,
    quantity: 15,
    avg_cost: 6500,
    updated_at: "2026-04-25T08:00:00Z",
  },
  {
    id: 4,
    product_id: 4,
    quantity: 2,
    avg_cost: 32000,
    updated_at: "2026-05-10T08:00:00Z",
  },
  {
    id: 5,
    product_id: 5,
    quantity: 82,
    avg_cost: 420,
    updated_at: "2026-05-05T08:00:00Z",
  },
];

const warehouses: Warehouse[] = [
  { id: 1, name: "東京倉庫" },
  { id: 2, name: "大阪倉庫" },
  { id: 3, name: "福岡倉庫" },
];

let stockMovements: StockMovement[] = [
  {
    id: 1,
    product_id: 1,
    warehouse_id: 1,
    type: "in",
    quantity: 10,
    created_at: "2026-05-21T09:00:00Z",
  },
  {
    id: 2,
    product_id: 2,
    warehouse_id: 2,
    type: "out",
    quantity: 3,
    created_at: "2026-05-21T14:30:00Z",
  },
  {
    id: 3,
    product_id: 3,
    warehouse_id: 1,
    type: "in",
    quantity: 20,
    created_at: "2026-05-22T10:00:00Z",
  },
  {
    id: 4,
    product_id: 4,
    warehouse_id: 3,
    type: "out",
    quantity: 1,
    created_at: "2026-05-22T15:00:00Z",
  },
  {
    id: 5,
    product_id: 5,
    warehouse_id: 1,
    type: "in",
    quantity: 100,
    created_at: "2026-05-23T09:30:00Z",
  },
  {
    id: 6,
    product_id: 1,
    warehouse_id: 2,
    type: "out",
    quantity: 2,
    created_at: "2026-05-23T11:00:00Z",
  },
  {
    id: 7,
    product_id: 2,
    warehouse_id: 1,
    type: "in",
    quantity: 30,
    created_at: "2026-05-24T09:00:00Z",
  },
  {
    id: 8,
    product_id: 3,
    warehouse_id: 3,
    type: "out",
    quantity: 5,
    created_at: "2026-05-24T14:00:00Z",
  },
  {
    id: 9,
    product_id: 5,
    warehouse_id: 2,
    type: "out",
    quantity: 20,
    created_at: "2026-05-25T10:30:00Z",
  },
  {
    id: 10,
    product_id: 4,
    warehouse_id: 1,
    type: "in",
    quantity: 5,
    created_at: "2026-05-25T15:00:00Z",
  },
  {
    id: 11,
    product_id: 1,
    warehouse_id: 1,
    type: "out",
    quantity: 1,
    created_at: "2026-05-26T09:00:00Z",
  },
  {
    id: 12,
    product_id: 3,
    warehouse_id: 2,
    type: "in",
    quantity: 10,
    created_at: "2026-05-26T14:00:00Z",
  },
  {
    id: 13,
    product_id: 2,
    warehouse_id: 3,
    type: "out",
    quantity: 2,
    created_at: "2026-05-27T08:30:00Z",
  },
  {
    id: 14,
    product_id: 5,
    warehouse_id: 1,
    type: "in",
    quantity: 50,
    created_at: "2026-05-27T10:00:00Z",
  },
  {
    id: 15,
    product_id: 4,
    warehouse_id: 2,
    type: "out",
    quantity: 1,
    created_at: "2026-05-27T14:00:00Z",
  },
];

let orders: OrderWithItems[] = [
  {
    id: 1,
    order_number: "ORD-20260501-001",
    customer_name: "山田 太郎",
    customer_email: "yamada@example.com",
    status: "delivered",
    subtotal: 153780,
    discount_amount: 0,
    total_amount: 153780,
    campaign_id: null,
    created_at: "2026-05-01T10:00:00Z",
    updated_at: "2026-05-03T14:00:00Z",
    items: [
      { id: 1, order_id: 1, product_id: 1, quantity: 1, unit_price: 149800 },
      { id: 2, order_id: 1, product_id: 2, quantity: 1, unit_price: 3980 },
    ],
  },
  {
    id: 2,
    order_number: "ORD-20260505-002",
    customer_name: "佐藤 花子",
    customer_email: "sato@example.com",
    status: "shipped",
    subtotal: 67600,
    discount_amount: 5000,
    total_amount: 62600,
    campaign_id: null,
    created_at: "2026-05-05T11:30:00Z",
    updated_at: "2026-05-06T09:00:00Z",
    items: [
      { id: 3, order_id: 2, product_id: 4, quantity: 1, unit_price: 54800 },
      { id: 4, order_id: 2, product_id: 3, quantity: 1, unit_price: 12800 },
    ],
  },
  {
    id: 3,
    order_number: "ORD-20260510-003",
    customer_name: "鈴木 一郎",
    customer_email: "suzuki@example.com",
    status: "confirmed",
    subtotal: 8220,
    discount_amount: 0,
    total_amount: 8220,
    campaign_id: null,
    created_at: "2026-05-10T14:00:00Z",
    updated_at: "2026-05-10T14:05:00Z",
    items: [
      { id: 5, order_id: 3, product_id: 3, quantity: 1, unit_price: 6940 },
      { id: 6, order_id: 3, product_id: 5, quantity: 1, unit_price: 1280 },
    ],
  },
  {
    id: 4,
    order_number: "ORD-20260513-004",
    customer_name: "高橋 美咲",
    customer_email: "takahashi@example.com",
    status: "pending",
    subtotal: 7960,
    discount_amount: 0,
    total_amount: 7960,
    campaign_id: null,
    created_at: "2026-05-13T16:00:00Z",
    updated_at: "2026-05-13T16:00:00Z",
    items: [
      { id: 7, order_id: 4, product_id: 2, quantity: 2, unit_price: 3980 },
    ],
  },
  {
    id: 5,
    order_number: "ORD-20260521-005",
    customer_name: "伊藤 健太",
    customer_email: "ito@example.com",
    status: "delivered",
    subtotal: 3980,
    discount_amount: 0,
    total_amount: 3980,
    campaign_id: null,
    created_at: "2026-05-21T10:00:00Z",
    updated_at: "2026-05-21T15:00:00Z",
    items: [
      { id: 8, order_id: 5, product_id: 2, quantity: 1, unit_price: 3980 },
    ],
  },
  {
    id: 6,
    order_number: "ORD-20260522-006",
    customer_name: "中村 優子",
    customer_email: "nakamura@example.com",
    status: "shipped",
    subtotal: 56080,
    discount_amount: 0,
    total_amount: 56080,
    campaign_id: null,
    created_at: "2026-05-22T11:00:00Z",
    updated_at: "2026-05-22T14:00:00Z",
    items: [
      { id: 9, order_id: 6, product_id: 4, quantity: 1, unit_price: 54800 },
      { id: 10, order_id: 6, product_id: 5, quantity: 1, unit_price: 1280 },
    ],
  },
  {
    id: 7,
    order_number: "ORD-20260523-007",
    customer_name: "小林 雄一",
    customer_email: "kobayashi@example.com",
    status: "delivered",
    subtotal: 149800,
    discount_amount: 0,
    total_amount: 149800,
    campaign_id: null,
    created_at: "2026-05-23T09:30:00Z",
    updated_at: "2026-05-23T15:00:00Z",
    items: [
      { id: 11, order_id: 7, product_id: 1, quantity: 1, unit_price: 149800 },
    ],
  },
  {
    id: 8,
    order_number: "ORD-20260525-008",
    customer_name: "加藤 さくら",
    customer_email: "kato@example.com",
    status: "confirmed",
    subtotal: 25600,
    discount_amount: 0,
    total_amount: 25600,
    campaign_id: null,
    created_at: "2026-05-25T13:00:00Z",
    updated_at: "2026-05-25T13:05:00Z",
    items: [
      { id: 12, order_id: 8, product_id: 3, quantity: 2, unit_price: 12800 },
    ],
  },
  {
    id: 9,
    order_number: "ORD-20260527-009",
    customer_name: "渡辺 誠",
    customer_email: "watanabe@example.com",
    status: "pending",
    subtotal: 16760,
    discount_amount: 0,
    total_amount: 16760,
    campaign_id: null,
    created_at: "2026-05-27T08:30:00Z",
    updated_at: "2026-05-27T08:30:00Z",
    items: [
      { id: 13, order_id: 9, product_id: 3, quantity: 1, unit_price: 12800 },
      { id: 14, order_id: 9, product_id: 5, quantity: 3, unit_price: 1280 },
    ],
  },
];

let nextProductId = products.length + 1;
let nextOrderId = orders.length + 1;
let nextOrderItemId = orders.flatMap((o) => o.items).length + 1;
let nextMovementId = stockMovements.length + 1;

export function getProducts(): Product[] {
  return products;
}

export function updateProduct(
  id: number,
  input: Partial<Omit<Product, "id" | "created_at" | "updated_at">>,
): Product | undefined {
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  const updated: Product = {
    ...products[idx],
    ...input,
    updated_at: new Date().toISOString(),
  };
  products = [...products.slice(0, idx), updated, ...products.slice(idx + 1)];
  return updated;
}

export function deleteProduct(id: number): boolean {
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  products = [...products.slice(0, idx), ...products.slice(idx + 1)];
  inventory = inventory.filter((i) => i.product_id !== id);
  return true;
}

export function getProductById(id: number): Product | undefined {
  return products.find((p) => p.id === id);
}

export function createProduct(
  input: Omit<Product, "id" | "created_at" | "updated_at">,
): Product {
  const now = new Date().toISOString();
  const product: Product = {
    ...input,
    id: nextProductId++,
    created_at: now,
    updated_at: now,
  };
  products = [...products, product];
  inventory = [
    ...inventory,
    {
      id: inventory.length + 1,
      product_id: product.id,
      quantity: 0,
      avg_cost: 0,
      updated_at: now,
    },
  ];
  return product;
}

export function getStocks(): StockWithProduct[] {
  return inventory.map((inv) => {
    const product = products.find((p) => p.id === inv.product_id)!;
    return {
      ...inv,
      sku: product.sku,
      name: product.name,
      reorder_point: product.reorder_point,
    };
  });
}

export function adjustStock(
  product_id: number,
  quantity_delta: number,
): StockWithProduct | undefined {
  const idx = inventory.findIndex((i) => i.product_id === product_id);
  if (idx === -1) return undefined;
  const updated = {
    ...inventory[idx],
    quantity: inventory[idx].quantity + quantity_delta,
    updated_at: new Date().toISOString(),
  };
  inventory = [
    ...inventory.slice(0, idx),
    updated,
    ...inventory.slice(idx + 1),
  ];
  const product = products.find((p) => p.id === product_id)!;
  return {
    ...updated,
    sku: product.sku,
    name: product.name,
    reorder_point: product.reorder_point,
  };
}

export function getWarehouses(): Warehouse[] {
  return warehouses;
}

export function getStockMovements(): StockMovement[] {
  return stockMovements;
}

export function getStockMovementsWithDetails(): StockMovementWithDetails[] {
  return stockMovements.map((m) => {
    const product = products.find((p) => p.id === m.product_id)!;
    const warehouse = warehouses.find((w) => w.id === m.warehouse_id)!;
    return {
      ...m,
      product_name: product?.name ?? "不明",
      product_sku: product?.sku ?? "",
      warehouse_name: warehouse?.name ?? "不明",
    };
  });
}

export function addStockMovement(input: {
  product_id: number;
  warehouse_id: number;
  type: "in" | "out";
  quantity: number;
  memo?: string;
}): { movement: StockMovement; error?: string } {
  const inv = inventory.find((i) => i.product_id === input.product_id);
  if (!inv) return { movement: null as never, error: "商品が見つかりません" };

  if (input.type === "out" && inv.quantity < input.quantity) {
    return {
      movement: null as never,
      error: `在庫不足です（現在庫: ${inv.quantity}）`,
    };
  }

  const now = new Date().toISOString();
  const movement: StockMovement = {
    id: nextMovementId++,
    product_id: input.product_id,
    warehouse_id: input.warehouse_id,
    type: input.type,
    quantity: input.quantity,
    memo: input.memo,
    created_at: now,
  };
  stockMovements = [...stockMovements, movement];

  const delta = input.type === "in" ? input.quantity : -input.quantity;
  adjustStock(input.product_id, delta);

  return { movement };
}

export function getOrders(): OrderWithItems[] {
  return orders;
}

export function getOrderById(id: number): OrderWithItems | undefined {
  return orders.find((o) => o.id === id);
}

export function createOrder(input: {
  customer_name: string;
  customer_email: string;
  items: { product_id: number; quantity: number }[];
}): OrderWithItems {
  const now = new Date().toISOString();
  const orderItems: OrderItem[] = input.items.map((item) => {
    const product = products.find((p) => p.id === item.product_id);
    return {
      id: nextOrderItemId++,
      order_id: nextOrderId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: product?.unit_price ?? 0,
    };
  });
  const subtotal = orderItems.reduce(
    (sum, i) => sum + i.unit_price * i.quantity,
    0,
  );
  const order: OrderWithItems = {
    id: nextOrderId,
    order_number: `ORD-${now.slice(0, 10).replace(/-/g, "")}-${String(nextOrderId).padStart(3, "0")}`,
    customer_name: input.customer_name,
    customer_email: input.customer_email,
    status: "pending",
    subtotal,
    discount_amount: 0,
    total_amount: subtotal,
    campaign_id: null,
    created_at: now,
    updated_at: now,
    items: orderItems,
  };
  nextOrderId++;
  orders = [...orders, order];
  return order;
}

let shipments: Shipment[] = [];
let nextShipmentId = 1;

export function updateOrderStatus(
  id: number,
  status: OrderStatus,
): OrderWithItems | undefined {
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return undefined;
  const updated: OrderWithItems = {
    ...orders[idx],
    status,
    updated_at: new Date().toISOString(),
  };
  orders = [...orders.slice(0, idx), updated, ...orders.slice(idx + 1)];
  return updated;
}

export function createShipment(input: {
  order_id: number;
  carrier: string;
  tracking_number: string;
}): { shipment: Shipment; error?: string } {
  const order = orders.find((o) => o.id === input.order_id);
  if (!order) return { shipment: null as never, error: "受注が見つかりません" };

  const now = new Date().toISOString();
  const shipment: Shipment = {
    id: nextShipmentId++,
    ...input,
    created_at: now,
  };
  shipments = [...shipments, shipment];
  updateOrderStatus(input.order_id, "shipped");
  return { shipment };
}

export function getShipmentByOrderId(order_id: number): Shipment | undefined {
  return shipments.find((s) => s.order_id === order_id);
}
