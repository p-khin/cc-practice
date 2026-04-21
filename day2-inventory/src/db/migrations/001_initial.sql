CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  sku           TEXT    NOT NULL UNIQUE,
  name          TEXT    NOT NULL,
  description   TEXT,
  unit_price    REAL    NOT NULL CHECK (unit_price >= 0),
  cost_price    REAL    NOT NULL CHECK (cost_price >= 0),
  reorder_point INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL UNIQUE REFERENCES products(id),
  quantity   INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  avg_cost   REAL    NOT NULL DEFAULT 0,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS receiving_slips (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost   REAL    NOT NULL CHECK (unit_cost >= 0),
  supplier    TEXT,
  note        TEXT,
  received_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id     INTEGER NOT NULL REFERENCES products(id),
  movement_type  TEXT    NOT NULL CHECK (movement_type IN ('receive','ship','adjust')),
  quantity_delta INTEGER NOT NULL,
  unit_cost      REAL,
  reference_type TEXT    CHECK (reference_type IN ('receiving_slip','shipment','adjustment')),
  reference_id   INTEGER,
  note           TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS campaigns (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  discount_type    TEXT    NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value   REAL    NOT NULL CHECK (discount_value > 0),
  min_order_amount REAL    NOT NULL DEFAULT 0,
  starts_at        TEXT    NOT NULL,
  ends_at          TEXT    NOT NULL,
  is_active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number    TEXT    NOT NULL UNIQUE,
  customer_name   TEXT    NOT NULL,
  customer_email  TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
  subtotal        REAL    NOT NULL DEFAULT 0,
  discount_amount REAL    NOT NULL DEFAULT 0,
  total_amount    REAL    NOT NULL DEFAULT 0,
  campaign_id     INTEGER REFERENCES campaigns(id),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price REAL    NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS shipments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL UNIQUE REFERENCES orders(id),
  tracking_number TEXT    UNIQUE,
  carrier         TEXT,
  status          TEXT    NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','shipped','delivered')),
  shipped_at      TEXT,
  delivered_at    TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
