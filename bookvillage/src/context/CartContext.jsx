import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";

const CartContext = createContext(null);

const toSafeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeItem = (item) => ({
  cartItemId: item?.cartItemId ?? item?.id ?? null,
  bookId: toSafeNumber(item?.bookId, 0),
  title: item?.title || "",
  price: toSafeNumber(item?.price ?? item?.unitPrice, 0),
  quantity: Math.max(1, toSafeNumber(item?.quantity, 1)),
  lineTotal: toSafeNumber(item?.lineTotal, 0),
  coverImageUrl: item?.coverImageUrl || null,
});

const hasSignedInUser = () => Boolean(sessionStorage.getItem("bookvillage_user"));

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const replaceItems = useCallback((nextItems) => {
    setItems((nextItems || []).map(normalizeItem).filter((v) => v.bookId > 0));
  }, []);

  const syncFromServer = useCallback(async () => {
    if (!hasSignedInUser()) {
      setItems([]);
      return [];
    }
    try {
      const list = await api.cart.list();
      const normalized = (list || []).map((row) => normalizeItem(row));
      setItems(normalized);
      return normalized;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    syncFromServer();
  }, [syncFromServer]);

  useEffect(() => {
    const onAuthChanged = () => {
      syncFromServer();
    };
    window.addEventListener("bookvillage-auth-changed", onAuthChanged);
    return () => window.removeEventListener("bookvillage-auth-changed", onAuthChanged);
  }, [syncFromServer]);

  const addItem = (item, quantity = 1) => {
    const normalized = normalizeItem({ ...item, quantity, lineTotal: toSafeNumber(item?.price, 0) * toSafeNumber(quantity, 1) });
    if (normalized.bookId <= 0) return;

    setItems((prev) => {
      const exists = prev.find((v) => v.bookId === normalized.bookId);
      if (exists) {
        const nextQty = exists.quantity + normalized.quantity;
        return prev.map((v) => (v.bookId === normalized.bookId ? { ...v, quantity: nextQty, lineTotal: v.price * nextQty } : v));
      }
      return [...prev, normalized];
    });

    if (hasSignedInUser()) {
      api.cart
        .add(normalized.bookId, normalized.quantity, normalized.price)
        .then(() => syncFromServer())
        .catch(() => undefined);
    }
  };

  const updateQty = (bookId, quantity) => {
    const safeQty = Math.max(1, toSafeNumber(quantity, 1));
    const target = items.find((v) => v.bookId === bookId);

    setItems((prev) => prev.map((v) => (v.bookId === bookId ? { ...v, quantity: safeQty, lineTotal: v.price * safeQty } : v)));

    if (hasSignedInUser() && target?.cartItemId) {
      api.cart
        .update(target.cartItemId, safeQty)
        .then(() => syncFromServer())
        .catch(() => undefined);
    }
  };

  const removeItem = (bookId) => {
    const target = items.find((v) => v.bookId === bookId);
    setItems((prev) => prev.filter((v) => v.bookId !== bookId));

    if (hasSignedInUser() && target?.cartItemId) {
      api.cart
        .remove(target.cartItemId)
        .then(() => syncFromServer())
        .catch(() => undefined);
    }
  };

  const clear = () => {
    setItems([]);
    if (hasSignedInUser()) {
      api.cart
        .clear()
        .then(() => syncFromServer())
        .catch(() => undefined);
    }
  };

  const count = items.reduce((acc, cur) => acc + cur.quantity, 0);

  const value = useMemo(
    () => ({ items, count, addItem, updateQty, removeItem, clear, syncFromServer, replaceItems }),
    [items, count, syncFromServer, replaceItems],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

