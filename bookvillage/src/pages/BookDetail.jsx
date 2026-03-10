import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Star,
  ShoppingCart,
  ChevronLeft,
  ThumbsUp,
  Flag,
  Trash2,
  BookImage,
  CalendarDays,
  BookOpenText,
  Truck,
  ShieldCheck,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { api } from "@/api/client";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { normalizeBook } from "@/lib/bookNormalizer";

const TAB = {
  INTRO: "intro",
  INFO: "info",
  REVIEW: "review",
};

const formatPrice = (value) => `${Number(value || 0).toLocaleString()}원`;

const getDisplayRating = (book) => {
  const n = Number(book?.rating);
  if (!Number.isFinite(n)) return null;
  return n > 5 ? n / 2 : n;
};

const applyBookReviewStats = (targetBook, reviewList) => {
  if (!targetBook || !Array.isArray(reviewList)) return targetBook;
  const count = reviewList.length;
  if (count <= 0) {
    return { ...targetBook, rating: null, reviewCount: 0 };
  }
  const average = reviewList.reduce((sum, review) => sum + Number(review?.rating || 0), 0) / count;
  return {
    ...targetBook,
    rating: Number(average.toFixed(1)),
    reviewCount: count,
  };
};

const buildGeneratedSynopsis = (book) => {
  const title = book.title || "이 도서";
  const author = book.author || "저자 미상";
  const category = book.category || "일반";
  const publisher = book.publisher || "출판사 정보 없음";
  const publishDate = book.publishDate || "출간일 정보 없음";
  const keywordLine = book.keyword
    ? `핵심 키워드 '${book.keyword}'를 중심으로 기초 개념부터 실전 적용까지 단계적으로 학습할 수 있도록 구성되어 있습니다.`
    : "핵심 개념부터 실전 적용까지 단계적으로 학습할 수 있도록 구성되어 있습니다.";
  const lines = [
    `${title}는 ${author}이(가) 집필한 ${category} 분야 도서입니다.`,
    `${publisher}에서 출간되었고, 출간일은 ${publishDate}입니다.`,
    keywordLine,
    "기본 개념 정리 -> 예제 실습 -> 응용 확장 순서로 학습 흐름을 잡아, 독학자도 맥락을 놓치지 않도록 설계했습니다.",
    "처음 공부하는 입문자부터 실무에 바로 적용하려는 독자까지 폭넓게 참고할 수 있는 구성입니다.",
  ];

  return lines.join("\n\n");
};

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();

  const [book, setBook] = useState(null);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState(TAB.INTRO);
  const [reviewMessage, setReviewMessage] = useState("");
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  const reloadReviews = async (bookId) => {
    try {
      const list = await api.reviews.listByBook(bookId);
      const rows = list || [];
      setReviews(rows);
      return rows;
    } catch {
      setReviews([]);
      return null;
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id) return;
      const numericId = Number(id);
      if (Number.isNaN(numericId)) {
        if (!active) return;
        setBook(null);
        setReviews([]);
        return;
      }

      try {
        const response = await api.books.get(numericId);
        const currentBook = normalizeBook(response);
        if (!active) return;

        setBook(currentBook);
        setActiveTab(TAB.INTRO);

        const loadedReviews = await reloadReviews(numericId);
        if (!active) return;
        if (loadedReviews) {
          setBook((prev) => applyBookReviewStats(prev || currentBook, loadedReviews));
        }
      } catch {
        if (!active) return;
        setBook(null);
        setReviews([]);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id]);

  if (!book) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">도서를 찾을 수 없습니다.</p>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">
            메인으로 이동
          </Link>
        </div>
      </div>
    );
  }

  const synopsis = book.description || buildGeneratedSynopsis(book);

  const displayRating = getDisplayRating(book);
  const reviewCount = Number.isFinite(Number(book.reviewCount))
    ? Number(book.reviewCount)
    : Number.isFinite(Number(book.sourceReviewCount))
      ? Number(book.sourceReviewCount)
      : null;

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }
    if (!reviewText.trim()) return;

    try {
      await api.reviews.create(book.id, { rating: reviewRating, content: reviewText });
      setReviewText("");
      setReviewRating(5);
      setReviewMessage("리뷰가 등록되었습니다.");
      const loadedReviews = await reloadReviews(book.id);
      if (loadedReviews) {
        setBook((prev) => applyBookReviewStats(prev, loadedReviews));
      }
    } catch (e2) {
      setReviewMessage(e2 instanceof Error ? e2.message : "리뷰 등록에 실패했습니다.");
    }
  };

  const addToCart = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    addItem({ bookId: book.id, title: book.title, price: Number(book.price) }, 1);
    navigate("/cart");
  };

  const likeReview = async (reviewId) => {
    try {
      await api.reviews.like(reviewId);
      await reloadReviews(book.id);
    } catch (e2) {
      setReviewMessage(e2 instanceof Error ? e2.message : "좋아요 처리에 실패했습니다.");
    }
  };

  const reportReview = async (reviewId) => {
    try {
      await api.reviews.report(reviewId, "검토 요청");
      setReviewMessage("신고가 접수되었습니다.");
      await reloadReviews(book.id);
    } catch (e2) {
      setReviewMessage(e2 instanceof Error ? e2.message : "신고 처리에 실패했습니다.");
    }
  };

  const deleteReview = async (reviewId) => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!window.confirm("내 리뷰를 삭제할까요?")) {
      return;
    }

    setDeletingReviewId(reviewId);
    setReviewMessage("");
    try {
      await api.reviews.delete(reviewId, `book-${book.id}-review-delete`);
      setReviewMessage("리뷰가 삭제되었습니다.");
      const loadedReviews = await reloadReviews(book.id);
      if (loadedReviews) {
        setBook((prev) => applyBookReviewStats(prev, loadedReviews));
      }
    } catch (e2) {
      setReviewMessage(e2 instanceof Error ? e2.message : "리뷰 삭제에 실패했습니다.");
    } finally {
      setDeletingReviewId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <Link to="/books" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <ChevronLeft size={14} /> 도서검색으로
          </Link>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-80 aspect-[3/4] md:min-h-[420px] bg-secondary/40 flex items-center justify-center overflow-hidden">
              {book.coverImageUrl ? (
                <img src={book.coverImageUrl} alt={book.title} className="h-full w-full object-contain p-3" />
              ) : (
                <div className="text-center text-white/80">
                  <BookImage size={34} className="mx-auto mb-2" />
                  <p className="text-xs font-semibold tracking-wide">NO COVER IMAGE</p>
                </div>
              )}
            </div>

            <div className="flex-1 p-6 md:p-8 space-y-5">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">{book.title}</h1>
                <p className="mt-1 text-muted-foreground">{book.author || "저자 미상"} | {book.publisher || "-"}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-price">{formatPrice(book.price)}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {book.category && (
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                      {book.category}
                    </span>
                  )}
                  {book.publishDate && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                      <CalendarDays size={12} />
                      {book.publishDate}
                    </span>
                  )}
                  {book.keyword && (
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                      #{book.keyword}
                    </span>
                  )}
                </div>

                {(displayRating !== null || reviewCount !== null) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {displayRating !== null && (
                      <span className="inline-flex items-center gap-1">
                        <Star size={14} className="fill-current text-star" />
                        {displayRating.toFixed(1)} / 5
                      </span>
                    )}
                    {reviewCount !== null && <span>리뷰 {reviewCount.toLocaleString()}개</span>}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={addToCart}
                  className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <ShoppingCart size={18} /> 장바구니 담기
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground flex items-center gap-2">
                  <Truck size={14} className="text-primary" />
                  오늘 주문 시 빠른 출고
                </div>
                <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground flex items-center gap-2">
                  <ShieldCheck size={14} className="text-primary" />
                  안전 결제 및 주문 보호
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="mt-8 bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab(TAB.INTRO)}
              className={`px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === TAB.INTRO ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              도서 소개
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(TAB.INFO)}
              className={`px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === TAB.INFO ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              기본 정보
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(TAB.REVIEW)}
              className={`px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === TAB.REVIEW ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              리뷰
            </button>
          </div>

          {activeTab === TAB.INTRO && (
            <div className="p-6 md:p-8 space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <BookOpenText size={18} className="text-primary" />
                도서 소개
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: synopsis }}></p>
            </div>
          )}

          {activeTab === TAB.INFO && (
            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">ISBN</p>
                  <p className="mt-1 font-semibold text-foreground">{book.isbn || "-"}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">출판사</p>
                  <p className="mt-1 font-semibold text-foreground">{book.publisher || "-"}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">카테고리</p>
                  <p className="mt-1 font-semibold text-foreground">{book.category || "-"}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">출간일</p>
                  <p className="mt-1 font-semibold text-foreground">{book.publishDate || "-"}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">재고</p>
                  <p className="mt-1 font-semibold text-foreground">{Number(book.stock || 0).toLocaleString()}권</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">상품 코드</p>
                  <p className="mt-1 font-semibold text-foreground">{book.productId || "-"}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === TAB.REVIEW && (
            <div className="p-6 md:p-8">
              <h3 className="text-lg font-bold text-foreground mb-6">리뷰 작성</h3>
              <form onSubmit={handleReviewSubmit} className="bg-secondary rounded-xl p-5 mb-6 space-y-4">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground mr-2">별점:</span>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button key={score} type="button" onClick={() => setReviewRating(score)}>
                      <Star size={20} className={score <= reviewRating ? "fill-current text-star" : "text-muted"} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full h-28 p-3 rounded-lg border border-border bg-background text-sm"
                  placeholder="리뷰를 작성해 주세요."
                />
                <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                  리뷰 등록
                </button>
              </form>

              {reviewMessage && <p className="mb-4 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm">{reviewMessage}</p>}

              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="border rounded-lg p-3 text-sm">
                    <p className="font-semibold">평점: {review.rating} / 5</p>
                    <p className="text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: review.content }}></p>
                    <p className="text-xs mt-1" dangerouslySetInnerHTML={{ __html: "요약: " + (review.summary || "") }}></p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => likeReview(review.id)}>
                        <ThumbsUp size={14} className="inline mr-1" /> 좋아요 ({review.likeCount || 0})
                      </button>
                      <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => reportReview(review.id)}>
                        <Flag size={14} className="inline mr-1" /> 신고 ({review.reportCount || 0})
                      </button>
                      {user && Number(review.userId) === Number(user.id) && (
                        <button
                          type="button"
                          className="px-2 py-1 border rounded text-xs text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-60"
                          onClick={() => deleteReview(review.id)}
                          disabled={deletingReviewId === review.id}
                        >
                          <Trash2 size={14} className="inline mr-1" />
                          {deletingReviewId === review.id ? "삭제 중..." : "삭제"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default BookDetail;
