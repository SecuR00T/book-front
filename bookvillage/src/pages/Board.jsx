import { useCallback, useEffect, useState } from "react";
import { PenSquare, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import PageLayout from "@/components/PageLayout";

const POST_PAGE_SIZE = 10;

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Board() {
  const navigate = useNavigate();
  const location = useLocation();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: POST_PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  });

  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [myOnly, setMyOnly] = useState(false);
  const [sort, setSort] = useState("latest");

  useEffect(() => {
    const flash = location.state?.message;
    if (!flash) return;
    setMessage(flash);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    setPage(0);
  }, [query, myOnly, sort]);

  const loadPosts = useCallback(async (targetPage) => {
    const safePage = Math.max(0, Number(targetPage || 0));
    setLoading(true);
    setError("");
    try {
      const data = await api.board.list(query, myOnly, sort, safePage, POST_PAGE_SIZE);
      const rows = data?.items || [];
      const totalPages = Number(data?.totalPages || 0);

      if (rows.length === 0 && safePage > 0 && totalPages > 0) {
        setPage(totalPages - 1);
        return;
      }

      setPosts(rows);
      setPageInfo({
        page: Number(data?.page ?? safePage),
        size: Number(data?.size ?? POST_PAGE_SIZE),
        totalElements: Number(data?.totalElements ?? 0),
        totalPages,
        hasNext: Boolean(data?.hasNext),
        hasPrevious: Boolean(data?.hasPrevious),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "게시글 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [myOnly, query, sort]);

  useEffect(() => {
    loadPosts(page);
  }, [loadPosts, page]);

  const onSearch = (e) => {
    e.preventDefault();
    setQuery(queryInput.trim());
  };

  return (
    <PageLayout title="회원 게시판">
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">게시글 목록</h2>
          <button
            type="button"
            onClick={() => navigate("/board/new")}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <PenSquare size={15} />
            글쓰기
          </button>
        </div>

        <form onSubmit={onSearch} className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="제목/내용 검색"
              className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-primary"
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="latest">최신순</option>
            <option value="popular">인기순</option>
          </select>
          <button type="submit" className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
            검색
          </button>
          <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={myOnly}
              onChange={(e) => setMyOnly(e.target.checked)}
            />
            내 글만 보기
          </label>
        </form>

        {query && !loading && (
          <p className="mb-2 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm" dangerouslySetInnerHTML={{ __html: `"${query}" 검색 결과 (${posts.length}건)` }}></p>
        )}

        {loading ? (
          <p className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">목록을 불러오는 중입니다...</p>
        ) : posts.length === 0 ? (
          <p className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">등록된 게시글이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <button
                type="button"
                key={post.id}
                onClick={() => navigate(`/board/${post.id}`)}
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-left transition-colors hover:bg-secondary/60"
              >
                <p className="truncate text-sm font-bold">{post.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.content}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {post.authorName || "Unknown"} | {formatDateTime(post.createdAt)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  댓글 {post.commentCount || 0} | 첨부 {post.attachmentCount || 0}
                </p>
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          <span>
            총 {pageInfo.totalElements}건 | {pageInfo.totalPages > 0 ? pageInfo.page + 1 : 0}/{pageInfo.totalPages} 페이지
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!pageInfo.hasPrevious}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
            >
              이전
            </button>
            <button
              type="button"
              disabled={!pageInfo.hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
      </section>

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
    </PageLayout>
  );
}
