import { z } from "zod";
import {
  emailSchema,
  optionalTrimmedString,
  phoneSchema,
  usernameSchema,
} from "./shared.js";

export const updateProfileSchema = z
  .object({
    firstName: optionalTrimmedString(80),
    lastName: optionalTrimmedString(80),
    username: usernameSchema.optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    country: optionalTrimmedString(80),
    city: optionalTrimmedString(80),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide at least one field to update.",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
