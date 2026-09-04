import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Seo } from "../components/Seo";

export function SignOutPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/sign-in" replace />;

  async function confirmSignOut() {
    await logout();
    navigate("/", { replace: true });
  }

  const returnPath = ["ADMIN", "SUPER_ADMIN", "MODERATOR"].includes(user.role)
    ? "/admin"
    : user.role === "SELLER"
      ? "/seller"
      : "/dashboard";

  return (
    <main className="signout-page">
      <Seo
        title="Sign out"
        description="Securely sign out of your Ysello account."
        noIndex
      />
      <section className="signout-card">
        <div className="signout-icon">
          <LogOut />
        </div>
        <span className="section-index">SECURE SESSION</span>
        <h1>Sign out of Ysello?</h1>
        <p>
          You are signed in as{" "}
          <strong>
            {user.firstName} {user.lastName}
          </strong>
          . Signing out will end this browser session.
        </p>
        <div className="signout-actions">
          <button
            className="danger-button solid"
            type="button"
            onClick={() => void confirmSignOut()}
          >
            <LogOut size={17} /> Sign out now
          </button>
          <Link className="secondary-button" to={returnPath}>
            <ArrowLeft size={17} /> Return to dashboard
          </Link>
        </div>
        <small>
          <ShieldCheck size={14} /> Your account data and orders remain safe.
        </small>
      </section>
    </main>
  );
}
