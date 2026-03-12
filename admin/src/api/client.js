const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/admin/api";
const TOKEN_KEY = "accessToken";
const USER_KEY = "authUser";
const NO_CACHE_HEADERS = {
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

function buildQueryString(query = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

async function parseResponse(response) {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (typeof payload === "object" && payload.message) return payload.message;
  return fallback;
}

export async function apiClient(endpoint, options = {}) {
  const { query, body, formData, headers, ...fetchOptions } = options;
  const token = getAccessToken();

  // formData가 있으면 Content-Type 헤더를 지정하지 않음 (브라우저가 boundary 포함하여 자동 설정)
  const mergedHeaders = {
    ...NO_CACHE_HEADERS,
    ...(body !== undefined && !formData ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers || {}),
  };

  const resolvedBody = formData !== undefined
    ? formData
    : body !== undefined
      ? JSON.stringify(body)
      : undefined;

  const response = await fetch(`${BASE_URL}${endpoint}${buildQueryString(query)}`, {
    ...fetchOptions,
    cache: "no-store",
    headers: mergedHeaders,
    body: resolvedBody,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthStorage();
      window.location.href = "/admin/login";
    }

    const fallbackMessage = `API Error: ${response.status}`;
    throw new Error(extractErrorMessage(payload, fallbackMessage));
  }

  return payload;
}
