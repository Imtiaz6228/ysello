import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileArchive,
  FileSpreadsheet,
  MessageCircle,
  Paperclip,
  RefreshCw,
  Repeat2,
  Send,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ApiError, apiDownloadUrl, apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { useLocale } from "../i18n/LocaleContext";

type Message = {
  id: string;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
  author: { id?: string; firstName: string; role: string };
};
type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  buyerName: string;
  buyerEmail: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  createdAt: string;
  paidAt?: string | null;
  buyer: { firstName: string; lastName: string; email: string };
  payment?: { method: string; status: string; amountCents: number } | null;
  canOpenDispute?: boolean;
  disputeDeadline?: string;
  disputeWindowHours?: number;
  disputes: Array<{
    id: string;
    status: string;
    subject: string;
    refundDemanded?: boolean;
    awaitingParty?: string | null;
    autoCloseAt?: string | null;
    resolution?: string | null;
  }>;
  items: Array<{
    id: string;
    productId: string;
    sellerId: string;
    productName: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
    product: {
      name: string;
      slug: string;
      type: string;
      coverImageUrl?: string | null;
      deliveryNote?: string | null;
    };
    seller: {
      firstName: string;
      lastName?: string | null;
      username?: string | null;
    };
    downloadGrants: Array<{
      id: string;
      downloadCount: number;
      maxDownloads: number;
      productFile: { displayName: string };
    }>;
    inventoryItems?: Array<{
      id: string;
      content: string;
      deliveredAt?: string | null;
    }>;
  }>;
};

function Countdown({ until }: { until?: string | null }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const update = () =>
      setRemaining(
        Math.max(
          0,
          Math.ceil((new Date(until ?? 0).getTime() - Date.now()) / 1000),
        ),
      );
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [until]);
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return (
    <strong>
      {remaining
        ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        : "00:00:00"}
    </strong>
  );
}

export function OrderDeliveryPage() {
  const { user } = useAuth();
  const { formatMoney } = useLocale();
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sending, setSending] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const threadEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (silent = false) => {
      try {
        const [orderData, messageData] = await Promise.all([
          apiRequest<{ order: OrderDetail }>(`/api/commerce/orders/${id}`),
          apiRequest<{ messages: Message[] }>(
            `/api/commerce/orders/${id}/messages`,
          ),
        ]);
        setOrder(orderData.order);
        setMessages(messageData.messages);
        if (!silent) setError("");
      } catch (caught) {
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Could not load the order.",
        );
      }
    },
    [id],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 5000);
    return () => window.clearInterval(timer);
  }, [load]);
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const payload = new FormData();
      payload.append("body", body);
      if (attachment) payload.append("attachment", attachment);
      const result = await apiRequest<{ message: Message }>(
        `/api/commerce/orders/${id}/messages`,
        {
          method: "POST",
          body: attachment ? payload : { body: body.trim() },
        },
      );
      setMessages((current) =>
        current.some((message) => message.id === result.message.id)
          ? current
          : [...current, result.message],
      );
      setBody("");
      setAttachment(null);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Message could not be sent.",
      );
    } finally {
      setSending(false);
    }
  }

  async function openDispute() {
    const subject = window.prompt("Dispute subject (5+ characters):");
    if (!subject || subject.trim().length < 5) return;
    const description = window.prompt("Describe the issue (20+ characters):");
    if (!description || description.trim().length < 20) return;
    try {
      const demandRefund = window.confirm(
        "Also demand a refund with this dispute?",
      );
      await apiRequest(`/api/commerce/orders/${id}/disputes`, {
        method: "POST",
        body: { subject, description, demandRefund },
      });
      await load();
      setError(
        "Dispute opened. Admin support can now review this order workspace.",
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not open a dispute.",
      );
    }
  }

  async function closeDispute(disputeId: string) {
    const resolution =
      window.prompt("Optional closing note:") ?? "Closed by buyer.";
    try {
      await apiRequest(`/api/commerce/disputes/${disputeId}/close`, {
        method: "POST",
        body: { resolution },
      });
      await load();
      setError("Dispute closed.");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not close dispute.",
      );
    }
  }

  async function demandRefund(disputeId: string) {
    const reason =
      window.prompt("Refund reason:") ?? "Refund demanded from dispute chat.";
    if (reason.trim().length < 10) return;
    try {
      await apiRequest(`/api/commerce/disputes/${disputeId}/refund`, {
        method: "POST",
        body: { reason },
      });
      await load();
      setError("Refund demand sent to admin.");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not demand refund.",
      );
    }
  }

  async function sellerRefund() {
    if (!order) return;
    const reason = window.prompt(
      "Refund reason (10+ characters):",
      "Refund offered to resolve the open dispute.",
    );
    if (!reason || reason.trim().length < 10) return;
    if (
      !window.confirm(
        `Submit a refund for your items in order ${order.orderNumber}?`,
      )
    )
      return;
    setActionBusy("refund");
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/seller/orders/${order.id}/refund`, {
        method: "POST",
        body: { reason: reason.trim() },
      });
      await load();
      setSuccess("Refund submitted and recorded in the dispute chat.");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "The refund could not be submitted.",
      );
    } finally {
      setActionBusy("");
    }
  }

  async function replaceOrderItem(item: OrderDetail["items"][number]) {
    if (!order) return;
    const requested = window.prompt(
      `How many ${item.productName} item(s) should be replaced?`,
      String(item.quantity),
    );
    if (requested === null) return;
    const quantity = Number(requested);
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > item.quantity
    ) {
      setError(`Enter a whole number from 1 to ${item.quantity}.`);
      return;
    }
    const note =
      window.prompt(
        "Optional note for the buyer:",
        "Replacement delivered to resolve the dispute.",
      ) ?? "";
    setActionBusy(`replace:${item.id}`);
    setError("");
    setSuccess("");
    try {
      await apiRequest(
        `/api/seller/orders/${order.id}/items/${item.id}/replace`,
        { method: "POST", body: { quantity, note } },
      );
      await load();
      setSuccess(
        `${quantity} replacement item${quantity === 1 ? "" : "s"} delivered and recorded in chat.`,
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Replacement delivery failed.",
      );
    } finally {
      setActionBusy("");
    }
  }

  const activeDispute = order?.disputes?.find((dispute) =>
    ["OPEN", "UNDER_REVIEW", "AWAITING_BUYER", "AWAITING_SELLER"].includes(
      dispute.status,
    ),
  );

  return (
    <main className="commerce-page order-workspace">
      <Seo
        title="Order delivery workspace"
        description="Protected buyer and seller messages for a Ysello order."
        noIndex
      />
      <MarketHeader />
      <section>
        <Link className="back-link" to="/dashboard">
          <ArrowLeft /> Back to dashboard
        </Link>
        <span className="section-index">PROTECTED ORDER WORKSPACE</span>
        <h1>Delivery & messages</h1>
        <p>
          <ShieldCheck /> Buyer and seller chat opens only after an order
          exists. Disputes are limited to the seller’s after-sales window.
        </p>
      </section>

      {order ? (
        <section className="order-delivery-summary order-conversation-summary">
          <header>
            <div>
              <span className={`status-pill ${order.status.toLowerCase()}`}>
                {order.status.replaceAll("_", " ")}
              </span>
              <strong>#{order.orderNumber}</strong>
              <small>Order record · protected after-sales channel</small>
            </div>
            {user?.role === "CUSTOMER" && order.canOpenDispute ? (
              <button
                className="secondary-button"
                onClick={() => void openDispute()}
              >
                <ShieldCheck size={14} /> Open dispute
              </button>
            ) : null}
          </header>
          <div className="order-participant-strip">
            <span>
              {user?.role === "CUSTOMER"
                ? (order.items[0]?.seller.firstName ?? "Seller")
                : "Buyer"}
            </span>
            <div>
              <strong>{order.items[0]?.productName ?? "Digital order"}</strong>
              <small>
                {order.items.length} product
                {order.items.length === 1 ? "" : "s"} ·{" "}
                {order.items
                  .map((item) => item.product.type.replaceAll("_", " "))
                  .join(", ")}
              </small>
            </div>
            <span className="after-sales-label">After-sales</span>
          </div>
          <div className="order-safety-notice">
            <ShieldAlert size={17} /> Do not share contact details, wallet
            addresses, or arrange payment outside this marketplace. Off-platform
            transactions are not protected.
          </div>
          {order.disputes?.length ? (
            <div className="dispute-alert-card">
              {order.disputes.map((dispute) => (
                <div key={dispute.id}>
                  <div>
                    <strong>{dispute.subject}</strong>
                    <span
                      className={`status-pill ${dispute.status.toLowerCase()}`}
                    >
                      {dispute.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  {dispute.autoCloseAt ? (
                    <div className="dispute-countdown">
                      <small>
                        Awaiting{" "}
                        {dispute.awaitingParty?.toLowerCase() ?? "response"}.
                        Failure to reply within 24 hours loses the dispute.
                      </small>
                      <Countdown until={dispute.autoCloseAt} />
                    </div>
                  ) : null}
                  {dispute.resolution ? <p>{dispute.resolution}</p> : null}
                  {user?.role === "CUSTOMER" ? (
                    <div className="quick-dispute-actions">
                      <button
                        className="secondary-button"
                        onClick={() => void closeDispute(dispute.id)}
                      >
                        Close dispute
                      </button>
                      <button
                        className="secondary-button"
                        disabled={dispute.refundDemanded}
                        onClick={() => void demandRefund(dispute.id)}
                      >
                        {dispute.refundDemanded
                          ? "Refund demanded"
                          : "Demand refund"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {user?.role === "SELLER" && activeDispute ? (
            <div className="seller-dispute-tools">
              <div>
                <strong>Seller resolution tools</strong>
                <small>
                  Available because this dispute is open. Every action is added
                  to the protected chat record.
                </small>
              </div>
              <button
                type="button"
                className="refund-action"
                disabled={Boolean(actionBusy)}
                onClick={() => void sellerRefund()}
              >
                <RefreshCw size={15} />{" "}
                {actionBusy === "refund" ? "Submitting…" : "Refund"}
              </button>
              {order.items
                .filter((item) => item.sellerId === user.id)
                .map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className="replace-action"
                    disabled={Boolean(actionBusy)}
                    onClick={() => void replaceOrderItem(item)}
                  >
                    <Repeat2 size={15} />{" "}
                    {actionBusy === `replace:${item.id}`
                      ? "Replacing…"
                      : `Replace ${item.productName}`}
                  </button>
                ))}
            </div>
          ) : null}
          <section className="order-detail-panel">
            <header>
              <div>
                <strong>Complete order information</strong>
                <small>
                  Buyer, payment, product and quantity details for this
                  protected transaction.
                </small>
              </div>
              <span className={`status-pill ${order.status.toLowerCase()}`}>
                {order.status.replaceAll("_", " ")}
              </span>
            </header>
            <dl className="order-detail-grid">
              <div>
                <dt>Buyer</dt>
                <dd>
                  {order.buyer?.firstName} {order.buyer?.lastName}
                </dd>
              </div>
              <div>
                <dt>Buyer email</dt>
                <dd>{order.buyer?.email ?? order.buyerEmail}</dd>
              </div>
              <div>
                <dt>Order ID</dt>
                <dd>{order.id}</dd>
              </div>
              <div>
                <dt>Order number</dt>
                <dd>{order.orderNumber}</dd>
              </div>
              <div>
                <dt>Quantity bought</dt>
                <dd>
                  {order.items.reduce(
                    (total, item) => total + item.quantity,
                    0,
                  )}
                </dd>
              </div>
              <div>
                <dt>Order amount</dt>
                <dd>{formatMoney(order.totalCents)}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>
                  {order.payment
                    ? `${order.payment.method.replaceAll("_", " ")} · ${order.payment.status.replaceAll("_", " ")}`
                    : "Not recorded"}
                </dd>
              </div>
              <div>
                <dt>Order time</dt>
                <dd>{new Date(order.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
            <div className="order-product-details">
              {order.items.map((item) => (
                <article key={item.id}>
                  <div>
                    <small>Product</small>
                    <strong>{item.productName}</strong>
                  </div>
                  <div>
                    <small>Product ID</small>
                    <strong>{item.productId}</strong>
                  </div>
                  <div>
                    <small>Order item ID</small>
                    <strong>{item.id}</strong>
                  </div>
                  <div>
                    <small>Quantity</small>
                    <strong>{item.quantity}</strong>
                  </div>
                  <div>
                    <small>Unit price</small>
                    <strong>{formatMoney(item.unitPriceCents)}</strong>
                  </div>
                  <div>
                    <small>Item total</small>
                    <strong>{formatMoney(item.totalCents)}</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <div className="order-items-record">
            <strong>Purchased package & delivery record</strong>
            <small>
              Order #{order.orderNumber} · dispute window:{" "}
              {order.disputeWindowHours ?? 12} hours
            </small>
          </div>
          {order.items.map((item) => (
            <article
              className="order-delivery-item order-record-item"
              key={item.id}
            >
              <div>
                <strong>{item.productName}</strong>
                {item.product.deliveryNote ? (
                  <small>{item.product.deliveryNote}</small>
                ) : null}
              </div>
              {item.downloadGrants.length ? (
                <>
                  <a
                    className="action-link"
                    href={apiDownloadUrl(
                      `/api/commerce/order-items/${item.id}/download.zip`,
                    )}
                  >
                    <Download size={14} /> Download all as ZIP
                  </a>
                  {item.downloadGrants.map((grant) => (
                    <a
                      key={grant.id}
                      className="action-link"
                      href={apiDownloadUrl(
                        `/api/commerce/downloads/${grant.id}`,
                      )}
                    >
                      <Download size={14} /> {grant.productFile.displayName}{" "}
                      <small>
                        ({grant.maxDownloads - grant.downloadCount} left)
                      </small>
                    </a>
                  ))}
                </>
              ) : null}
              {item.inventoryItems?.length ? (
                <div className="delivery-file-panel">
                  <div>
                    <FileArchive />
                    <span>
                      <strong>
                        {item.inventoryItems.length} delivered account
                        {item.inventoryItems.length === 1 ? "" : "s"}
                      </strong>
                      <small>
                        Protected delivery package · details are kept out of the
                        open page
                      </small>
                    </span>
                  </div>
                  <div className="delivery-file-actions">
                    <a
                      className="action-link"
                      href={apiDownloadUrl(
                        `/api/commerce/order-items/${item.id}/delivery?format=zip`,
                      )}
                    >
                      <FileArchive size={14} /> Download ZIP
                    </a>
                    <a
                      className="action-link"
                      href={apiDownloadUrl(
                        `/api/commerce/order-items/${item.id}/delivery?format=csv`,
                      )}
                    >
                      <FileSpreadsheet size={14} /> Download CSV
                    </a>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      <div className="order-chat order-chat-pro">
        <header className="order-chat-heading">
          <div>
            <span className="section-index">PRIVATE ORDER CHAT</span>
            <h2>Buyer & seller workspace</h2>
            <small>
              Messages update automatically. Attach screenshots when evidence is
              needed.
            </small>
          </div>
          <span className="chat-live-dot">Live</span>
        </header>
        {error ? <div className="notice error">{error}</div> : null}
        {success ? <div className="notice success">{success}</div> : null}
        {messages.length ? (
          messages.map((message) => (
            <article
              className={`order-chat-bubble ${message.author.role === "SELLER" ? "seller-message" : "buyer-message"} ${message.author.id === user?.id ? "own-message" : ""}`}
              key={message.id}
            >
              <span>{message.author.firstName[0]}</span>
              <div>
                <header>
                  <strong>{message.author.firstName}</strong>
                  <small>
                    {message.author.role.replace("_", " ")} ·{" "}
                    {new Date(message.createdAt).toLocaleString()}
                  </small>
                </header>
                <p>{message.body}</p>
                {message.attachmentUrl ? (
                  <a
                    className="chat-attachment"
                    href={message.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={message.attachmentUrl}
                      alt={message.attachmentName ?? "attachment"}
                    />
                    <small>{message.attachmentName ?? "View screenshot"}</small>
                  </a>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="no-tickets">
            <MessageCircle />
            <strong>No messages yet</strong>
            <p>Start the order conversation below.</p>
          </div>
        )}
        <div ref={threadEndRef} />
        <div className="chat-quick-replies">
          {[
            "Thanks",
            "Verifying",
            "Need more information",
            "Resolved",
            "Refund requested",
          ].map((reply) => (
            <button key={reply} type="button" onClick={() => setBody(reply)}>
              {reply}
            </button>
          ))}
        </div>
        <form onSubmit={send}>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Write a message about delivery…"
            rows={4}
          />
          <div className="chat-compose-actions">
            <label className="upload-action">
              <Paperclip size={16} /> Attach screenshot
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setAttachment(event.target.files?.[0] ?? null)
                }
              />
            </label>
            {attachment ? <small>{attachment.name}</small> : null}
            <button
              className="chat-send-button"
              disabled={sending || !body.trim()}
            >
              <Send size={15} /> {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
      <MarketFooter />
    </main>
  );
}
