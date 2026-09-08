import { Router } from "express";
import { env } from "../config/env.js";
import {
  clearGoogleOAuthCookie,
  getGoogleOAuthCookie,
  issueCsrfToken,
  setAuthCookies,
  setGoogleOAuthCookie,
} from "../lib/cookies.js";
import { requireAuth, requireVerifiedUser } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/error-handler.js";
import { authLimiter, sensitiveLimiter } from "../middleware/rate-limit.js";
import { imageUpload } from "../middleware/upload.js";
import {
  availabilitySchema,
  changePasswordSchema,
  forgotPasswordSchema,
  googleOAuthCallbackSchema,
  googleOAuthStartSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../schemas/auth.schemas.js";
import {
  changePassword,
  createSession,
  getAvailability,
  getCurrentUser,
  getRefreshTokenFromRequest,
  loginUser,
  logoutUser,
  refreshUserSession,
  registerUser,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmailToken,
} from "../services/auth.service.js";
import { verifyCaptcha } from "../services/captcha.service.js";
import { clearAuthCookies } from "../lib/cookies.js";
import {
  authenticateWithGoogle,
  createGoogleOAuthFlow,
  readGoogleOAuthFlow,
} from "../services/google-auth.service.js";

export const authRouter = Router();

function googleAuthPage(intent: "signin" | "register", status: string) {
  const url = new URL(
    intent === "register" ? "/register" : "/sign-in",
    env.APP_URL,
  );
  url.searchParams.set("google", status);
  return url.toString();
}

function googleErrorStatus(error: unknown) {
  if (!(error instanceof ApiError)) return "failed";

  switch (error.code) {
    case "ACCOUNT_SUSPENDED":
      return "suspended";
    case "GOOGLE_ACCOUNT_CONFLICT":
      return "account_conflict";
    case "GOOGLE_EMAIL_NOT_VERIFIED":
      return "email_unverified";
    case "GOOGLE_OAUTH_NOT_CONFIGURED":
      return "unavailable";
    case "GOOGLE_OAUTH_STATE_INVALID":
      return "invalid_session";
    default:
      return "failed";
  }
}

function homePathForRole(role: string) {
  if (["MODERATOR", "ADMIN", "SUPER_ADMIN"].includes(role)) return "/admin";
  if (role === "SELLER") return "/seller";
  return "/dashboard";
}

authRouter.get(
  "/availability",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = availabilitySchema.parse(req.query);
    const availability = await getAvailability(input.email, input.username);

    res.json(availability);
  }),
);

authRouter.get(
  "/google/start",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = googleOAuthStartSchema.parse(req.query);
    let flow;

    try {
      flow = createGoogleOAuthFlow(input);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "GOOGLE_OAUTH_NOT_CONFIGURED"
      ) {
        res.setHeader("Cache-Control", "private, no-store");
        res.redirect(303, googleAuthPage(input.intent, "unavailable"));
        return;
      }

      throw error;
    }

    setGoogleOAuthCookie(res, flow.cookieValue);
    res.setHeader("Cache-Control", "private, no-store");
    res.redirect(302, flow.authorizationUrl);
  }),
);

authRouter.get(
  "/google/callback",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = googleOAuthCallbackSchema.parse(req.query);
    let flow;

    try {
      flow = readGoogleOAuthFlow(getGoogleOAuthCookie(req), input.state);
    } catch (error) {
      clearGoogleOAuthCookie(res);
      res.redirect(303, googleAuthPage("signin", googleErrorStatus(error)));
      return;
    }

    clearGoogleOAuthCookie(res);
    if (input.error) {
      res.redirect(
        303,
        googleAuthPage(
          flow.intent,
          input.error === "access_denied" ? "cancelled" : "failed",
        ),
      );
      return;
    }
    if (!input.code) {
      res.redirect(303, googleAuthPage(flow.intent, "failed"));
      return;
    }

    try {
      const user = await authenticateWithGoogle(input.code, flow.codeVerifier);
      const session = await createSession(user, req, true);
      setAuthCookies(
        res,
        session.accessToken,
        session.refreshToken,
        session.rememberMe,
      );
      issueCsrfToken(res);
      res.setHeader("Cache-Control", "private, no-store");
      res.redirect(
        303,
        new URL(
          flow.returnTo ?? homePathForRole(user.role),
          env.APP_URL,
        ).toString(),
      );
    } catch (error) {
      if (!(error instanceof ApiError)) {
        console.error(
          "Google OAuth callback failed:",
          error instanceof Error ? error.message : error,
        );
      }
      res.redirect(303, googleAuthPage(flow.intent, googleErrorStatus(error)));
    }
  }),
);

authRouter.post(
  "/register",
  authLimiter,
  imageUpload.single("profilePicture"),
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    await verifyCaptcha(input.captchaToken, req.ip);

    const user = await registerUser(input, req.file);
    const session = await createSession(
      {
        id: user.id,
        role: user.role,
        emailVerifiedAt: new Date(),
      },
      req,
      true,
    );

    setAuthCookies(
      res,
      session.accessToken,
      session.refreshToken,
      session.rememberMe,
    );
    const csrfToken = issueCsrfToken(res);

    res.status(201).json({
      message: "Account created successfully.",
      user,
      csrfToken,
    });
  }),
);

authRouter.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const { user, session } = await loginUser(input, req);

    setAuthCookies(
      res,
      session.accessToken,
      session.refreshToken,
      session.rememberMe,
    );
    const csrfToken = issueCsrfToken(res);

    res.json({
      message: "Signed in successfully.",
      user,
      csrfToken,
    });
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { user, session } = await refreshUserSession(
      getRefreshTokenFromRequest(req),
      req,
    );

    setAuthCookies(
      res,
      session.accessToken,
      session.refreshToken,
      session.rememberMe,
    );
    const csrfToken = issueCsrfToken(res);

    res.json({
      user,
      csrfToken,
    });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    await logoutUser(getRefreshTokenFromRequest(req));
    clearAuthCookies(res);

    res.json({
      message: "Signed out successfully.",
    });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getCurrentUser(req.auth!.id);

    res.json({ user });
  }),
);

authRouter.post(
  "/verify-email",
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const input = verifyEmailSchema.parse(req.body);
    const user = await verifyEmailToken(input.token);

    res.json({
      message: "Email verified successfully.",
      user,
    });
  }),
);

authRouter.post(
  "/resend-verification",
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const input = resendVerificationSchema.parse(req.body);
    await resendVerification(input.email);

    res.json({
      message: "If that account needs verification, a new email has been sent.",
    });
  }),
);

authRouter.post(
  "/forgot-password",
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const input = forgotPasswordSchema.parse(req.body);
    await verifyCaptcha(input.captchaToken, req.ip);
    await requestPasswordReset(input.email);

    res.json({
      message:
        "If an account exists for that email, a reset link has been sent.",
    });
  }),
);

authRouter.post(
  "/reset-password",
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const input = resetPasswordSchema.parse(req.body);
    await resetPassword(input.token, input.password);
    clearAuthCookies(res);

    res.json({
      message:
        "Password reset successfully. Please sign in with your new password.",
    });
  }),
);

authRouter.post(
  "/change-password",
  requireAuth,
  requireVerifiedUser,
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    await changePassword(req.auth!.id, input.currentPassword, input.password);
    clearAuthCookies(res);

    res.json({
      message: "Password changed successfully. Please sign in again.",
    });
  }),
);
