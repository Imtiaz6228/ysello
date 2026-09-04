import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Headphones,
  MessageCircle,
  Plus,
  Send,
} from "lucide-react";
import { ApiError, apiRequest } from "../api/client";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";

type Ticket = {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  updatedAt: string;
  messages: Array<{ id: string; body: string; createdAt: string }>;
};
const categories = [
  "PAYMENT_ISSUE",
  "DOWNLOAD_ISSUE",
  "REFUND_REQUEST",
  "PRODUCT_PROBLEM",
  "SELLER_ISSUE",
  "TECHNICAL_ISSUE",
] as const;

export function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    category: "PAYMENT_ISSUE",
    subject: "",
    body: "",
    orderId: "",
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () =>
    apiRequest<{ tickets: Ticket[] }>("/api/commerce/tickets")
      .then((data) => setTickets(data.tickets))
      .catch(() => undefined);
  useEffect(() => {
    void load();
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await apiRequest("/api/commerce/tickets", {
        method: "POST",
        body: { ...form, orderId: form.orderId || undefined },
      });
      setForm({
        category: "PAYMENT_ISSUE",
        subject: "",
        body: "",
        orderId: "",
      });
      setOpen(false);
      setMessage("Ticket opened. We’ll email you when it changes.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Could not open the ticket.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="commerce-page">
      <Seo
        title="Support center"
        description="Get help with payments, downloads, refunds, products, sellers, and technical issues."
        noIndex
      />
      <MarketHeader />
      <section className="support-hero">
        <div>
          <span className="section-index">HUMAN SUPPORT</span>
          <h1>We’ll help you untangle it.</h1>
          <p>
            Order-linked tickets keep the buyer, seller, and support team in one
            clear record.
          </p>
        </div>
        <div>
          <Headphones />
          <strong>Support every day</strong>
          <span>Email notifications on every meaningful update</span>
        </div>
      </section>
      {message ? (
        <div className="support-notice">
          <CheckCircle2 /> {message}
        </div>
      ) : null}
      <section className="support-layout">
        <div>
          <header>
            <div>
              <span className="section-index">YOUR TICKETS</span>
              <h2>Recent conversations</h2>
            </div>
            <button onClick={() => setOpen(true)}>
              <Plus /> Open ticket
            </button>
          </header>
          {tickets.length ? (
            <div className="ticket-list">
              {tickets.map((ticket) => (
                <article key={ticket.id}>
                  <span
                    className={`ticket-status ${ticket.status.toLowerCase()}`}
                  >
                    {ticket.status}
                  </span>
                  <div>
                    <strong>{ticket.subject}</strong>
                    <small>
                      {ticket.ticketNumber} ·{" "}
                      {ticket.category.replaceAll("_", " ").toLowerCase()}
                    </small>
                  </div>
                  <Clock3 />
                  <time>{new Date(ticket.updatedAt).toLocaleDateString()}</time>
                  <ArrowRight />
                </article>
              ))}
            </div>
          ) : (
            <div className="no-tickets">
              <MessageCircle />
              <strong>No support tickets</strong>
              <p>
                That’s the ideal state, honestly. If something comes up, we’re
                right here.
              </p>
            </div>
          )}
        </div>
        <aside>
          <h2>What we can help with</h2>
          {categories.map((category) => (
            <span key={category}>
              {category.replaceAll("_", " ").toLowerCase()}
            </span>
          ))}
        </aside>
      </section>
      {open ? (
        <div className="modal-backdrop">
          <form className="ticket-modal" onSubmit={submit}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <span className="section-index">NEW SUPPORT TICKET</span>
            <h2>What happened?</h2>
            <label>
              <span>Category</span>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Order ID (optional)</span>
              <input
                value={form.orderId}
                onChange={(event) =>
                  setForm({ ...form, orderId: event.target.value })
                }
              />
            </label>
            <label>
              <span>Subject</span>
              <input
                required
                minLength={5}
                value={form.subject}
                onChange={(event) =>
                  setForm({ ...form, subject: event.target.value })
                }
              />
            </label>
            <label>
              <span>Details</span>
              <textarea
                required
                minLength={10}
                rows={6}
                value={form.body}
                onChange={(event) =>
                  setForm({ ...form, body: event.target.value })
                }
              />
            </label>
            <button className="primary-button" disabled={busy}>
              <Send /> {busy ? "Opening…" : "Open ticket"}
            </button>
          </form>
        </div>
      ) : null}
      <MarketFooter />
    </main>
  );
}
