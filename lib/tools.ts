import { Behavior, Type, type FunctionDeclaration } from "@google/genai";
import ordersData from "@/data/orders.json";

export interface OrderRecord {
  order_id: string;
  customer: string;
  product: string;
  value: string;
  status: string;
  notes: string;
}

const orders = ordersData as Record<string, OrderRecord>;

export const getOrderDetailsDeclaration: FunctionDeclaration = {
  name: "get_order_details",
  description:
    "Looks up an Aura Skincare order by its order ID and returns the customer, product, value, status, and delivery/cancellation notes. Call this whenever the customer references a specific order or asks about its status, tracking, cancellation, or return eligibility.",
  behavior: Behavior.BLOCKING,
  parameters: {
    type: Type.OBJECT,
    properties: {
      order_id: {
        type: Type.STRING,
        description: 'The order ID referenced by the customer, e.g. "ORD-101".',
      },
    },
    required: ["order_id"],
  },
};

export function getOrderDetails(orderId: string): Record<string, unknown> {
  const normalized = orderId.trim().toUpperCase();
  const order = orders[normalized];
  if (!order) {
    return { error: "not_found", order_id: normalized };
  }
  return { output: order };
}
