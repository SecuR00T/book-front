import { apiClient } from "./client";

export function createNotice(data) {
  // 파일이 포함된 경우 multipart/form-data로 전송
  if (data.file) {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("content", data.content);
    formData.append("file", data.file);
    return apiClient("/notices", {
      method: "POST",
      formData,
    });
  }
  return apiClient("/notices", {
    method: "POST",
    body: data,
  });
}
