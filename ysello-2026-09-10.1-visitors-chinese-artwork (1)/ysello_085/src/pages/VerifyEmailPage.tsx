import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { Seo } from "../components/Seo";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("Verifying your email...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setFailed(true);
      setMessage("This verification link is missing its token.");
      return;
    }

    void apiRequest(
      "/api/auth/verify-email",
      {
        method: "POST",
        body: { token },
      },
      false,
    )
      .then(() => {
        setMessage("Your email is verified. You can sign in now.");
      })
      .catch((error) => {
        setFailed(true);
        setMessage(
          error instanceof ApiError
            ? error.message
            : "Email verification failed.",
        );
      });
  }, [params]);

  return (
    <main className="center-page">
      <Seo
        title="Email verification"
        description="Complete a requested Ysello account verification step."
        noIndex
      />
      <section className="message-card">
        <span className={`role-pill ${failed ? "danger" : ""}`}>
          Email verification
        </span>
        <h1>{failed ? "Link not accepted" : "Almost there"}</h1>
        <p>{message}</p>
        <Link className="primary-link" to="/sign-in">
          Go to sign in
        </Link>
      </section>
    </main>
  );
}
