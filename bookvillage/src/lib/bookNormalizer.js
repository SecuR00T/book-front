import kyoboImageMap from "@/data/kyoboImageMap.json";

const extractRatingAndReviewCount = (description) => {
  if (!description) return {};

  const ratingMatch = description.match(/Rating=([0-9.]+)/i);
  const reviewMatch = description.match(/ReviewCount=([0-9]+)/i);

  const rating = ratingMatch ? Number(ratingMatch[1]) : undefined;
  const reviewCount = reviewMatch ? Number(reviewMatch[1]) : undefined;

  return {
    rating: Number.isFinite(rating) ? rating : undefined,
    reviewCount: Number.isFinite(reviewCount) ? reviewCount : undefined,
  };
};

const parseDescriptionMeta = (description) => {
  if (!description) return {};

  const meta = {};
  const pattern = /([A-Za-z_]+)\s*=\s*([^;]*)/g;
  let match;

  while ((match = pattern.exec(description)) !== null) {
    const key = String(match[1]).trim().toLowerCase().replace(/_/g, "");
    const value = String(match[2]).trim();
    if (key) {
      meta[key] = value;
    }
  }

  return meta;
};

const isMetadataDescription = (description) => {
  if (!description) return false;
  const keyValuePairs = description.match(/[A-Za-z_]+\s*=\s*[^;]*(?:;|$)/g) || [];
  if (keyValuePairs.length >= 2) return true;
  return /(?:publishdate|keyword|productid|rating|reviewcount)\s*=/i.test(description);
};

const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const toFiniteNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toOptionalFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

export const normalizeBook = (raw) => {
  if (!raw) return null;

  const idRaw = raw.id ?? raw.bookId ?? raw.book_id;
  const id = toFiniteNumber(idRaw, NaN);
  if (!Number.isFinite(id)) return null;

  const price = toFiniteNumber(raw.price, 0);
  const descriptionRaw = firstNonEmpty(raw.description);
  const descriptionMeta = parseDescriptionMeta(descriptionRaw);
  const extracted = extractRatingAndReviewCount(descriptionRaw);
  const description = isMetadataDescription(descriptionRaw) ? "" : descriptionRaw;
  const productId = firstNonEmpty(descriptionMeta.productid);

  const rating = toOptionalFiniteNumber(raw.rating) ?? extracted.rating;
  const reviewCount = toOptionalFiniteNumber(raw.reviewCount) ?? extracted.reviewCount;
  const sourceRating = toOptionalFiniteNumber(descriptionMeta.rating);
  const sourceReviewCount = toOptionalFiniteNumber(descriptionMeta.reviewcount);
  const localCoverImageUrl = productId ? kyoboImageMap[productId] || "" : "";
  // DB에 저장된 원본 전체 URL (SSRF image-proxy 전용)
  const dbCoverImageUrl = firstNonEmpty(raw.coverImageUrl, raw.cover_image_url, raw.imageUrl, raw.image_url) || null;

  return {
    id,
    isbn: firstNonEmpty(raw.isbn),
    title: firstNonEmpty(raw.title, raw.bookTitle, raw.name),
    author: firstNonEmpty(raw.author),
    publisher: firstNonEmpty(raw.publisher),
    category: firstNonEmpty(raw.category),
    price,
    stock: toFiniteNumber(raw.stock, 0),
    description,
    descriptionRaw,
    descriptionMeta,
    publishDate: descriptionMeta.publishdate || "",
    keyword: descriptionMeta.keyword || "",
    productId,
    sourceRating,
    sourceReviewCount,
    coverImageUrl: firstNonEmpty(localCoverImageUrl, raw.coverImageUrl, raw.cover_image_url, raw.imageUrl, raw.image_url) || null,
    dbCoverImageUrl,  // 서버 측 image-proxy(SSRF)에 전달할 원본 전체 URL
    rating,
    reviewCount,
  };
};

export const toCardBook = (raw) => {
  const book = normalizeBook(raw);
  if (!book) return null;

  const isEbook = book.category.toLowerCase().includes("ebook");
  const discount = isEbook ? 10 : 0;
  const originalPrice = discount > 0 ? Math.round(book.price / (1 - discount / 100)) : undefined;

  return {
    ...book,
    discount,
    originalPrice,
  };
};
