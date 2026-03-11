import { Gift, Ticket, CalendarCheck2 } from "lucide-react";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";

const eventCards = [
  {
    id: "first-purchase",
    title: "신규 회원 웰컴 쿠폰",
    description: "회원가입 후 첫 주문 시 최대 15% 할인 혜택을 받을 수 있습니다.",
    badge: "진행 중",
    cta: "회원가입 하러가기",
    to: "/register",
    icon: Gift,
  },
  {
    id: "review-reward",
    title: "리뷰 작성 포인트 이벤트",
    description: "도서 리뷰를 작성하면 포인트가 적립되고 결제 시 사용할 수 있습니다.",
    badge: "상시",
    cta: "도서 보러가기",
    to: "/books",
    icon: Ticket,
  },
  {
    id: "notice",
    title: "이벤트 공지 캘린더",
    description: "최신 공지사항과 진행 중인 프로모션 일정을 한 번에 확인할 수 있습니다.",
    badge: "업데이트",
    cta: "공지사항 보기",
    to: "/customer-service?tab=notice",
    icon: CalendarCheck2,
  },
];

export default function Events() {
  return (
    <PageLayout title="이벤트" description="진행 중인 혜택과 프로모션을 확인해보세요">
      <section className="rounded-2xl border border-border bg-gradient-to-r from-primary/90 to-primary p-6 text-primary-foreground">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground/80">BOOKVILLAGE EVENT</p>
        <h2 className="mt-2 text-2xl font-extrabold">이번 주 추천 이벤트</h2>
        <p className="mt-2 text-sm text-primary-foreground/90">
          이벤트 탭은 학습용 Security가 아닌, 실제 사용자용 프로모션 페이지로 연결됩니다.
        </p>
      </section>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {eventCards.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">
                  {item.badge}
                </span>
                <Icon size={18} className="text-primary" />
              </div>
              <h3 className="text-base font-bold">{item.title}</h3>
              <p className="mt-2 min-h-[54px] text-sm leading-6 text-muted-foreground">{item.description}</p>
              <Link
                to={item.to}
                className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {item.cta}
              </Link>
            </article>
          );
        })}
      </div>
    </PageLayout>
  );
}
