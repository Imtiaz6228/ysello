import { FormEvent, useState } from "react";
import { ArrowLeft, MailCheck, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { Alert } from "../components/Alert";
import { AuthShell } from "../components/AuthShell";
import { Captcha } from "../components/Captcha";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!email.includes("@")) {
      setStatus({ type: "error", message: "Enter a valid email address." });
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest<{ message: string }>(
        "/api/auth/forgot-password",
        {
          method: "POST",
          body: {
            email,
            captchaToken: captchaToken || undefined,
          },
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
            : "Could not send a reset link. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Password recovery"
      title="Reset access without losing momentum."
      subtitle="Request a secure reset link for your marketplace account and return to protected orders, files and tools."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-heading">
          <h2>Forgot password</h2>
          <p>Enter the email attached to your account.</p>
        </div>

        {status ? <Alert type={status.type} message={status.message} /> : null}

        <label className="field" htmlFor="forgotEmail">
          <span>Email address</span>
          <input
            id="forgotEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <Captcha onVerify={setCaptchaToken} />

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? (
            <MailCheck size={18} aria-hidden="true" />
          ) : (
            <Send size={18} aria-hidden="true" />
          )}
          {loading ? "Sending link..." : "Send reset link"}
        </button>

        <p className="switch-auth">
          <Link to="/sign-in">
            <ArrowLeft size={14} aria-hidden="true" /> Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
