import { apiClient } from "./client";

export function getPopups(params = {}) {
  return apiClient("/popups", { query: params });
}

export function getPopup(id) {
  return apiClient(`/popups/${id}`);
}

export function createPopup(data) {
  return apiClient("/popups", { method: "POST", body: data });
}

export function updatePopup(id, data) {
  return apiClient(`/popups/${id}`, { method: "PUT", body: data });
}

export function deletePopup(id) {
  return apiClient(`/popups/${id}`, { method: "DELETE" });
}

export async function uploadPopupImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  const BASE = import.meta.env.VITE_API_BASE_URL || "/admin/api";
  const res = await fetch(`${BASE}/popups/upload-image`, {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: { Authorization: `Bearer ${sessionStorage.getItem("admin_token") || ""}` },
  });
  if (!res.ok) throw new Error("이미지 업로드 실패");
  return res.json(); // { imageUrl: "/uploads/popups/..." }
}
