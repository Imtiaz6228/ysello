import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  FileText,
  LoaderCircle,
  MessageCircle,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ApiError, apiDownloadUrl, apiRequest } from "../api/client";
import { useCart } from "../commerce/CartContext";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";

type CryptoPayment = {
  asset: string;
  network: string;
  address: string;
  amountUsdCents: number;
  amountLabel: string;
  expiresAt: string;
  providerReference: string;
  instructions: string;
  status: string;
  txHash?: string;
};


type ConfirmationOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  canOpenDispute?: boolean;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    deliveredAt?: string | null;
    product: { name: string; slug: string; coverImageUrl?: string | null; type: string };
    downloadGrants: Array<{ id: string; downloadCount: number; maxDownloads: number; productFile: { displayName: string } }>;
    inventoryItems?: Array<{ id: string; content: string }>;
  }>;
};

type PaymentStatusResponse = {
  order: { id: string; status: string; payment?: { status: string } | null };
  cryptoPayment?: CryptoPayment;
};

function formatCountdown(seconds: number) {
  if (seconds <= 0) return "Expired";
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remaining = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remaining}`;
}

export function OrderConfirmationPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const { clear } = useCart();
  const orderId = params.get("order");
  const provider = params.get("provider");
  const routeState = location.state as {
    instructions?: string;
    paid?: boolean;
    cryptoPayment?: CryptoPayment;
  } | null;
  const isCrypto = provider === "crypto";
  const [state, setState] = useState<
    "confirming" | "paid" | "pending" | "error"
  >(
    routeState?.paid
      ? "paid"
      : provider && !isCrypto
        ? "confirming"
        : "pending",
  );
  const [message, setMessage] = useState(
    routeState?.instructions ??
      (isCrypto
        ? "Send the exact payment before the timer expires. Delivery unlocks automatically once the payment is detected."
        : "Your order is recorded and waiting for payment approval."),
  );
  const [cryptoPayment, setCryptoPayment] = useState<CryptoPayment | undefined>(
    routeState?.cryptoPayment,
  );
  const [checking, setChecking] = useState(false);
  const [order, setOrder] = useState<ConfirmationOrder | null>(null);
  const [tick, setTick] = useState(Date.now());

  const secondsLeft = useMemo(() => {
    if (!cryptoPayment?.expiresAt) return 0;
    return Math.max(
      0,
      Math.floor((new Date(cryptoPayment.expiresAt).getTime() - tick) / 1000),
    );
  }, [cryptoPayment?.expiresAt, tick]);

  useEffect(() => {
    if (!orderId || !provider || isCrypto) return;
    void apiRequest(`/api/commerce/checkout/${orderId}/confirm`, {
      method: "POST",
    })
      .then(() => {
        setState("paid");
        setMessage(
          "Payment confirmed. Your order is completed and the available downloads are ready on this page. A confirmation email is also on its way.",
        );
        clear();
      })
      .catch((error) => {
        setState("error");
        setMessage(
          error instanceof ApiError
            ? error.message
            : "We could not confirm this payment yet.",
        );
      });
  }, [clear, isCrypto, orderId, provider]);

  useEffect(() => {
    if (!orderId || !isCrypto) return;
    void apiRequest<PaymentStatusResponse>(
      `/api/commerce/checkout/${orderId}/status`,
    )
      .then((data) => {
        if (data.cryptoPayment) setCryptoPayment(data.cryptoPayment);
        if (
          data.order.payment?.status === "PAID" ||
          ["DELIVERED", "COMPLETED", "PROCESSING"].includes(data.order.status)
        ) {
          setState("paid");
          setMessage(
            "Crypto payment detected. Your order is completed and the available ZIP/download delivery is ready on this page.",
          );
          clear();
        }
        if (data.order.status === "CANCELLED") {
          setState("error");
          setMessage(
            "This crypto invoice expired. Create a new checkout to receive a fresh address and timer.",
          );
        }
      })
      .catch((error) =>
        setMessage(
          error instanceof ApiError
            ? error.message
            : "Could not load crypto invoice.",
        ),
      );
  }, [clear, isCrypto, orderId]);

  useEffect(() => {
    if (!isCrypto || state !== "pending") return;
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isCrypto, state]);

  useEffect(() => {
    if (!orderId || !isCrypto || state !== "pending") return;
    const timer = window.setInterval(() => {
      void checkCrypto(false);
    }, 15_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCrypto, orderId, state]);

  useEffect(() => {
    if (!orderId) return;
    const loadOrder = () =>
      apiRequest<{ order: ConfirmationOrder }>(`/api/commerce/orders/${orderId}`)
        .then((data) => setOrder(data.order))
        .catch(() => undefined);
    void loadOrder();
    if (state !== "paid") return;
    const timer = window.setInterval(() => void loadOrder(), 5000);
    return () => window.clearInterval(timer);
  }, [orderId, state]);

  useEffect(() => {
    if (routeState?.paid) clear();
  }, [clear, routeState?.paid]);

  async function checkCrypto(showLoading = true) {
    if (!orderId) return;
    if (showLoading) setChecking(true);
    try {
      const data = await apiRequest<PaymentStatusResponse>(
        `/api/commerce/checkout/${orderId}/check-crypto`,
        { method: "POST" },
      );
      if (data.cryptoPayment) setCryptoPayment(data.cryptoPayment);
      if (
        data.order.payment?.status === "PAID" ||
        ["DELIVERED", "COMPLETED", "PROCESSING"].includes(data.order.status)
      ) {
        setState("paid");
        setMessage(
          "Crypto payment detected. Your order is completed and the available ZIP/download delivery is ready on this page.",
        );
        clear();
        return;
      }
      if (data.order.status === "CANCELLED") {
        setState("error");
        setMessage(
          "This crypto invoice expired. Create a new checkout to receive a fresh timer and address.",
        );
        return;
      }
      setMessage(
        "Payment has not been detected yet. Keep this page open; it will keep checking automatically.",
      );
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Payment status could not be checked yet.",
      );
    } finally {
      if (showLoading) setChecking(false);
    }
  }

  return (
    <main className="commerce-page confirmation-page">
      <Seo
        title="Order confirmation"
        description="Payment and digital delivery status for your Ysello order."
        noIndex
      />
      <MarketHeader />
      <section className={`confirmation-card ${state}`}>
        {state === "confirming" ? (
          <LoaderCircle className="spin" />
        ) : (
          <CheckCircle2 />
        )}
        <span className="section-index">
          {state === "paid"
            ? "PAYMENT CONFIRMED"
            : state === "error"
              ? "CONFIRMATION NEEDED"
              : isCrypto
                ? "CRYPTO INVOICE"
                : "ORDER RECEIVED"}
        </span>
        <h1>
          {state === "paid"
            ? "Order completed."
            : state === "confirming"
              ? "Confirming payment…"
              : isCrypto
                ? "Send payment before the timer ends."
                : "We’ve got your order."}
        </h1>
        <p>{message}</p>
        {orderId ? (
          <small>Order reference: {orderId.slice(0, 8).toUpperCase()}</small>
        ) : null}

        {isCrypto && cryptoPayment && state !== "paid" ? (
          <div className="crypto-invoice-panel">
            <div>
              <strong>Amount</strong>
              <span>
                {cryptoPayment.amountLabel} in {cryptoPayment.asset}
              </span>
            </div>
            <div>
              <strong>Network</strong>
              <span>{cryptoPayment.network}</span>
            </div>
            <div>
              <strong>Send to address</strong>
              <code>{cryptoPayment.address}</code>
              <button
                type="button"
                onClick={() =>
                  void navigator.clipboard?.writeText(cryptoPayment.address)
                }
              >
                <Copy size={14} /> Copy
              </button>
            </div>
            <div>
              <strong>Reference</strong>
              <span>{cryptoPayment.providerReference}</span>
            </div>
            <div>
              <strong>Time left</strong>
              <span>
                <Timer size={14} /> {formatCountdown(secondsLeft)} · expires{" "}
                {new Date(cryptoPayment.expiresAt).toLocaleString()}
              </span>
            </div>
            <p>{cryptoPayment.instructions}</p>
            <button
              className="primary-link"
              type="button"
              disabled={checking || secondsLeft <= 0}
              onClick={() => void checkCrypto(true)}
            >
              {checking ? "Checking…" : "I’ve paid — check payment"}
            </button>
          </div>
        ) : null}

        {state === "paid" && order ? (
          <section className="confirmation-delivery-panel">
            <header>
              <div>
                <small>ORDER #{order.orderNumber}</small>
                <h2>Your delivery is available here.</h2>
              </div>
              <span>{order.status.replaceAll("_", " ")}</span>
            </header>
            <div className="confirmation-order-items">
              {order.items.map((item) => (
                <article key={item.id}>
                  <div className="confirmation-product-image">
                    {item.product.coverImageUrl ? (
                      <img src={item.product.coverImageUrl} alt={item.productName} />
                    ) : (
                      <span>{item.productName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="confirmation-product-copy">
                    <small>Qty {item.quantity}</small>
                    <strong>{item.productName}</strong>
                    <span>{item.deliveredAt ? "Delivered" : "Processing delivery"}</span>
                  </div>
                  <div className="confirmation-download-actions">
                    {item.downloadGrants.length ? (
                      <a className="primary-link" href={apiDownloadUrl(`/api/commerce/order-items/${item.id}/download.zip`)}>
                        <Download /> Download all ZIP
                      </a>
                    ) : null}
                    {item.downloadGrants.map((grant) => (
                      <a key={grant.id} href={apiDownloadUrl(`/api/commerce/downloads/${grant.id}`)}>
                        <Download /> {grant.productFile.displayName}
                      </a>
                    ))}
                    {item.inventoryItems?.length ? (
                      <>
                        <a href={apiDownloadUrl(`/api/commerce/order-items/${item.id}/delivery?format=zip`)}>
                          <Download /> Download delivered accounts ZIP
                        </a>
                        <a href={apiDownloadUrl(`/api/commerce/order-items/${item.id}/delivery?format=csv`)}>
                          <Download /> Download CSV
                        </a>
                      </>
                    ) : null}
                    {!item.downloadGrants.length && !item.inventoryItems?.length ? (
                      <Link to={`/orders/${order.id}`}>Open delivery workspace</Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div>
          {orderId ? (
            <a href={apiDownloadUrl(`/api/commerce/orders/${orderId}/invoice`)} target="_blank" rel="noreferrer">
              <FileText /> View invoice
            </a>
          ) : null}
          {orderId ? (
            <Link className="primary-link" to={`/orders/${orderId}#chat`}>
              <MessageCircle /> Chat with seller
            </Link>
          ) : null}
          {orderId && order?.canOpenDispute ? (
            <Link to={`/orders/${orderId}#dispute`}>
              <ShieldAlert /> Open dispute
            </Link>
          ) : null}
        </div>
      </section>
      <MarketFooter />
    </main>
  );
}
