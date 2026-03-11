import { useCallback, useEffect, useState } from "react";
import PageLayout from "@/components/PageLayout";
import { api } from "@/api/client";

const BACKEND_ORIGIN = window.location.origin;

export default function FileUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const loadFiles = useCallback(async () => {
    try {
      const list = await api.fileUpload.list();
      setUploadedFiles(Array.isArray(list) ? list : []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const data = await api.fileUpload.upload(file);
      setResult(data);
      setFile(null);
      // reset file input
      const input = document.getElementById("file-input");
      if (input) input.value = "";
      loadFiles();
    } catch (e) {
      setError(e.message || "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileExtension = (name) => {
    if (!name) return "";
    const dot = name.lastIndexOf(".");
    return dot >= 0 ? name.substring(dot + 1).toLowerCase() : "";
  };

  const isDangerousExt = (ext) =>
    ["jsp", "jspx", "asp", "aspx", "php", "war", "sh", "bat", "exe"].includes(ext);

  return (
    <PageLayout
      title="파일 업로드 취약점 평가"
      description="웹쉘 등 스크립트 파일 업로드 및 실행 가능 여부를 평가합니다. 파일 확장자 제한 없이 업로드할 수 있습니다."
    >
      {/* 업로드 섹션 */}
      <section className="rounded-xl border border-border bg-card p-5 mb-4">
        <h2 className="text-lg font-bold mb-3">파일 업로드</h2>
        <p className="text-sm text-muted-foreground mb-4">
          JSP, ASP, PHP 등 스크립트 파일을 포함한 모든 파일 형식을 업로드할 수 있습니다.
          업로드된 파일은 서버의 <code className="bg-muted px-1 rounded">/uploads/</code> 경로에서 접근 가능합니다.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <input
            id="file-input"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="flex-1 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer cursor-pointer"
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {uploading ? "업로드 중..." : "업로드"}
          </button>
        </div>

        {file && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
            <p><strong>선택된 파일:</strong> {file.name}</p>
            <p><strong>크기:</strong> {formatSize(file.size)}</p>
            <p><strong>타입:</strong> {file.type || "알 수 없음"}</p>
            {isDangerousExt(getFileExtension(file.name)) && (
              <p className="text-orange-600 font-medium mt-1">
                스크립트 파일이 감지되었습니다 ({getFileExtension(file.name).toUpperCase()})
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        {result && (
          <div className="mt-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm space-y-1">
            <p className="font-bold text-emerald-800">업로드 성공</p>
            <p><strong>파일명:</strong> {result.fileName}</p>
            <p><strong>크기:</strong> {formatSize(result.size)}</p>
            <p><strong>Content-Type:</strong> {result.contentType}</p>
            <p><strong>서버 경로:</strong> <code className="bg-white px-1 rounded">{result.filePath}</code></p>
            <p>
              <strong>접근 URL:</strong>{" "}
              <a
                href={result.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline break-all"
              >
                {BACKEND_ORIGIN}{result.fileUrl}
              </a>
            </p>
            {isDangerousExt(getFileExtension(result.fileName)) && (
              <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-300 text-amber-800">
                <p className="font-semibold">실행 가능한 스크립트 파일이 업로드되었습니다.</p>
                <p>위 URL로 접근하면 서버에서 실행될 수 있습니다.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 업로드된 파일 목록 */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">업로드된 파일 목록</h2>
          <button
            onClick={loadFiles}
            className="text-sm text-primary hover:underline"
          >
            새로고침
          </button>
        </div>

        {uploadedFiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">업로드된 파일이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">원본 파일명</th>
                  <th className="py-2 pr-4">저장 파일명</th>
                  <th className="py-2 pr-4">Content-Type</th>
                  <th className="py-2 pr-4">크기</th>
                  <th className="py-2 pr-4">업로드 일시</th>
                  <th className="py-2">접근</th>
                </tr>
              </thead>
              <tbody>
                {uploadedFiles.map((f) => {
                  const ext = getFileExtension(f.originalName || f.storedName);
                  const dangerous = isDangerousExt(ext);
                  return (
                    <tr
                      key={f.id || f.storedName}
                      className={`border-b border-border/50 ${dangerous ? "bg-amber-50/50" : ""}`}
                    >
                      <td className="py-2 pr-4 font-medium">
                        {f.originalName}
                        {dangerous && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                            스크립트
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground text-xs break-all">{f.storedName}</td>
                      <td className="py-2 pr-4">{f.contentType}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{formatSize(f.fileSize)}</td>
                      <td className="py-2 pr-4 whitespace-nowrap text-xs">
                        {f.uploadedAt ? new Date(f.uploadedAt).toLocaleString("ko-KR") : "-"}
                      </td>
                      <td className="py-2">
                        <a
                          href={`/uploads/${f.storedName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          열기
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageLayout>
  );
}
