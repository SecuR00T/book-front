import { apiClient } from "./client";

export function loginApi(username, password) {
  return apiClient("/auth/login", {
    method: "POST",
    body: { username, password },
  });
}

export function sessionLoginApi(sessionToken) {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/admin/api";
  return fetch(`${BASE_URL}/auth/session-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken }),
  }).then(async (res) => {
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
    return data;
  });
}

export function changePasswordApi(currentPassword, newPassword) {
  return apiClient("/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}
