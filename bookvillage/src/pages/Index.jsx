import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import BookSection from "@/components/BookSection";
import Footer from "@/components/Footer";
import { Truck, RotateCcw, Clock, ArrowRight } from "lucide-react";
import { api } from "@/api/client";
import { toCardBook } from "@/lib/bookNormalizer";
import { useAuth } from "@/context/AuthContext";

const features = [
  { icon: Truck, label: "무료배송", desc: "2만원 이상 구매 시" },
  { icon: Clock, label: "당일배송", desc: "오후 1시 이전 주문" },
  { icon: RotateCcw, label: "무료반품", desc: "수령 후 7일 이내" },
];

const quickCategories = [
  { label: "소설", emoji: "📖" },
  { label: "자기계발", emoji: "🧠" },
  { label: "에세이", emoji: "🎨" },
  { label: "IT", emoji: "💻" },
  { label: "과학", emoji: "🔬" },
  { label: "인문", emoji: "🌍" },
  { label: "유아", emoji: "🧒" },
];

const Index = () => {
  const { isAdmin } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadBooks = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await api.books.search();
        if (!mounted) return;
        const mapped = (result || [])
          .map((b) => toCardBook(b))
          .filter(Boolean);
        const withImage = mapped.filter((b) => Boolean(b.coverImageUrl));
        const withoutImage = mapped.filter((b) => !b.coverImageUrl);
        setBooks([...withImage, ...withoutImage]);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load books");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadBooks();
    return () => {
      mounted = false;
    };
  }, []);

  const newBooks = useMemo(() => books.slice(0, 4), [books]);
  const hotBooks = useMemo(() => (books.slice(4, 8).length ? books.slice(4, 8) : books.slice(0, 4)), [books]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 space-y-9">
        <HeroBanner />
        {isAdmin && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-800">관리자 계정으로 로그인되었습니다.</p>
                <p className="text-xs text-emerald-700">아래 버튼으로 관리자 페이지로 이동할 수 있습니다.</p>
              </div>
              <a
                href="/admin/"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                관리자 페이지 이동
              </a>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5 sm:gap-4">
            {quickCategories.map((item) => (
              <Link
                key={item.label}
                to={`/books?category=${encodeURIComponent(item.label)}`}
                className="group flex flex-col items-center gap-2 rounded-xl p-2.5 sm:p-3 transition-all duration-300 hover:bg-secondary"
              >
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-secondary flex items-center justify-center text-xl transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md">
                  {item.emoji}
                </div>
                <span className="text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-primary">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {loading && <div className="text-sm text-muted-foreground">도서 목록 불러오는 중...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}

        {!loading && !error && (
          <>
            <BookSection title="오늘의 신간" emoji="📖" books={newBooks} moreTo="/books" />

            <section className="relative overflow-hidden rounded-[22px] bg-gradient-to-r from-[hsl(24,48%,27%)] to-[hsl(28,45%,38%)] px-6 py-7 sm:px-9 sm:py-8">
              <div className="absolute -left-8 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full bg-white/10" />
              <div className="absolute right-8 -top-10 h-44 w-44 rounded-full bg-white/10" />
              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-white/85 text-sm font-semibold">🎁 첫 구매 회원 한정</p>
                  <h3 className="mt-1 text-white text-3xl font-extrabold">최대 5,000원 할인 쿠폰팩</h3>
                  <p className="text-white/75 text-sm mt-1">지금 가입하고 혜택을 받아보세요</p>
                </div>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  쿠폰 받기
                  <ArrowRight size={14} />
                </Link>
              </div>
            </section>

            <BookSection title="MD 추천 도서" emoji="🔥" books={hotBooks} moreTo="/books" />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
