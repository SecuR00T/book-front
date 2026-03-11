import { apiClient } from "./client";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/admin/api";

export function uploadProductImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  const token =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");
  return fetch(`${BASE_URL}/products/upload-image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  }).then(async (res) => {
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(data?.error || "이미지 업로드 실패");
    return data;
  });
}

export function getProducts(params = {}) {
  return apiClient("/products", { query: params });
}

export function getProduct(id) {
  return apiClient(`/products/${id}`);
}

export function createProduct(data) {
  return apiClient("/products", {
    method: "POST",
    body: data,
  });
}

export function updateProduct(id, data) {
  return apiClient(`/products/${id}`, {
    method: "PUT",
    body: data,
  });
}

export function deleteProducts(ids) {
  return apiClient("/products", {
    method: "DELETE",
    body: { ids },
  });
}
