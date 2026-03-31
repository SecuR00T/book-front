import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BookOpen,
  Building2,
  ChevronRight,
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  Smartphone,
  TicketPercent,
  Wallet,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/client";
import { normalizeBook } from "@/lib/bookNormalizer";
import PageLayout from "@/components/PageLayout";

const toSafeNumber = (v, fb = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fb; };
const formatKrw = (v) => `${Math.round(toSafeNumber(v, 0)).toLocaleString()}원`;

const couponDiscount = (coupon, subtotal) => {
  if (!coupon || subtotal <= 0 || toSafeNumber(coupon.remainingCount, 0) <= 0) return 0;
  const val = toSafeNumber(coupon.discountValue, 0);
  if (String(coupon.discountType).toUpperCase() === "PERCENT")
    return Math.min(subtotal, Math.floor((subtotal * val) / 100));
  return Math.min(subtotal, val);
};

const PAYMENT_METHODS = [
  { value: "CARD", label: "신용·체크카드", icon: CreditCard },
  { value: "BANK_TRANSFER", label: "무통장 입금", icon: Building2 },
  { value: "PAY", label: "간편결제", icon: Smartphone },
];

const CARD_COMPANIES = ["KB국민", "신한", "삼성", "현대", "롯데", "우리", "하나", "NH농협", "IBK기업", "기타"];

export default function Checkout() {
  const { items, syncFromServer, replaceItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [wallet, setWallet] = useState({ currentPoints: 0, coupons: [] });
  const [shippingAddress, setShippingAddress] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("CARD");
  const [selectedCouponCode, setSelectedCouponCode] = useState("");
  const [usePoints, setUsePoints] = useState("");

  const [bookCovers, setBookCovers] = useState({});

  // 카드 정보
  const [cardCompany, setCardCompany] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [installment, setInstallment] = useState("0");
  const [agreeAll, setAgreeAll] = useState(false);

  // 계산
  const coupons = useMemo(() => (wallet?.coupons || []).filter((c) => toSafeNumber(c.remainingCount, 0) > 0), [wallet]);
  const selectedCoupon = useMemo(() => coupons.find((c) => c.code === selectedCouponCode) || null, [coupons, selectedCouponCode]);
  const subtotal = useMemo(() => items.reduce((a, c) => a + toSafeNumber(c.price, 0) * toSafeNumber(c.quantity, 1), 0), [items]);
  const discount = useMemo(() => couponDiscount(selectedCoupon, subtotal), [selectedCoupon, subtotal]);
  const availablePoints = useMemo(() => toSafeNumber(wallet?.currentPoints, 0), [wallet]);
  const parsedPoints = Math.min(Math.max(0, toSafeNumber(usePoints, 0)), availablePoints, Math.max(0, subtotal - discount));
  const finalTotal = Math.max(0, subtotal - discount - parsedPoints);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cartRes, walletRes, profileRes] = await Promise.allSettled([
          api.cart.list(),
          api.mypage.wallet(),
          user ? api.users.get(user.id) : Promise.resolve(null),
        ]);
        if (cartRes.status === "fulfilled") replaceItems(cartRes.value || []);
        if (walletRes.status === "fulfilled") setWallet(walletRes.value || { currentPoints: 0, coupons: [] });
        if (profileRes.status === "fulfilled" && profileRes.value) {
          const p = profileRes.value;
          setShippingAddress(p.address || "");
          setReceiverName(p.name || "");
          setReceiverPhone(p.phone || "");
          setCardHolder(p.name || "");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  // 책 커버 이미지 가져오기
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

  const formatCardNumber = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1-").replace(/-$/, "");
  const formatExpiry = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d;
  };
  const formatPhone = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  };

  const handleSubmit = async () => {
    if (!shippingAddress.trim()) { setError("배송지를 입력해 주세요."); return; }
    if (!receiverName.trim()) { setError("수령인 이름을 입력해 주세요."); return; }
    if (paymentMethod === "CARD") {
      if (!cardCompany) { setError("카드사를 선택해 주세요."); return; }
      if (cardNumber.replace(/\D/g, "").length < 16) { setError("카드번호 16자리를 입력해 주세요."); return; }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) { setError("유효기간을 MM/YY 형식으로 입력해 주세요."); return; }
      if (cardCvc.length < 3) { setError("CVC 3자리를 입력해 주세요."); return; }
      if (!cardHolder.trim()) { setError("카드 소유자명을 입력해 주세요."); return; }
    }
    if (!agreeAll) { setError("결제에 동의해 주세요."); return; }

    setSubmitting(true);
    setError("");
    try {
      const payload = {
        items: items.map((v) => ({ bookId: v.bookId, quantity: v.quantity })),
        paymentMethod,
        couponCode: selectedCouponCode || undefined,
        usePoints: parsedPoints > 0 ? parsedPoints : undefined,
        shippingAddress: `${shippingAddress.trim()} (수령인: ${receiverName.trim()})`,
      };
      if (paymentMethod === "CARD") {
        payload.cardNumber = cardNumber.replace(/\D/g, "");
        payload.cardExpiry = cardExpiry;
        payload.cardCvc = cardCvc;
        payload.cardHolder = cardHolder.trim();
      }
      const order = await api.orders.checkout(payload);
      await syncFromServer();
      navigate("/orders", { state: { latestOrder: order } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="주문/결제">
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          불러오는 중...
        </div>
      </PageLayout>
    );
  }

  if (items.length === 0) {
    return (
      <PageLayout title="주문/결제">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="mb-4 text-base font-semibold text-muted-foreground">장바구니가 비어 있습니다.</p>
          <Link to="/cart" className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            장바구니로 이동
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="주문/결제">
      {/* 단계 표시 */}
      <ol className="mb-6 flex items-center gap-1 text-sm">
        <li className="text-muted-foreground">
          <Link to="/cart" className="hover:text-foreground">장바구니</Link>
        </li>
        <ChevronRight size={14} className="text-muted-foreground" />
        <li className="font-bold text-primary">주문/결제</li>
        <ChevronRight size={14} className="text-muted-foreground" />
        <li className="text-muted-foreground">완료</li>
      </ol>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ───────── 왼쪽 ───────── */}
        <div className="space-y-5">

          {/* 주문 상품 */}
          <Section title="주문 상품">
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.cartItemId || item.bookId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground/30 overflow-hidden">
                    {(item.coverImageUrl || bookCovers[item.bookId]) ? (
                      <img
                        src={item.coverImageUrl || bookCovers[item.bookId]}
                        alt={item.title}
                        className="h-full w-full object-contain p-0.5"
                      />
                    ) : (
                      <BookOpen size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">수량 {item.quantity}권</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">
                    {formatKrw(toSafeNumber(item.price) * toSafeNumber(item.quantity))}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* 배송지 */}
          <Section title={<span className="flex items-center gap-1.5"><MapPin size={15} />배송 정보</span>}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="수령인 *">
                  <input className={input} value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="홍길동" />
                </Field>
                <Field label="연락처">
                  <input className={input} value={receiverPhone} onChange={(e) => setReceiverPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" />
                </Field>
              </div>
              <Field label="배송지 주소 *">
                <input className={input} value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="주소를 입력하세요" />
              </Field>
            </div>
          </Section>

          {/* 할인 혜택 */}
          <Section title={<span className="flex items-center gap-1.5"><TicketPercent size={15} />할인 혜택</span>}>
            <div className="space-y-3">
              <Field label="쿠폰 선택">
                <select
                  className={input}
                  value={selectedCouponCode}
                  onChange={(e) => setSelectedCouponCode(e.target.value)}
                >
                  <option value="">사용 안 함</option>
                  {coupons.map((c) => {
                    const val = toSafeNumber(c.discountValue, 0);
                    const label = String(c.discountType).toUpperCase() === "PERCENT"
                      ? `${val}% 할인`
                      : `${val.toLocaleString()}원 할인`;
                    return (
                      <option key={c.code} value={c.code}>
                        {c.code} ({label})
                      </option>
                    );
                  })}
                </select>
                {selectedCoupon && discount > 0 && (
                  <p className="mt-1 text-xs text-emerald-600">－{formatKrw(discount)} 할인 적용</p>
                )}
              </Field>

              <Field label={
                <span className="flex items-center gap-1">
                  <Wallet size={12} />
                  포인트 사용
                  <span className="ml-1 text-muted-foreground">(보유 {availablePoints.toLocaleString()}P)</span>
                </span>
              }>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={availablePoints}
                    className={`${input} flex-1`}
                    value={usePoints}
                    onChange={(e) => setUsePoints(e.target.value)}
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => setUsePoints(String(Math.min(availablePoints, Math.max(0, subtotal - discount))))}
                    className="shrink-0 rounded-lg border border-border px-3 text-xs font-medium hover:bg-secondary"
                  >
                    전액 사용
                  </button>
                </div>
                {parsedPoints > 0 && (
                  <p className="mt-1 text-xs text-emerald-600">－{formatKrw(parsedPoints)} 적용</p>
                )}
              </Field>
            </div>
          </Section>

          {/* 결제 수단 */}
          <Section title={<span className="flex items-center gap-1.5"><CreditCard size={15} />결제 수단</span>}>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-all ${
                    paymentMethod === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>

            {/* 신용카드 폼 */}
            {paymentMethod === "CARD" && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Lock size={11} />
                  카드 정보 입력
                </div>

                <Field label="카드사 *">
                  <select className={input} value={cardCompany} onChange={(e) => setCardCompany(e.target.value)}>
                    <option value="">카드사를 선택하세요</option>
                    {CARD_COMPANIES.map((c) => <option key={c} value={c}>{c}카드</option>)}
                  </select>
                </Field>

                <Field label="카드번호 *">
                  <div className="relative">
                    <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      className={`${input} pl-8 font-mono tracking-widest`}
                      placeholder="0000 - 0000 - 0000 - 0000"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      autoComplete="cc-number"
                    />
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="유효기간 (MM/YY) *">
                    <input
                      className={`${input} font-mono`}
                      placeholder="MM / YY"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      autoComplete="cc-exp"
                    />
                  </Field>
                  <Field label="CVC *">
                    <input
                      className={`${input} font-mono`}
                      placeholder="• • •"
                      maxLength={4}
                      type="password"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      autoComplete="cc-csc"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="카드 소유자명 *">
                    <input
                      className={input}
                      placeholder="홍길동"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      autoComplete="cc-name"
                    />
                  </Field>
                  <Field label="할부">
                    <select className={input} value={installment} onChange={(e) => setInstallment(e.target.value)}>
                      <option value="0">일시불</option>
                      {[2,3,4,5,6,9,12].map((n) => (
                        <option key={n} value={String(n)}>{n}개월</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  ※ 입력하신 카드 정보는 안전하게 암호화되어 처리됩니다.
                </p>
              </div>
            )}

            {paymentMethod === "BANK_TRANSFER" && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground">입금 계좌 안내</p>
                <p>기업은행 000-000000-00-000</p>
                <p>예금주: (주)북빌리지</p>
                <p className="text-xs">주문 후 48시간 이내에 입금해 주세요.</p>
              </div>
            )}

            {paymentMethod === "PAY" && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-2">간편결제 서비스</p>
                <div className="flex gap-2">
                  {["카카오페이", "네이버페이", "토스"].map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/60"
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs">각 서비스 앱에서 인증 후 결제가 진행됩니다.</p>
              </div>
            )}
          </Section>

          {/* 동의 */}
          <Section title="결제 동의">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={agreeAll}
                onChange={(e) => setAgreeAll(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
              />
              <span className="text-sm leading-relaxed text-foreground">
                주문 내용 및 결제 정보를 확인하였으며{" "}
                <Link to="/terms/service" className="text-primary underline underline-offset-2">이용약관</Link>과{" "}
                <Link to="/terms/privacy" className="text-primary underline underline-offset-2">개인정보 처리방침</Link>에
                동의합니다. <span className="text-muted-foreground text-xs">(필수)</span>
              </span>
            </label>
          </Section>
        </div>

        {/* ───────── 오른쪽: 결제 금액 요약 ───────── */}
        <div className="space-y-4">
          <div className="sticky top-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold">결제 금액</h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">상품 금액</span>
                <span>{formatKrw(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">쿠폰 할인</span>
                <span className={discount > 0 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                  {discount > 0 ? `－${formatKrw(discount)}` : "－"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">포인트 사용</span>
                <span className={parsedPoints > 0 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                  {parsedPoints > 0 ? `－${formatKrw(parsedPoints)}` : "－"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">배송비</span>
                <span className="text-emerald-600 font-medium">무료</span>
              </div>
              <hr className="border-border" />
              <div className="flex items-center justify-between pt-0.5">
                <span className="font-bold text-base">최종 결제금액</span>
                <span className="text-xl font-extrabold text-primary">{formatKrw(finalTotal)}</span>
              </div>
            </div>

            {parsedPoints > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                이번 주문으로 약{" "}
                <span className="font-semibold text-foreground">{Math.max(1, Math.floor(finalTotal / 100)).toLocaleString()}P</span>{" "}
                적립 예정
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  결제 처리 중…
                </>
              ) : (
                <>
                  <Lock size={14} />
                  {formatKrw(finalTotal)} 결제하기
                </>
              )}
            </button>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <Lock size={10} />
              SSL 암호화 보안 적용
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

/* ── 헬퍼 컴포넌트 ── */
const input =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition";

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-5 py-3">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
