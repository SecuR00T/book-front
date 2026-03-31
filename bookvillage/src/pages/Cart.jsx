import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, ChevronRight, Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/client";
import { normalizeBook } from "@/lib/bookNormalizer";
import PageLayout from "@/components/PageLayout";

const toSafeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatKrw = (value) =>
  `${Math.round(toSafeNumber(value, 0)).toLocaleString()}원`;

export default function Cart() {
  const { items, syncFromServer, replaceItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [busyBookId, setBusyBookId] = useState(null);
  const [error, setError] = useState("");
  const [bookCovers, setBookCovers] = useState({});

  const subtotal = items.reduce(
    (acc, cur) => acc + toSafeNumber(cur.price, 0) * toSafeNumber(cur.quantity, 1),
    0
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const cart = await api.cart.list();
        replaceItems(cart || []);
      } catch {
        replaceItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  // 장바구니 아이템의 책 커버 이미지 가져오기
  useEffect(() => {
    if (items.length === 0) return;
    const missing = items.filter((item) => !item.coverImageUrl && !bookCovers[item.bookId]);
    if (missing.length === 0) return;
    (async () => {
      const results = await Promise.allSettled(missing.map((item) => api.books.get(item.bookId)));
      const newCovers = {};
      results.forEach((res, i) => {
        if (res.status === "fulfilled" && res.value) {
          const book = normalizeBook(res.value);
          if (book?.coverImageUrl) newCovers[missing[i].bookId] = book.coverImageUrl;
        }
      });
      if (Object.keys(newCovers).length > 0) {
        setBookCovers((prev) => ({ ...prev, ...newCovers }));
      }
    })();
  }, [items]);

  const changeQty = async (item, delta) => {
    if (!item?.cartItemId) return;
    const next = Math.max(1, toSafeNumber(item.quantity, 1) + delta);
    setBusyBookId(item.bookId);
    try {
      await api.cart.update(item.cartItemId, next);
      await syncFromServer();
    } catch {
      setError("수량 변경에 실패했습니다.");
    } finally {
      setBusyBookId(null);
    }
  };

  const remove = async (item) => {
    if (!item?.cartItemId) return;
    setBusyBookId(item.bookId);
    try {
      await api.cart.remove(item.cartItemId);
      await syncFromServer();
    } catch {
      setError("삭제에 실패했습니다.");
    } finally {
      setBusyBookId(null);
    }
  };

  const clearCart = async () => {
    setClearing(true);
    try {
      await api.cart.clear();
      await syncFromServer();
    } catch {
      setError("장바구니 비우기에 실패했습니다.");
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="장바구니">
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          불러오는 중...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="장바구니">
      {/* 단계 표시 */}
      <ol className="mb-6 flex items-center gap-1 text-sm">
        <li className="font-bold text-primary">장바구니</li>
        <ChevronRight size={14} className="text-muted-foreground" />
        <li className="text-muted-foreground">주문/결제</li>
        <ChevronRight size={14} className="text-muted-foreground" />
        <li className="text-muted-foreground">완료</li>
      </ol>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-20">
          <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-base font-semibold text-foreground">장바구니가 비어 있습니다</p>
          <p className="mt-1 text-sm text-muted-foreground">마음에 드는 책을 담아 보세요.</p>
          <Link
            to="/books"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <BookOpen size={15} />
            도서 둘러보기
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* 왼쪽: 상품 목록 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <span className="text-sm font-semibold text-foreground">
                전체 {items.length}권
              </span>
              <div className="flex items-center gap-2">
                <Link
                  to="/books"
                  className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs text-muted-foreground hover:bg-secondary"
                >
                  계속 쇼핑
                </Link>
                <button
                  type="button"
                  onClick={clearCart}
                  disabled={clearing}
                  className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50"
                >
                  {clearing ? "처리 중…" : "전체 삭제"}
                </button>
              </div>
            </div>

            {items.map((item) => {
              const lineTotal = toSafeNumber(item.price, 0) * toSafeNumber(item.quantity, 1);
              const busy = busyBookId === item.bookId;
              return (
                <div
                  key={item.cartItemId || item.bookId}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
                >
                  {/* 책 커버 */}
                  <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground/30 overflow-hidden">
                    {(item.coverImageUrl || bookCovers[item.bookId]) ? (
                      <img
                        src={item.coverImageUrl || bookCovers[item.bookId]}
                        alt={item.title}
                        className="h-full w-full object-contain p-0.5"
                      />
                    ) : (
                      <BookOpen size={22} />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold leading-snug">{item.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatKrw(item.price)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        disabled={busy}
                        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                        aria-label="삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center rounded-lg border border-border">
                        <button
                          type="button"
                          onClick={() => changeQty(item, -1)}
                          disabled={busy || item.quantity <= 1}
                          className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:bg-secondary disabled:opacity-40"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeQty(item, 1)}
                          disabled={busy}
                          className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:bg-secondary disabled:opacity-40"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-foreground">{formatKrw(lineTotal)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 오른쪽: 주문 요약 */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-bold text-foreground">주문 금액</h2>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">상품 금액</span>
                  <span className="font-medium">{formatKrw(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">배송비</span>
                  <span className="font-medium text-emerald-600">무료</span>
                </div>
                <hr className="border-border" />
                <div className="flex items-center justify-between pt-0.5">
                  <span className="font-bold">합계</span>
                  <span className="text-lg font-extrabold text-primary">{formatKrw(subtotal)}</span>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-muted-foreground">
                ※ 쿠폰/포인트 적용은 다음 단계에서 가능합니다.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/checkout")}
              className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
            >
              주문하기
              <ChevronRight size={15} />
            </button>

            <p className="text-center text-xs text-muted-foreground">
              주문 전{" "}
              <Link to="/terms/service" className="underline underline-offset-2">
                이용약관
              </Link>
              을 확인해 주세요.
            </p>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
