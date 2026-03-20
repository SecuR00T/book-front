import { apiClient } from "./client";

export function getPayments(params = {}) {
  return apiClient("/payments", { query: params });
}

export function getPayment(id) {
  return apiClient(`/payments/${id}`);
}

export function cancelPayment(id) {
  return apiClient(`/payments/${id}/cancel`, { method: "POST" });
}
