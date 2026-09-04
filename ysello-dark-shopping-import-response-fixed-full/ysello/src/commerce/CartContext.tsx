import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CatalogProduct } from "../data/catalog";

export type CartItem = { product: CatalogProduct; quantity: number };

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  add: (product: CatalogProduct, quantity?: number) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  updateProductPrices: (
    productId: string,
    prices: {
      priceCents: number;
      priceCnyCents?: number;
      priceRubCents?: number;
    },
  ) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const storageKey = "ysello-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as CartItem[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalCents: items.reduce(
        (sum, item) => sum + item.product.priceCents * item.quantity,
        0,
      ),
      add(product, quantity = product.minimumOrder ?? 1) {
        setItems((current) => {
          const existing = current.find(
            (item) => item.product.id === product.id,
          );
          const minimum = Math.max(1, product.minimumOrder ?? 1);
          const maximum = Math.max(
            minimum,
            Math.min(
              20,
              product.maximumOrder ?? 20,
              product.type === "SERVICE" ? 20 : (product.stockCount ?? 0),
            ),
          );
          return existing
            ? current.map((item) =>
                item.product.id === product.id
                  ? {
                      ...item,
                      product,
                      quantity: Math.max(
                        minimum,
                        Math.min(maximum, item.quantity + quantity),
                      ),
                    }
                  : item,
              )
            : [
                ...current,
                {
                  product,
                  quantity: Math.max(minimum, Math.min(maximum, quantity)),
                },
              ];
        });
      },
      remove(productId) {
        setItems((current) =>
          current.filter((item) => item.product.id !== productId),
        );
      },
      setQuantity(productId, quantity) {
        setItems((current) =>
          current.map((item) =>
            item.product.id === productId
              ? {
                  ...item,
                  quantity: Math.max(
                    item.product.minimumOrder ?? 1,
                    Math.min(
                      20,
                      item.product.maximumOrder ?? 20,
                      item.product.type === "SERVICE"
                        ? 20
                        : (item.product.stockCount ?? 0),
                      quantity,
                    ),
                  ),
                }
              : item,
          ),
        );
      },
      updateProductPrices(productId, prices) {
        setItems((current) =>
          current.map((item) =>
            item.product.id === productId
              ? { ...item, product: { ...item.product, ...prices } }
              : item,
          ),
        );
      },
      clear() {
        setItems([]);
      },
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
