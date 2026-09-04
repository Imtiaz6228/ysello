import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, MessageCircle, Send, X } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type Inquiry = {
  id: string;
  contextUrl?: string | null;
  contextLabel?: string | null;
  recipient?: { sellerProfile?: { storeName: string; slug: string } | null } | null;
  messages: Array<{ id: string; role: string; body: string; createdAt: string }>;
};

export function SellerContactDialog({
  storeSlug,
  storeName,
  productSlug,
  productTitle,
  className = "seller-contact-trigger",
}: {
  storeSlug: string;
  storeName: string;
  productSlug?: string;
  productTitle?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [subject, setSubject] = useState(
    productTitle ? `Question about ${productTitle}` : `Question for ${storeName}`,
  );
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const contextUrl = productSlug
    ? `/product/${productSlug}`
    : `/stores/${storeSlug}`;
  const activeInquiry = useMemo(
    () =>
      inquiries.find(
        (item) =>
          item.contextUrl === contextUrl &&
          item.recipient?.sellerProfile?.slug === storeSlug,
      ),
    [contextUrl, inquiries, storeSlug],
  );

  useEffect(() => {
    if (!open || !user) return;
    void apiRequest<{ sessions: Inquiry[] }>("/api/marketplace/seller-inquiries")
      .then((data) => setInquiries(data.sessions))
      .catch(() => undefined);
  }, [open, user]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    setNotice("");
    try {
      if (activeInquiry) {
        await apiRequest(
          `/api/marketplace/seller-inquiries/${activeInquiry.id}/messages`,
          { method: "POST", body: { body: message.trim() } },
        );
      } else {
        await apiRequest(`/api/marketplace/stores/${storeSlug}/contact`, {
          method: "POST",
          body: {
            subject: subject.trim(),
            message: message.trim(),
            productSlug,
            contextLabel: productTitle ?? storeName,
          },
        });
      }
      setMessage("");
      setNotice("Message sent. The seller can reply in this conversation.");
      const data = await apiRequest<{ sessions: Inquiry[] }>(
        "/api/marketplace/seller-inquiries",
      );
      setInquiries(data.sessions);
    } catch (error) {
      setNotice(
        error instanceof ApiError ? error.message : "The message could not be sent.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <MessageCircle /> Contact seller
      </button>
      {open ? (
        <div className="seller-contact-backdrop" role="presentation">
          <section
            className="seller-contact-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-contact-title"
          >
            <header>
              <span><MessageCircle /></span>
              <div>
                <small>DIRECT SELLER MESSAGE</small>
                <h2 id="seller-contact-title">Contact {storeName}</h2>
              </div>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
                <X />
              </button>
            </header>
            {!user ? (
              <div className="seller-contact-auth">
                <BadgeCheck />
                <h3>Sign in to contact this seller</h3>
                <p>Your identity keeps marketplace conversations accountable.</p>
                <Link to="/sign-in">Sign in <ArrowRight /></Link>
              </div>
            ) : (
              <>
                {activeInquiry?.messages.length ? (
                  <div className="seller-contact-thread" aria-live="polite">
                    {activeInquiry.messages.map((entry) => (
                      <div className={entry.role} key={entry.id}>
                        <small>{entry.role === "seller" ? storeName : "You"}</small>
                        <p>{entry.body}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="seller-contact-intro">
                    Ask about compatibility, delivery, scope, or product details.
                    Keep payment and delivery on Ysello for buyer protection.
                  </div>
                )}
                <form onSubmit={send}>
                  {!activeInquiry ? (
                    <label>
                      <span>Subject</span>
                      <input
                        required
                        minLength={3}
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                      />
                    </label>
                  ) : null}
                  <label>
                    <span>{activeInquiry ? "Reply" : "Your question"}</span>
                    <textarea
                      required
                      minLength={activeInquiry ? 1 : 10}
                      rows={4}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Write a clear question for the seller…"
                    />
                  </label>
                  {notice ? <p className="seller-contact-notice">{notice}</p> : null}
                  <button type="submit" disabled={busy || !message.trim()}>
                    <Send /> {busy ? "Sending…" : "Send securely"}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}