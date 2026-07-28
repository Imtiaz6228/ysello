import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeDollarSign,
  Bitcoin,
  Building2,
  Check,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../commerce/CartContext";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { useLocale } from "../i18n/LocaleContext";

type MethodId =
  "STRIPE" | "PAYPAL" | "BANK_TRANSFER" | "CRYPTO" | "MANUAL" | "WALLET";
type Method = { id: MethodId; label: string; available: boolean; kind: string };
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
};
const icons: Record<MethodId, typeof CreditCard> = {
  STRIPE: CreditCard,
  PAYPAL: WalletCards,
  BANK_TRANSFER: Building2,
  CRYPTO: Bitcoin,
  MANUAL: BadgeDollarSign,
  WALLET: WalletCards,
};

export function CheckoutPage() {
  const { formatMoney, formatProductMoney, t } = useLocale();
  const { user, setUser } = useAuth();
  const { items, subtotalCents, clear } = useCart();
  const navigate = useNavigate();
  const [methods, setMethods] = useState<Method[]>([]);
  const [balanceCents, setBalanceCents] = useState(user?.balanceCents ?? 0);
  const [method, setMethod] = useState<MethodId>("WALLET");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const paymentMethods = useMemo<Method[]>(() => {
    const walletMethod: Method = {
      id: "WALLET",
      label: `Wallet balance · ${formatMoney(balanceCents)}`,
      available: balanceCents >= subtotalCents && subtotalCents > 0,
      kind: "wallet",
    };
    return [walletMethod, ...methods];
  }, [balanceCents, formatMoney, methods, subtotalCents]);

  useEffect(() => {
    void apiRequest<{ methods: Method[] }>("/api/commerce/payment-methods")
      .then((data) => setMethods(data.methods))
      .catch(() => undefined);
    void apiRequest<{ balanceCents: number }>("/api/wallet/balance")
      .then((data) => setBalanceCents(data.balanceCents))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (paymentMethods.some((item) => item.id === method && item.available))
      return;
    const first = paymentMethods.find((item) => item.available);
    if (first) setMethod(first.id);
  }, [method, paymentMethods]);

  if (!items.length) return <Navigate to="/cart" replace />;

  async function placeOrder(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const cartItems = items.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    }));
    try {
      if (method === "WALLET") {
        const data = await apiRequest<{
          order: { id: string };
          balanceCents: number;
          message: string;
        }>("/api/wallet/purchase-cart", {
          method: "POST",
          body: { items: cartItems },
        });
        setBalanceCents(data.balanceCents);
        if (user) setUser({ ...user, balanceCents: data.balanceCents });
        clear();
        navigate(`/checkout/confirmation?order=${data.order.id}`, {
          state: { paid: true, instructions: data.message },
        });
        return;
      }

      const data = await apiRequest<{
        order: { id: string };
        redirectUrl?: string;
        instructions?: string;
        cryptoPayment?: CryptoPayment;
      }>("/api/commerce/checkout", {
        method: "POST",
        body: { items: cartItems, method },
      });
      if (data.redirectUrl) {
        location.assign(data.redirectUrl);
        return;
      }
      if (data.cryptoPayment) {
        navigate(
          `/checkout/confirmation?order=${data.order.id}&provider=crypto`,
          {
            state: {
              instructions: data.instructions,
              cryptoPayment: data.cryptoPayment,
            },
          },
        );
        return;
      }
      navigate(`/checkout/confirmation?order=${data.order.id}`, {
        state: { instructions: data.instructions },
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Checkout could not be completed.",
      );
      setBusy(false);
    }
  }

  const selectedMethod = paymentMethods.find((item) => item.id === method);

  return (
    <main className="commerce-page checkout-page">
      <Seo
        title="Secure checkout"
        description="Complete your protected Ysello order."
        noIndex
      />
      <MarketHeader />
      <form className="checkout-layout" onSubmit={placeOrder}>
        <section className="checkout-main">
          <Link className="back-link" to="/cart">
            <ArrowLeft /> Back to cart
          </Link>
          <span className="section-index">
            {t("secureCheckout").toUpperCase()}
          </span>
          <h1>Choose how to pay.</h1>
          <div className="checkout-account">
            <span>
              {user?.firstName[0]}
              {user?.lastName[0]}
            </span>
            <div>
              <small>CHECKING OUT AS</small>
              <strong>
                {user?.firstName} {user?.lastName}
              </strong>
              <p>{user?.email}</p>
            </div>
            <Check />
          </div>
          <div className="payment-methods">
            {paymentMethods.map((item) => {
              const Icon = icons[item.id];
              return (
                <label
                  className={`${method === item.id ? "selected" : ""} ${!item.available ? "disabled" : ""}`}
                  key={item.id}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={item.id}
                    checked={method === item.id}
                    onChange={() => setMethod(item.id)}
                    disabled={!item.available}
                  />
                  <span>
                    <Icon />
                  </span>
                  <div>
                    <strong>{item.label}</strong>
                    <small>
                      {item.kind === "hosted"
                        ? "Secure hosted payment"
                        : item.kind === "wallet"
                          ? "Instant delivery from approved deposit balance"
                          : item.kind === "crypto"
                            ? "Time-limited wallet address and automatic delivery after detection"
                            : "Staff verifies payment before delivery"}
                    </small>
                  </div>
                  {method === item.id ? <Check /> : null}
                </label>
              );
            })}
          </div>
          <div className="checkout-approval-note">
            <ShieldCheck size={16} /> Approved top-ups become wallet balance.
            Wallet checkout is instant and creates delivery records, seller
            earnings, and a protected order workspace in one transaction.
          </div>
          {balanceCents < subtotalCents ? (
            <div className="checkout-topup-callout">
              <WalletCards />
              <div>
                <strong>Add funds before checkout</strong>
                <small>
                  You need {formatMoney(subtotalCents - balanceCents)} more in
                  approved balance.
                </small>
              </div>
              <Link to="/dashboard#wallet">Top up account</Link>
            </div>
          ) : null}
          {error ? <div className="notice error">{error}</div> : null}
        </section>
        <aside className="checkout-summary">
          <span className="section-index">ORDER SUMMARY</span>
          {items.map(({ product, quantity }) => (
            <div className="checkout-line" key={product.id}>
              <span>{product.icon}</span>
              <div>
                <strong>{product.title}</strong>
                <small>
                  Qty {quantity} · {product.delivery}
                </small>
              </div>
              <b>{formatProductMoney(product, quantity)}</b>
            </div>
          ))}
          <div className="checkout-totals">
            <p>
              <span>Subtotal</span>
              <b>{formatMoney(subtotalCents)}</b>
            </p>
            <p>
              <span>Delivery</span>
              <b>{formatMoney(0)}</b>
            </p>
            <p>
              <span>Available balance</span>
              <b>{formatMoney(balanceCents)}</b>
            </p>
            <p>
              <span>Total</span>
              <b>{formatMoney(subtotalCents)}</b>
            </p>
          </div>
          <button
            className="pay-button"
            type="submit"
            disabled={busy || !selectedMethod?.available}
          >
            <LockKeyhole />{" "}
            {busy
              ? "Creating secure order…"
              : selectedMethod?.id === "WALLET"
                ? `Pay with wallet · ${formatMoney(subtotalCents)}`
                : `Pay ${formatMoney(subtotalCents)}`}
          </button>
          <p className="secure-note">
            <ShieldCheck /> Payment confirmation required · ZIP/download
            delivery unlocks after confirmation
          </p>
        </aside>
      </form>
      <MarketFooter />
    </main>
  );
}
