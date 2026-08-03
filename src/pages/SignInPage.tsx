import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError, homePathForRole } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { AuthShell } from "../components/AuthShell";
import { GoogleAuthButton } from "../components/GoogleAuthButton";
import { PasswordField } from "../components/PasswordField";
import { googleAuthStatusMessage } from "../lib/google-auth-ui";

export function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const googleStatus = googleAuthStatusMessage(
    new URLSearchParams(location.search).get("google"),
  );
  const returnTo = (location.state as { from?: { pathname?: string } } | null)
    ?.from?.pathname;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!email.includes("@") || !password) {
      setStatus({
        type: "error",
        message: "Enter a valid email and password.",
      });
      return;
    }

    setLoading(true);
    try {
      const user = await signIn({ email, password, rememberMe });
      setStatus({ type: "success", message: "Signed in successfully." });

      const destination =
        (location.state as { from?: { pathname?: string } } | null)?.from
          ?.pathname ?? homePathForRole(user.role);

      navigate(destination, { replace: true });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof ApiError
            ? error.message
            : "Could not sign in. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Simple, secure account access"
      title="Welcome back to Ysello."
      subtitle="Sign in with your email and password. No email code or verification link is required."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-heading">
          <h2>Welcome back</h2>
          <p>Enter your email and password to continue instantly.</p>
        </div>

        {status ? <Alert type={status.type} message={status.message} /> : null}
        {!status && googleStatus ? (
          <Alert type="error" message={googleStatus} />
        ) : null}

        <GoogleAuthButton intent="signin" returnTo={returnTo} />

        <div className="auth-divider" role="separator">
          <span>or continue with email</span>
        </div>

        <label className="field" htmlFor="email">
          <span>Email address</span>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        <div className="form-row between">
          <label className="check-row">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        <button className="primary-button" type="submit" disabled={loading}>
          <LockKeyhole size={18} aria-hidden="true" />
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="switch-auth">
          New here?{" "}
          <Link to="/register" state={location.state}>
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
