import { z } from "zod";

export const CreateReferralDto = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  referralCode: z.string().min(3, "Referral code must be at least 3 characters"),
  referredByCode: z.string().optional(),
});

export const TreeQueryDto = z.object({
  depth: z.coerce.number().int().positive().optional(),
});

export type CreateReferralInput = z.infer<typeof CreateReferralDto>;
export type TreeQueryInput = z.infer<typeof TreeQueryDto>;
