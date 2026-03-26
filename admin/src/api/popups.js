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
  // apiClient의 formData 옵션 사용 → 토큰·헤더 자동 처리
  return apiClient("/popups/upload-image", {
    method: "POST",
    formData,
  });
}
