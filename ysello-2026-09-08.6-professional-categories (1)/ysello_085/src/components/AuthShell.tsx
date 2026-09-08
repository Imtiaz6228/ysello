import type { ReactNode } from "react";
import { BadgeCheck, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Seo } from "./Seo";
import { MarketFooter, MarketHeader } from "./MarketHeader";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <>
      <Seo title={title} description={subtitle} noIndex />
      <MarketHeader />
      <main className="auth-screen">
        <section className="auth-copy" aria-label="Account security">
          <Link
            className="brand-lockup auth-brand"
            to="/"
            aria-label="Ysello home"
          >
            <img
              className="brand-glyph"
              src="/ysello-mark.svg"
              alt=""
              width="44"
              height="44"
            />
            <span>
              <strong>YSELLO</strong>
              <small>DIGITAL EXCHANGE</small>
            </span>
          </Link>
          <div className="auth-copy-content">
            <span className="auth-eyebrow">
              <Sparkles size={14} /> {eyebrow}
            </span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <div className="auth-proof-grid">
              <div>
                <ShieldCheck />
                <span>
                  <strong>Protected checkout</strong>
                  <small>Order-linked payment status</small>
                </span>
              </div>
              <div>
                <BadgeCheck />
                <span>
                  <strong>Account security</strong>
                  <small>Strong passwords and session controls</small>
                </span>
              </div>
              <div>
                <Zap />
                <span>
                  <strong>Fast sessions</strong>
                  <small>Secure by default</small>
                </span>
              </div>
            </div>
          </div>
          <p className="auth-side-note">
            Trusted access for buyers, sellers and marketplace operators.
          </p>
        </section>
        <section className="auth-panel">
          <div className="auth-panel-inner">
            <Link className="mobile-auth-brand" to="/">
              Ysello
            </Link>
            {children}
          </div>
        </section>
      </main>
      <MarketFooter />
    </>
  );
}
