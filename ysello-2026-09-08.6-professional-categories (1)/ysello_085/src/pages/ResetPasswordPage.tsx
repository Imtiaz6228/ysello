import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { Alert } from "../components/Alert";
import { AuthShell } from "../components/AuthShell";
import { PasswordField } from "../components/PasswordField";
import { PasswordStrength } from "../components/PasswordStrength";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(
    token
      ? null
      : { type: "error", message: "This reset link is missing its token." },
  );
  const [loading, setLoading] = useState(false);
  const resetComplete = status?.type === "success";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!token) {
      setStatus({
        type: "error",
        message: "This reset link is missing its token.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest<{ message: string }>(
        "/api/auth/reset-password",
        {
          method: "POST",
          body: {
            token,
            password,
            confirmPassword,
          },
        },
        false,
      );
      setPassword("");
      setConfirmPassword("");
      setStatus({ type: "success", message: data.message });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof ApiError
            ? error.message
            : "Could not reset your password. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Secure reset"
      title="Choose a stronger password."
      subtitle="Reset links are single-use and expire quickly, so your account stays protected while you recover access."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-heading">
          <h2>Reset password</h2>
          <p>Create a new password for your account.</p>
        </div>

        {status ? <Alert type={status.type} message={status.message} /> : null}

        {resetComplete || !token ? (
          <Link
            className="primary-button"
            to={resetComplete ? "/sign-in" : "/forgot-password"}
          >
            {resetComplete ? (
              <CheckCircle2 size={18} aria-hidden="true" />
            ) : (
              <ArrowLeft size={18} aria-hidden="true" />
            )}
            {resetComplete ? "Go to sign in" : "Request a new link"}
          </Link>
        ) : (
          <>
            <PasswordField
              id="newPassword"
              label="New password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />

            <PasswordField
              id="confirmNewPassword"
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />

            <PasswordStrength value={password} />

            <button className="primary-button" type="submit" disabled={loading}>
              <KeyRound size={18} aria-hidden="true" />
              {loading ? "Resetting password..." : "Reset password"}
            </button>
          </>
        )}

        <p className="switch-auth">
          <Link to="/sign-in">
            <ArrowLeft size={14} aria-hidden="true" /> Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
