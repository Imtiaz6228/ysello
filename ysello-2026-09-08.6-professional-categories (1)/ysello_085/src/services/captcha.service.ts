import { env } from "../config/env.js";
import { ApiError } from "../middleware/error-handler.js";

type TurnstileResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyCaptcha(
  token: string | undefined,
  remoteIp?: string,
) {
  if (!env.TURNSTILE_REQUIRED) {
    return;
  }

  if (!token) {
    throw new ApiError(
      400,
      "Bot protection verification is required.",
      "CAPTCHA_REQUIRED",
    );
  }

  const formData = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY ?? "",
    response: token,
  });

  if (remoteIp) {
    formData.set("remoteip", remoteIp);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: formData,
    },
  );

  const result = (await response.json()) as TurnstileResponse;
  if (!result.success) {
    throw new ApiError(
      400,
      "Bot protection verification failed.",
      "CAPTCHA_FAILED",
      result["error-codes"],
    );
  }
}
