import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  FileText,
  LoaderCircle,
  MessageCircle,
  Timer,
} from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
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
          "Payment confirmed. Your downloads and invoice are ready in your dashboard, and a confirmation email is on its way.",
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
            "Crypto payment detected. Your ZIP/download delivery is ready in your dashboard.",
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
          "Crypto payment detected. Your ZIP/download delivery is ready in your dashboard.",
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
            ? "It’s yours."
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

        <div>
          <Link className="primary-link" to="/dashboard">
            <Download /> Purchases & downloads
          </Link>
          <Link to="/dashboard">
            <FileText /> View invoice
          </Link>
          <Link to="/support">
            <MessageCircle /> Get support
          </Link>
        </div>
      </section>
      <MarketFooter />
    </main>
  );
}
