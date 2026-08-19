export type UserRole = "customer" | "admin";
export type TimeSlot = "morning" | "lunch";
export type OrderMethod = "pickup" | "delivery";
export type PaymentStatus = "unpaid" | "paid";
export type PaymentMethod = "cod" | "qr";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "to_be_delivered"
  | "completed"
  | "rejected"
  | "cancelled";

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}
export interface Product {
  id: string;
  name: string;
  price_centavos: number;
  is_available: boolean;
  sort_order: number;
  category_id: string;
  category?: Category | null;
  description?: string | null;
  image_url?: string | null;
}
export interface Addon {
  id: string;
  name: string;
  price_centavos: number;
  is_available: boolean;
  sort_order: number;
}
export interface BusinessSettings {
  accepting_orders: boolean;
  morning_cutoff: string;
  lunch_cutoff: string;
  slot_capacity: number;
  monday_booking_lead_days: number;
  tuesday_booking_lead_days: number;
  wednesday_booking_lead_days: number;
  thursday_booking_lead_days: number;
  friday_booking_lead_days: number;
  timezone: string;
  payment_qr_url: string | null;
}
export interface CartLine {
  lineId: string;
  product: Product;
  addons: Addon[];
  quantity: number;
}
export interface SlotCapacity {
  time_slot: TimeSlot;
  reserved_cups: number;
  capacity: number;
}
export interface OrderSummary {
  id: string;
  order_number: number;
  customer_name_snapshot: string;
  fulfillment_date: string;
  time_slot: TimeSlot;
  order_method: OrderMethod;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  total_centavos: number;
  created_at: string;
}
export interface OrderDetail extends OrderSummary {
  customer_email_snapshot: string | null;
  department_name_snapshot: string | null;
  customer_note: string | null;
  rejection_message: string | null;
  guest_access_token?: string;
  order_items: Array<{
    id: string;
    product_name_snapshot: string;
    unit_price_snapshot_centavos: number;
    quantity: number;
    subtotal_centavos: number;
    order_item_addons: Array<{
      addon_name_snapshot: string;
      addon_price_snapshot_centavos: number;
    }>;
  }>;
}
