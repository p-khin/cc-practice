import { z } from 'zod';

// --- Product ---
export const CreateProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  unit_price: z.number().nonnegative(),
  cost_price: z.number().nonnegative(),
  reorder_point: z.number().int().nonnegative().default(0),
});

export const UpdateProductSchema = CreateProductSchema.partial().omit({ sku: true });

// --- Receiving ---
export const CreateReceivingSlipSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unit_cost: z.number().nonnegative(),
  supplier: z.string().optional(),
  note: z.string().optional(),
});

// --- Order ---
export const OrderItemInputSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export const CreateOrderSchema = z.object({
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  items: z.array(OrderItemInputSchema).min(1),
  campaign_id: z.number().int().positive().optional(),
});

export const OrderStatusSchema = z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);

// --- Shipment ---
export const CreateShipmentSchema = z.object({
  order_id: z.number().int().positive(),
  tracking_number: z.string().optional(),
  carrier: z.string().optional(),
});

export const ShipmentStatusSchema = z.enum(['pending', 'shipped', 'delivered']);

// --- Campaign ---
export const CreateCampaignSchema = z.object({
  name: z.string().min(1),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive(),
  min_order_amount: z.number().nonnegative().default(0),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
});

// --- Stock Adjustment ---
export const StockAdjustmentSchema = z.object({
  product_id: z.number().int().positive(),
  quantity_delta: z.number().int(),
  note: z.string().optional(),
});
