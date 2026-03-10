import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { api } from "@/api/client";
import { normalizeBook } from "@/lib/bookNormalizer";
import { useAuth } from "@/context/AuthContext";

const BESTSELLER_CATEGORY = "\uBCA0\uC2A4\uD2B8\uC140\uB7EC";
const VIRTUAL_CATEGORIES = ["\uC2E0\uAC04", "\uC18C\uC124", "\uC5D0\uC138\uC774", "\uC778\uBB38", "\uACBD\uC81C/\uACBD\uC601", "\uC790\uAE30\uACC4\uBC1C", "IT/\uACFC\uD559"];
const NAV_CATEGORIES = [BESTSELLER_CATEGORY, ...VIRTUAL_CATEGORIES];
const CURATED_BESTSELLER_IDS = [10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010, 10011, 10012];

const CATEGORY_KEYWORDS = {
  "\uC18C\uC124": ["\uC18C\uC124", "novel", "fiction", "\uBB38\uD559", "\uC7A5\uD3B8", "\uB2E8\uD3B8"],
  "\uC5D0\uC138\uC774": ["\uC5D0\uC138\uC774", "essay", "\uC218\uD544"],
  "\uC778\uBB38": ["\uC778\uBB38", "\uCCA0\uD559", "\uC5ED\uC0AC", "\uC2EC\uB9AC", "\uC0AC\uD68C", "\uC0AC\uC0C1"],
  "\uACBD\uC81C/\uACBD\uC601": ["\uACBD\uC81C", "\uACBD\uC601", "\uAE08\uC735", "\uD22C\uC790", "\uC8FC\uC2DD", "\uBE44\uC988\uB2C8\uC2A4", "\uB9C8\uCF00\uD305", "\uC7AC\uD14C\uD06C"],
  "\uC790\uAE30\uACC4\uBC1C": ["\uC790\uAE30\uACC4\uBC1C", "\uC131\uC7A5", "\uC2B5\uAD00", "\uB9AC\uB354\uC2ED", "\uB3D9\uAE30\uBD80\uC5EC", "\uC790\uC874\uAC10"],
  "IT/\uACFC\uD559": ["it", "\uACFC\uD559", "\uCEF4\uD4E8\uD130", "\uCF54\uB529", "\uD504\uB85C\uADF8\uB798\uBC0D", "python", "\uAC1C\uBC1C", "\uB370\uC774\uD130", "ai", "\uBA38\uC2E0\uB7EC\uB2DD", "\uC54C\uACE0\uB9AC\uC998", "\uB124\uD2B8\uC6CC\uD06C", "\uBCF4\uC548"],
};

const parsePublishDate = (value) => {
  if (!value) return 0;
  const text = String(value).trim();
  const match = text.match(/(19\d{2}|20\d{2})\D{0,3}(\d{1,2})\D{0,3}(\d{1,2})/);
  if (!match) return 0;

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return 0;
  return new Date(y, Math.max(0, m - 1), d).getTime();
};

const getSearchableText = (book) =>
  [
    book?.title,
    book?.author,
    book?.publisher,
    book?.category,
    book?.keyword,
    book?.description,
    book?.descriptionRaw,
    book?.publishDate,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const matchesQuery = (book, query) => {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return getSearchableText(book).includes(q);
};

const sortByRecent = (books) =>
  [...(books || [])].sort((a, b) => {
    const aDate = parsePublishDate(a?.publishDate || a?.descriptionMeta?.publishdate || a?.descriptionRaw);
    const bDate = parsePublishDate(b?.publishDate || b?.descriptionMeta?.publishdate || b?.descriptionRaw);
    if (aDate !== bDate) return bDate - aDate;
    return Number(b?.id || 0) - Number(a?.id || 0);
  });

const pickCuratedBestsellers = (books) => {
  const byId = new Map((books || []).map((book) => [book.id, book]));
  const curated = CURATED_BESTSELLER_IDS.map((id) => byId.get(id)).filter(Boolean);
  if (curated.length >= 8) return curated;

  const existingIds = new Set(curated.map((book) => book.id));
  const fallback = (books || [])
    .filter((book) => !existingIds.has(book.id))
    .slice(0, Math.max(0, 12 - curated.length));

  return [...curated, ...fallback];
};

const applyVirtualCategory = (books, virtualCategory) => {
  if (!VIRTUAL_CATEGORIES.includes(virtualCategory)) {
    return { list: books, fallbackUsed: false };
  }

  if (virtualCategory === "\uC2E0\uAC04") {
    return { list: sortByRecent(books), fallbackUsed: false };
  }

  const keywords = CATEGORY_KEYWORDS[virtualCategory] || [];
  const filtered = (books || []).filter((book) => {
    const text = getSearchableText(book);
    return keywords.some((kw) => text.includes(String(kw).toLowerCase()));
  });

  if (filtered.length > 0) {
    return { list: sortByRecent(filtered), fallbackUsed: false };
  }

  const sorted = sortByRecent(books);
  const slotMap = {
    "\uC18C\uC124": 0,
    "\uC5D0\uC138\uC774": 1,
    "\uC778\uBB38": 2,
    "\uACBD\uC81C/\uACBD\uC601": 3,
    "\uC790\uAE30\uACC4\uBC1C": 4,
    "IT/\uACFC\uD559": 5,
  };
  const slot = slotMap[virtualCategory] ?? 0;
  const fallback = sorted.filter((_, idx) => idx % 6 === slot).slice(0, 80);

  return { list: fallback.length ? fallback : sorted.slice(0, 80), fallbackUsed: true };
};

export default function BookSearch() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [categories, setCategories] = useState(NAV_CATEGORIES);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [wishlistBusyId, setWishlistBusyId] = useState(null);
  const [wishlistMessage, setWishlistMessage] = useState("");

  const search = async (query, selectedCategory) => {
    setLoading(true);
    setError("");
    setHint("");

    try {
      const queryText = query || "";
      const queryTextTrimmed = queryText.trim();
      const hasQuery = queryTextTrimmed.length > 0;
      const normalizedCategory = (selectedCategory || "").trim();
      const isBestsellerCategory = normalizedCategory === BESTSELLER_CATEGORY;
      const isVirtualCategory = VIRTUAL_CATEGORIES.includes(normalizedCategory);

      const list = await api.books.search(
        isVirtualCategory || isBestsellerCategory ? undefined : hasQuery ? queryText : undefined,
        isVirtualCategory || isBestsellerCategory ? undefined : normalizedCategory || undefined,
      );
      let mapped = (list || []).map((book) => normalizeBook(book)).filter(Boolean);

      if (isBestsellerCategory) {
        mapped = pickCuratedBestsellers(mapped);
      } else if (isVirtualCategory) {
        const { list: categorized, fallbackUsed } = applyVirtualCategory(mapped, normalizedCategory);
        mapped = hasQuery ? categorized.filter((book) => matchesQuery(book, queryTextTrimmed)) : categorized;

        if (fallbackUsed) {
          setHint("\uD574\uB2F9 \uBD84\uB958 \uD0A4\uC6CC\uB4DC\uC640 \uC815\uD655\uD788 \uC77C\uCE58\uD558\uB294 \uB3C4\uC11C\uAC00 \uC801\uC5B4 \uC720\uC0AC \uB3C4\uC11C\uB97C \uD45C\uC2DC\uD569\uB2C8\uB2E4.");
        }
      }

      setBooks(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load books.");
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.books
      .getCategories()
      .then((v) => {
        const merged = [...NAV_CATEGORIES, ...((v || []).filter(Boolean) || [])];
        const deduped = Array.from(new Set(merged.map((x) => String(x).trim()).filter(Boolean)));
        setCategories(deduped);
      })
      .catch(() => setCategories(NAV_CATEGORIES));
  }, []);

  useEffect(() => {
    const nextQ = params.get("q") ?? "";
    const nextCategory = params.get("category") ?? "";

    setQ(nextQ);
    setCategory(nextCategory);
    search(nextQ, nextCategory);
  }, [params.toString()]);

  const submit = (e) => {
    e.preventDefault();
    const safeQ = q.trim() ? q : "";
    setParams({ ...(safeQ ? { q: safeQ } : {}), ...(category ? { category } : {}) });
  };

  const handleWishlistAdd = async (event, bookId) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      navigate("/login");
      return;
    }
    if (wishlistBusyId === bookId) {
      return;
    }

    setWishlistBusyId(bookId);
    setWishlistMessage("");
    try {
      await api.mypage.addWishlist(bookId);
      setWishlistMessage("\uCC1C \uBAA9\uB85D\uC5D0 \uCD94\uAC00\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
    } catch (err) {
      setWishlistMessage(err instanceof Error ? err.message : "\uCC1C \uCD94\uAC00\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      setWishlistBusyId(null);
    }
  };

  const isBestsellerView = category === BESTSELLER_CATEGORY;
  const isVirtualView = VIRTUAL_CATEGORIES.includes(category);
  const pageTitle = isBestsellerView ? BESTSELLER_CATEGORY : isVirtualView ? category : "Book Search";
  const pageDescription = isBestsellerView
    ? "\uC6B4\uC601\uC790\uAC00 \uC784\uC758 \uC9C0\uC815\uD55C \uBCA0\uC2A4\uD2B8\uC140\uB7EC \uB3C4\uC11C \uBAA9\uB85D\uC785\uB2C8\uB2E4."
    : isVirtualView
      ? `\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uB3C4\uC11C \uC911 '${category}' \uBD84\uB958\uB85C \uD45C\uC2DC\uD569\uB2C8\uB2E4.`
      : "Find books by keyword and category.";

  return (
    <PageLayout title={pageTitle} description={pageDescription} hideIntro>
      {isBestsellerView ? (
        <div className="mb-4 flex justify-end">
          <Link to="/books" className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
            {"\uC804\uCCB4 \uB3C4\uC11C \uBCF4\uAE30"}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mb-4 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 rounded-lg border px-3 py-2"
            placeholder="Title, author, publisher, ISBN"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border px-3 py-2">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-primary px-4 text-white">Search</button>
        </form>
      )}

      {q && !loading && (
        <p className="mb-3 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm" dangerouslySetInnerHTML={{ __html: `"${q}" 검색 결과 (${books.length}건)` }}></p>
      )}
      {wishlistMessage && <p className="mb-3 text-sm text-primary">{wishlistMessage}</p>}
      {hint && <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{hint}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading books...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && books.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {"\uC870\uAC74\uC5D0 \uB9DE\uB294 \uB3C4\uC11C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."}
        </div>
      )}

      {!loading && !error && books.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {books.map((b) => (
            <Link key={b.id} to={`/book/${b.id}`} className="group rounded-xl border bg-card p-3 transition-shadow hover:shadow-md">
              <div className="relative mb-2 aspect-[3/4] overflow-hidden rounded-lg bg-secondary/40">
                {b.coverImageUrl ? (
                  <img src={b.coverImageUrl} alt={b.title} className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-muted-foreground">No image</div>
                )}
                <button
                  type="button"
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm hover:bg-white disabled:opacity-60"
                  onClick={(event) => handleWishlistAdd(event, b.id)}
                  disabled={wishlistBusyId === b.id}
                >
                  <Heart size={14} />
                </button>
              </div>
              <p className="line-clamp-2 text-sm font-semibold">{b.title}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{b.author || "Unknown"}</p>
              <p className="text-sm font-bold text-price">{Number(b.price).toLocaleString()} KRW</p>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
