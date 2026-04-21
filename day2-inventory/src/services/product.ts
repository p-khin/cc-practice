import { type Client } from '@libsql/client';
import { type Product, type CreateProductInput, type UpdateProductInput } from '../types/index.js';

export async function createProduct(db: Client, input: CreateProductInput): Promise<Product> {
  const result = await db.execute({
    sql: `INSERT INTO products (sku, name, description, unit_price, cost_price, reorder_point)
          VALUES (:sku, :name, :description, :unit_price, :cost_price, :reorder_point)
          RETURNING *`,
    args: {
      sku: input.sku,
      name: input.name,
      description: input.description ?? null,
      unit_price: input.unit_price,
      cost_price: input.cost_price,
      reorder_point: input.reorder_point,
    },
  });
  return result.rows[0] as unknown as Product;
}

export async function listProducts(db: Client): Promise<Product[]> {
  const result = await db.execute('SELECT * FROM products ORDER BY id');
  return result.rows as unknown as Product[];
}

export async function getProduct(db: Client, id: number): Promise<Product | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM products WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] as unknown as Product) ?? null;
}

export async function getProductBySku(db: Client, sku: string): Promise<Product | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM products WHERE sku = ?',
    args: [sku],
  });
  return (result.rows[0] as unknown as Product) ?? null;
}

export async function updateProduct(
  db: Client,
  id: number,
  input: UpdateProductInput
): Promise<Product | null> {
  const fields = Object.entries(input)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = :${k}`);

  if (fields.length === 0) return getProduct(db, id);

  const result = await db.execute({
    sql: `UPDATE products
          SET ${fields.join(', ')}, updated_at = datetime('now')
          WHERE id = :id
          RETURNING *`,
    args: { id, ...input },
  });
  return (result.rows[0] as unknown as Product) ?? null;
}

export async function deleteProduct(db: Client, id: number): Promise<boolean> {
  const result = await db.execute({
    sql: 'DELETE FROM products WHERE id = ?',
    args: [id],
  });
  return (result.rowsAffected ?? 0) > 0;
}
