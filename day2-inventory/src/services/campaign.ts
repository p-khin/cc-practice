import { type Client } from '@libsql/client';
import { type Campaign, type CreateCampaignInput } from '../types/index.js';

export async function createCampaign(db: Client, input: CreateCampaignInput): Promise<Campaign> {
  const result = await db.execute({
    sql: `INSERT INTO campaigns (name, discount_type, discount_value, min_order_amount, starts_at, ends_at)
          VALUES (:name, :discount_type, :discount_value, :min_order_amount, :starts_at, :ends_at)
          RETURNING *`,
    args: {
      name: input.name,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      min_order_amount: input.min_order_amount,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
    },
  });
  return result.rows[0] as unknown as Campaign;
}

export async function listCampaigns(db: Client): Promise<Campaign[]> {
  const result = await db.execute('SELECT * FROM campaigns ORDER BY starts_at DESC');
  return result.rows as unknown as Campaign[];
}

export async function getCampaign(db: Client, id: number): Promise<Campaign | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM campaigns WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] as unknown as Campaign) ?? null;
}

export async function getActiveCampaign(db: Client, id: number, now: string): Promise<Campaign | null> {
  const result = await db.execute({
    sql: `SELECT * FROM campaigns
          WHERE id = ? AND is_active = 1
            AND starts_at <= ? AND ends_at >= ?`,
    args: [id, now, now],
  });
  return (result.rows[0] as unknown as Campaign) ?? null;
}

export async function deactivateCampaign(db: Client, id: number): Promise<boolean> {
  const result = await db.execute({
    sql: 'UPDATE campaigns SET is_active = 0 WHERE id = ?',
    args: [id],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export function calcDiscount(campaign: Campaign, subtotal: number): number {
  if (subtotal < campaign.min_order_amount) return 0;
  if (campaign.discount_type === 'percentage') {
    return Math.round(subtotal * (campaign.discount_value / 100) * 100) / 100;
  }
  return Math.min(campaign.discount_value, subtotal);
}
