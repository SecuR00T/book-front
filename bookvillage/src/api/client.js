const API_BASE = "/api";
const notifyAuthChanged = () => window.dispatchEvent(new Event("bookvillage-auth-changed"));
const decodeEscapedUnicode = (value) =>
  typeof value === "string"
    ? value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    : value;
const decodeEscapedUnicodeDeep = (value) => {
  if (typeof value === "string") {
    return decodeEscapedUnicode(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => decodeEscapedUnicodeDeep(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decodeEscapedUnicodeDeep(v)]));
  }
  return value;
};

const getAuthHeader = () => {
  // 세션 토큰이 있으면 X-Session-Token 헤더로 전송 (쿠키와 중복 전송)
  const token = sessionStorage.getItem("bookvillage_session_token");
  return token ? { "X-Session-Token": token } : {};
};

const TRANSIENT_STATUS = new Set([502, 503, 504]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const STATUS_MESSAGE = {
  400: "요청 형식이 올바르지 않습니다. 입력값을 확인해 주세요.",
  401: "로그인이 만료되었습니다. 다시 로그인해 주세요.",
  403: "접근 권한이 없습니다.",
  404: "요청한 정보를 찾을 수 없습니다.",
  409: "요청이 현재 상태와 충돌합니다. 새로고침 후 다시 시도해 주세요.",
  422: "입력값을 다시 확인해 주세요.",
  429: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  500: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  502: "서버 연결이 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.",
  503: "서버 연결이 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.",
  504: "서버 연결이 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.",
};

export class ApiError extends Error {
  constructor(message, { status = 0, details = null, retryable = false } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.retryable = retryable;
  }
}

const parseErrorPayload = async (res) => {
  const text = await res.text();
  if (!text) return null;

  try {
    return decodeEscapedUnicodeDeep(JSON.parse(text));
  } catch (_e) {
    return { message: decodeEscapedUnicode(text) };
  }
};

const extractMessageFromPayload = (payload) => {
  if (!payload) return "";
  if (typeof payload === "string") return decodeEscapedUnicode(payload).trim();
  if (typeof payload?.message === "string") return decodeEscapedUnicode(payload.message).trim();
  if (typeof payload?.error === "string") return decodeEscapedUnicode(payload.error).trim();
  return "";
};

const statusMessage = (status) => STATUS_MESSAGE[status] || "요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

const clearAuthSession = () => {
  sessionStorage.removeItem("bookvillage_session_token");
  sessionStorage.removeItem("bookvillage_user");
  notifyAuthChanged();
};

const parseSuccessPayload = (text) => {
  if (!text) return null;
  try {
    return decodeEscapedUnicodeDeep(JSON.parse(text));
  } catch (_e) {
    return decodeEscapedUnicode(text);
  }
};

async function request(url, options = {}) {
  const headers = {
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const method = (options.method || "GET").toUpperCase();
  let res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (method === "GET" && TRANSIENT_STATUS.has(res.status)) {
    await sleep(700);
    res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  }

  if (res.status === 401) {
    clearAuthSession();
    throw new ApiError(statusMessage(401), { status: 401, retryable: false });
  }

  if (!res.ok) {
    const payload = await parseErrorPayload(res);
    const payloadMessage = extractMessageFromPayload(payload);
    const message = payloadMessage || statusMessage(res.status);
    throw new ApiError(message, {
      status: res.status,
      details: payload,
      retryable: TRANSIENT_STATUS.has(res.status),
    });
  }

  const text = await res.text();
  return parseSuccessPayload(text);
}

export const api = {
  auth: {
    register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    logout: () => request("/auth/logout", { method: "POST" }),
    findEmail: (name, email) => request("/auth/find-id", { method: "POST", body: JSON.stringify({ name, email }) }),
    findId: (name, email) => request("/auth/find-id", { method: "POST", body: JSON.stringify({ name, email }) }),
    searchAddress: (q) => request(`/auth/address-search?q=${encodeURIComponent(q)}`),
    requestPasswordReset: (email) => request("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) }),
    confirmPasswordReset: (email, token, newPassword, userId) =>
      request("/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ email, token, newPassword, ...(userId ? { userId } : {}) }),
      }),
  },
  users: {
    get: (userId) => request(`/users/${userId}`),
    getProfileByUserId: (userId) => request(`/profile?user_id=${encodeURIComponent(userId)}`),
    update: (userId, data) => request(`/users/${userId}`, { method: "PUT", body: JSON.stringify(data) }),
    getOrders: (userId) => request(`/users/${userId}/orders`),
    searchAddress: (q) => request(`/users/me/address-search?q=${encodeURIComponent(q)}`),
    changePassword: (currentPassword, newPassword) =>
      request("/users/me/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }),
    deleteMe: (userId, password) =>
      request(`/users/delete?user_id=${encodeURIComponent(userId)}`, { method: "DELETE", body: JSON.stringify({ password }) }),
  },
  books: {
    search: (q, category) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      return request(`/books/search?${params.toString()}`);
    },
    getCategories: () => request("/books/categories"),
    get: (bookId) => request(`/books/${bookId}`),
    shippingInfo: (bookId, zipcode) => request(`/books/${bookId}/shipping-info${zipcode ? `?zipcode=${encodeURIComponent(zipcode)}` : ""}`),
    preview: (bookId, filePath) => request(`/books/${bookId}/preview${filePath ? `?filePath=${encodeURIComponent(filePath)}` : ""}`),
  },
  cart: {
    list: () => request("/cart"),
    add: (bookId, quantity, price) =>
      request("/cart", { method: "POST", body: JSON.stringify({ bookId, quantity, ...(price !== undefined ? { price } : {}) }) }),
    update: (cartItemId, quantity) => request(`/cart/${cartItemId}`, { method: "PUT", body: JSON.stringify({ quantity }) }),
    remove: (cartItemId) => request(`/cart/${cartItemId}`, { method: "DELETE" }),
    clear: () => request("/cart", { method: "DELETE" }),
  },
  orders: {
    list: () => request("/orders"),
    get: (orderId) => request(`/orders/${orderId}`),
    checkout: (payload) => request("/orders/checkout", { method: "POST", body: JSON.stringify(payload) }),
    lookup: (orderNumber) => request(`/orders/lookup?orderNumber=${encodeURIComponent(orderNumber)}`),
    track: (orderId, trackingUrl) => request(`/orders/${orderId}/tracking?trackingUrl=${encodeURIComponent(trackingUrl)}`),
    downloadReceipt: async (file) => {
      const res = await fetch(`${API_BASE}/download?file=${encodeURIComponent(file)}`, {
        headers: { ...getAuthHeader() },
      });
      if (res.status === 401) {
        clearAuthSession();
        throw new ApiError(statusMessage(401), { status: 401 });
      }
      if (!res.ok) throw new ApiError("영수증 다운로드에 실패했습니다.", { status: res.status });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.split("/").pop() || "receipt.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  },
  reviews: {
    listByBook: (bookId) => request(`/books/${bookId}/reviews`),
    create: (bookId, data) => request(`/books/${bookId}/reviews`, { method: "POST", body: JSON.stringify(data) }),
    uploadImage: (reviewId, file) => {
      const fd = new FormData();
      fd.append("file", file);
      return request(`/reviews/${reviewId}/upload`, { method: "POST", body: fd });
    },
    like: (reviewId) => request(`/reviews/${reviewId}/like`, { method: "POST" }),
    report: (reviewId, reason) => request(`/reviews/${reviewId}/report`, { method: "POST", body: JSON.stringify({ reason }) }),
    delete: (reviewId, csrfToken) => request(`/reviews/${reviewId}`, { method: "DELETE", headers: { "X-CSRF-TOKEN": csrfToken } }),
  },
  board: {
    list: (q, myOnly = false, sort = "latest", page = 0, size = 10) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (myOnly) params.set("myOnly", "true");
      params.set("sort", sort === "popular" ? "popular" : "latest");
      params.set("page", String(page));
      params.set("size", String(size));
      const query = params.toString();
      return request(`/board/posts${query ? `?${query}` : ""}`);
    },
    get: (postId) => request(`/board/posts/${postId}`),
    create: (data) => request("/board/posts", { method: "POST", body: JSON.stringify(data) }),
    update: (postId, data) => request(`/board/posts/${postId}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (postId) => request(`/board/posts/${postId}`, { method: "DELETE" }),
    listComments: (postId, sort = "latest", page = 0, size = 10) =>
      request(
        `/board/posts/${postId}/comments?sort=${encodeURIComponent(sort === "oldest" ? "oldest" : "latest")}&page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`,
      ),
    createComment: (postId, content) => request(`/board/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ content }) }),
    updateComment: (commentId, content) => request(`/board/comments/${commentId}`, { method: "PUT", body: JSON.stringify({ content }) }),
    deleteComment: (commentId) => request(`/board/comments/${commentId}`, { method: "DELETE" }),
    listAttachments: (postId) => request(`/board/posts/${postId}/attachments`),
    uploadAttachment: (postId, file) => {
      const fd = new FormData();
      fd.append("file", file);
      return request(`/board/posts/${postId}/attachments`, { method: "POST", body: fd });
    },
    deleteAttachment: (postId, attachmentId) => request(`/board/posts/${postId}/attachments/${attachmentId}`, { method: "DELETE" }),
    fetchAttachmentBlob: async (attachmentId, fallbackName = "attachment") => {
      const res = await fetch(`${API_BASE}/board/attachments/${encodeURIComponent(attachmentId)}/download`, {
        headers: {
          ...getAuthHeader(),
        },
      });
      if (res.status === 401) {
        clearAuthSession();
        throw new ApiError(statusMessage(401), { status: 401 });
      }
      if (!res.ok) {
        throw new ApiError("첨부파일 다운로드에 실패했습니다.", { status: res.status });
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition") || "";
      const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      const filename = match?.[1] ? decodeURIComponent(match[1]) : fallbackName;
      const contentType = res.headers.get("content-type") || blob.type || "application/octet-stream";

      return { blob, filename, contentType };
    },

    downloadAttachment: async (attachmentId, fallbackName = "attachment") => {
      const { blob, filename } = await api.board.fetchAttachmentBlob(attachmentId, fallbackName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },

    previewAttachment: (attachmentId, fallbackName = "attachment") =>
      api.board.fetchAttachmentBlob(attachmentId, fallbackName),
  },
  support: {
    notices: (q) => request(`/notices${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    notice: (noticeId) => request(`/notices/${noticeId}`),
    faqs: (category) => request(`/faqs${category ? `?category=${encodeURIComponent(category)}` : ""}`),
    uploadInquiryAttachment: (inquiryId, file) => {
      const fd = new FormData();
      fd.append("file", file);
      return request(`/customer-service/${inquiryId}/attachments`, { method: "POST", body: fd });
    },
  },
  mypage: {
    summary: () => request("/mypage/summary"),
    recentViews: () => request("/mypage/recent-views"),
    wishlist: () => request("/mypage/wishlist"),
    myReviews: () => request("/mypage/reviews"),
    updateReview: (reviewId, data) => request(`/mypage/reviews/${reviewId}`, { method: "PUT", body: JSON.stringify(data) }),
    addWishlist: (bookId) => request("/mypage/wishlist", { method: "POST", body: JSON.stringify({ bookId }) }),
    removeWishlist: (wishlistId) => request(`/mypage/wishlist/${wishlistId}`, { method: "DELETE" }),
    wallet: () => request("/mypage/wallet"),
    cancelOrder: (orderId, reason) => request(`/mypage/orders/${orderId}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }),
    returnOrder: (orderId, reason, proofFileName) =>
      request(`/mypage/orders/${orderId}/return`, { method: "POST", body: JSON.stringify({ reason, proofFileName }) }),
    exchangeOrder: (orderId, reason, proofFileName) =>
      request(`/mypage/orders/${orderId}/exchange`, { method: "POST", body: JSON.stringify({ reason, proofFileName }) }),
    favoritePosts: (includePrivate = false) => request(`/mypage/favorite-posts?includePrivate=${includePrivate}`),
    deleteFavoritePost: (postId) => request(`/mypage/favorite-posts/${postId}`, { method: "DELETE" }),
    deleteReview: (reviewId, csrfToken) => request(`/mypage/reviews/${reviewId}`, { method: "DELETE", headers: { "X-CSRF-TOKEN": csrfToken } }),
  },
  security: {
    requirements: () => request("/labs/requirements"),
    simulate: (reqId, input, metadata) => request(`/labs/${reqId}/simulate`, { method: "POST", body: JSON.stringify({ input, metadata }) }),
  },
  fileUpload: {
    upload: (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: { ...getAuthHeader() },
        body: fd,
      }).then(async (res) => {
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok) throw new ApiError(data?.error || "업로드 실패", { status: res.status });
        return data;
      });
    },
    list: () => request("/community/attachments"),
    communityUpload: (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return request("/community/attachments", { method: "POST", body: fd });
    },
  },
  integration: {
    linkPreview: (url) => request("/integration/link-preview", { method: "POST", body: JSON.stringify({ url }) }),
  },
  customerService: {
    list: () => request("/customer-service"),
    create: (data) => request("/customer-service", { method: "POST", body: JSON.stringify(data) }),
  },
};




