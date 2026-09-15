import { z } from "zod";

export const CreateSchoolDto = z.object({
  name: z.string().min(1, "School name is required"),
});

export type CreateSchoolInput = z.infer<typeof CreateSchoolDto>;
