import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Ticket, Wallet, Zap } from "lucide-react";
import { api } from "@/api/client";
import PageLayout from "@/components/PageLayout";

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("ko-KR");
};

const formatMoney = (value) => Number(value || 0).toLocaleString("ko-KR");

export default function MypageWallet() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wallet, setWallet] = useState(null);
  const [summaryFromServer, setSummaryFromServer] = useState(null);

  // 포인트 충전 상태
  const [chargeAmount, setChargeAmount] = useState("");
  const [charging, setCharging] = useState(false);
  const [chargeResult, setChargeResult] = useState(null);
  const [chargeError, setChargeError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    const [sm, wl] = await Promise.allSettled([api.mypage.summary(), api.mypage.wallet()]);
    setSummaryFromServer(sm.status === "fulfilled" ? sm.value || null : null);
    setWallet(wl.status === "fulfilled" ? wl.value || null : null);
    if (sm.status === "rejected" || wl.status === "rejected") {
      setError("지갑 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(
    () => ({
      currentPoints: Number(summaryFromServer?.currentPoints ?? wallet?.currentPoints ?? 0),
      pointHistoryCount: Number(summaryFromServer?.pointHistoryCount ?? (wallet?.pointHistories || []).length),
      couponCount: Number(summaryFromServer?.couponCount ?? (wallet?.coupons || []).length),
    }),
    [summaryFromServer, wallet],
  );

  const pointHistories = useMemo(() => wallet?.pointHistories || [], [wallet]);
  const couponHistories = useMemo(() => {
    const acquired = (wallet?.coupons || []).map((coupon) => ({
      key: `acquire-${coupon.code}`,
      actionType: "ACQUIRE",
      couponCode: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      remainingCount: coupon.remainingCount,
      createdAt: coupon.createdAt || coupon.validFrom || null,
      orderNumber: null,
    }));
    const used = (wallet?.couponHistories || []).map((row) => ({
      key: `use-${row.id || row.couponCode}-${row.usedAt}`,
      actionType: "USE",
      couponCode: row.couponCode,
      discountType: null,
      discountValue: null,
      remainingCount: null,
      createdAt: row.usedAt,
      orderNumber: row.orderNumber || null,
    }));
    return [...used, ...acquired].sort((a, b) => {
      const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTs - aTs;
    });
  }, [wallet]);

  const handleCharge = async (e) => {
    e.preventDefault();
    const amount = parseInt(chargeAmount, 10);
    if (isNaN(amount)) {
      setChargeError("충전할 포인트를 입력하세요.");
      return;
    }
    setCharging(true);
    setChargeError("");
    setChargeResult(null);
    try {
      const result = await api.mypage.chargePoints(amount);
      setChargeResult(result);
      setChargeAmount("");
      await loadData();
    } catch (e) {
      setChargeError(e?.message || "포인트 충전에 실패했습니다.");
    } finally {
      setCharging(false);
    }
  };

  if (loading) {
    return (
      <PageLayout hideIntro>
        <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
          포인트/쿠폰 정보를 불러오는 중입니다.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="포인트/쿠폰 관리" description="포인트 잔액, 쿠폰 현황, 적립/사용 내역을 확인합니다.">
      <section className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/mypage" className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary">
            마이페이지 홈
          </Link>
          <Link to="/mypage/account" className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary">
            계정 관리
          </Link>
          <Link to="/mypage/activity" className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary">
            활동 관리
          </Link>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">현재 포인트</p>
            <p className="mt-1 text-2xl font-extrabold">{summary.currentPoints.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">포인트 기록</p>
            <p className="mt-1 text-2xl font-extrabold">{summary.pointHistoryCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">보유 쿠폰</p>
            <p className="mt-1 text-2xl font-extrabold">{summary.couponCount}</p>
          </div>
        </div>

        {/* 포인트 충전 (파라미터 변조 실습) */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Zap size={16} />
            <h2 className="text-lg font-bold">포인트 충전</h2>
          </div>
          <form onSubmit={handleCharge} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">충전 금액 (음수 입력 시 차감됨)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                placeholder="예: 10000 또는 -5000"
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={charging}
              className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {charging ? "처리 중..." : "충전"}
            </button>
          </form>
          {chargeError && (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{chargeError}</p>
          )}
          {chargeResult && (
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <p>충전 전: {Number(chargeResult.balanceBefore).toLocaleString()}P</p>
              <p>변경 금액: {Number(chargeResult.charged) > 0 ? "+" : ""}{Number(chargeResult.charged).toLocaleString()}P</p>
              <p className="font-bold">충전 후: {Number(chargeResult.balanceAfter).toLocaleString()}P</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Ticket size={16} />
            <h2 className="text-lg font-bold">사용 가능한 쿠폰</h2>
          </div>
          {(wallet?.coupons || []).filter((c) => Number(c.remainingCount || 0) > 0).length === 0 ? (
            <p className="rounded-xl bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">사용 가능한 쿠폰이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {(wallet?.coupons || [])
                .filter((c) => Number(c.remainingCount || 0) > 0)
                .map((c) => (
                  <div key={c.code} className="rounded-xl border border-border bg-background/80 px-3 py-2">
                    <p className="text-sm font-semibold">{c.code}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {String(c.discountType).toUpperCase() === "PERCENT"
                        ? `${c.discountValue}%`
                        : `${formatMoney(c.discountValue)} KRW`}{" "}
                      | 남은 수량: {c.remainingCount}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Wallet size={16} />
              <h2 className="text-lg font-bold">포인트 획득/사용 내역</h2>
            </div>
            {pointHistories.length === 0 ? (
              <p className="rounded-xl bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">포인트 내역이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {pointHistories.slice(0, 50).map((history, idx) => {
                  const earned = Number(history.amount || 0) >= 0;
                  return (
                    <div key={`${history.createdAt}-${idx}`} className="rounded-lg border border-border px-3 py-2">
                      <p className="text-xs font-semibold">구분: {earned ? "포인트 획득" : "포인트 사용"}</p>
                      <p className={`mt-1 text-xs font-semibold ${earned ? "text-emerald-700" : "text-red-600"}`}>
                        금액: {Number(history.amount || 0) > 0 ? "+" : ""}
                        {Number(history.amount || 0).toLocaleString()}P
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">내용: {history.description || "-"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">일시: {formatDateTime(history.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Ticket size={16} />
              <h2 className="text-lg font-bold">쿠폰 획득/사용 내역</h2>
            </div>
            {couponHistories.length === 0 ? (
              <p className="rounded-xl bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">쿠폰 내역이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {couponHistories.slice(0, 50).map((history) => (
                  <div key={history.key} className="rounded-lg border border-border px-3 py-2">
                    <p className="text-xs font-semibold">구분: {history.actionType === "USE" ? "쿠폰 사용" : "쿠폰 획득"}</p>
                    <p className="mt-1 text-xs font-semibold">
                      {history.couponCode || "-"}
                      {history.discountValue != null && history.discountType ? (
                        <>
                          {" "}
                          (
                          {String(history.discountType).toUpperCase() === "PERCENT"
                            ? `${history.discountValue}%`
                            : `${formatMoney(history.discountValue)} KRW`}
                          )
                        </>
                      ) : null}
                    </p>
                    {history.orderNumber && <p className="mt-1 text-xs text-muted-foreground">주문번호: {history.orderNumber}</p>}
                    {history.remainingCount != null && <p className="mt-1 text-xs text-muted-foreground">남은 수량: {history.remainingCount}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">일시: {formatDateTime(history.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </PageLayout>
  );
}
