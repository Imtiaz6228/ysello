import { z } from "zod";

export const formBoolean = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }

  return false;
}, z.boolean());

export const requiredConsent = (message: string) =>
  formBoolean.refine(Boolean, { message });

export const optionalTrimmedString = (max = 160) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  }, z.string().trim().max(max).optional());

export const emailSchema = z.string().trim().email().max(254).toLowerCase();

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_]+$/, "Use only letters, numbers, and underscores.")
  .transform((value) => value.toLowerCase());

export const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .regex(/^[+()\-\s0-9]+$/, "Enter a valid phone number.");
