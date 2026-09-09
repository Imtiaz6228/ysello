import { z } from "zod";
import { getPasswordIssues } from "../lib/password.js";
import {
  emailSchema,
  optionalTrimmedString,
  phoneSchema,
  requiredConsent,
  usernameSchema,
} from "./shared.js";

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    username: usernameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: z.string().min(1),
    confirmPassword: z.string().min(1),
    country: z.string().trim().min(2).max(80),
    city: optionalTrimmedString(80),
    termsAccepted: requiredConsent("You must accept the terms and conditions."),
    privacyAccepted: requiredConsent("You must accept the privacy policy."),
    captchaToken: optionalTrimmedString(2048),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }

    const passwordIssues = getPasswordIssues(data.password, [
      data.firstName,
      data.lastName,
      data.username,
      data.email,
    ]);

    for (const message of passwordIssues) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message,
      });
    }
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
  rememberMe: z.coerce.boolean().default(false),
});

export const availabilitySchema = z.object({
  email: emailSchema.optional(),
  username: usernameSchema.optional(),
});

export const googleOAuthStartSchema = z.object({
  intent: z.enum(["signin", "register"]).default("signin"),
  returnTo: z.string().max(1024).optional(),
});

export const googleOAuthCallbackSchema = z.object({
  code: z.string().min(1).max(4096).optional(),
  state: z.string().min(1).max(1024).optional(),
  error: z.string().max(200).optional(),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(32).max(512),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  captchaToken: optionalTrimmedString(2048),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(512),
    password: z.string().min(1),
    confirmPassword: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }

    for (const message of getPasswordIssues(data.password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message,
      });
    }
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    password: z.string().min(1),
    confirmPassword: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }

    for (const message of getPasswordIssues(data.password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message,
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
