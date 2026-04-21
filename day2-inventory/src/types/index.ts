import { z } from 'zod';
import {
  CreateProductSchema,
  UpdateProductSchema,
  CreateReceivingSlipSchema,
  CreateOrderSchema,
  OrderItemInputSchema,
  OrderStatusSchema,
  CreateShipmentSchema,
  ShipmentStatusSchema,
  CreateCampaignSchema,
  StockAdjustmentSchema,
} from '../schemas/index.js';

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type CreateReceivingSlipInput = z.infer<typeof CreateReceivingSlipSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type OrderItemInput = z.infer<typeof OrderItemInputSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type CreateShipmentInput = z.infer<typeof CreateShipmentSchema>;
export type ShipmentStatus = z.infer<typeof ShipmentStatusSchema>;
export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;

// DB row types
export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  unit_price: number;
  cost_price: number;
  reorder_point: number;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: number;
  product_id: number;
  quantity: number;
  avg_cost: number;
  updated_at: string;
}

export interface ReceivingSlip {
  id: number;
  product_id: number;
  quantity: number;
  unit_cost: number;
  supplier: string | null;
  note: string | null;
  received_at: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  movement_type: 'receive' | 'ship' | 'adjust';
  quantity_delta: number;
  unit_cost: number | null;
  reference_type: 'receiving_slip' | 'shipment' | 'adjustment' | null;
  reference_id: number | null;
  note: string | null;
  created_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  starts_at: string;
  ends_at: string;
  is_active: number;
}

export interface Order {
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
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface Shipment {
  id: number;
  order_id: number;
  tracking_number: string | null;
  carrier: string | null;
  status: ShipmentStatus;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

// Report types
export interface SalesReport {
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  order_count: number;
}

export interface InventoryValuation {
  product_id: number;
  sku: string;
  name: string;
  quantity: number;
  avg_cost: number;
  total_value: number;
}
