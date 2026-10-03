import { z } from "zod";

export const checkoutSchema = z
  .object({
    customerName: z.string().trim().min(2).max(100),
    customerEmail: z.string().trim().email().or(z.literal("")),
    orderMethod: z.enum(["pickup", "delivery"]),
    paymentMethod: z.enum(["cod", "qr"]),
    departmentName: z.string().trim().min(2).max(100).optional(),
    customerNote: z.string().trim().max(300).optional(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          addonIds: z.array(z.string().uuid()).max(7),
          temperature: z.enum(["hot", "iced"]),
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .min(1)
      .max(50),
  })
  .superRefine((value, ctx) => {
    if (value.orderMethod === "delivery" && !value.departmentName)
      ctx.addIssue({
        code: "custom",
        path: ["departmentName"],
        message: "Enter your department for delivery.",
      });
  });
export type CheckoutInput = z.infer<typeof checkoutSchema>;
