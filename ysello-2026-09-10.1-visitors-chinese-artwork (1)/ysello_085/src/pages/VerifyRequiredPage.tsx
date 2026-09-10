import { useState } from "react";
import { MailCheck, RefreshCw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { Alert } from "../components/Alert";
import { Seo } from "../components/Seo";

export function VerifyRequiredPage() {
  const location = useLocation();
  const state = location.state as {
    email?: string;
    deliveryError?: string;
  } | null;
  const email = state?.email;
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(
    state?.deliveryError
      ? { type: "error", message: state.deliveryError }
      : null,
  );
  const [loading, setLoading] = useState(false);

  async function resendVerification() {
    if (!email) {
      setStatus({
        type: "error",
        message:
          "Sign in again with your email to request a new verification link.",
      });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const data = await apiRequest<{ message: string }>(
        "/api/auth/resend-verification",
        {
          method: "POST",
          body: { email },
        },
        false,
      );
      setStatus({ type: "success", message: data.message });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof ApiError
            ? error.message
            : "Could not send a new verification link.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="center-page">
      <Seo
        title="Check your email"
        description="Continue a requested Ysello account verification step."
        noIndex
      />
      <section className="message-card">
        <span
          className={`role-pill ${status?.type === "error" ? "danger" : ""}`}
        >
          Email verification
        </span>
        <h1>
          {status?.type === "error"
            ? "Verification email needs another try"
            : "Check your inbox"}
        </h1>
        <p>
          {status?.type === "error"
            ? `Your account is waiting for verification${email ? ` at ${email}` : ""}.`
            : `We sent a verification link${email ? ` to ${email}` : " to your email address"}.`}
        </p>
        {status ? <Alert type={status.type} message={status.message} /> : null}
        <div className="message-actions">
          <button
            className="primary-link"
            type="button"
            onClick={resendVerification}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw size={16} aria-hidden="true" />
            ) : (
              <MailCheck size={16} aria-hidden="true" />
            )}
            {loading ? "Sending..." : "Resend email"}
          </button>
          <Link className="secondary-button" to="/sign-in">
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
