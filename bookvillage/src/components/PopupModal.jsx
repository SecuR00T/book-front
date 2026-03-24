import { useEffect, useState } from "react";
import { X, ChevronDown, Star } from "lucide-react";

const STORAGE_KEY = "popup_hidden_until";
const FILE_URL_PATTERN = /\.(apk|aab|zip|pdf|msi|exe|dmg)(?:$|[?#])/i;

function isSnoozed(popupId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${popupId}`);
    if (!raw) return false;
    return new Date(raw) > new Date();
  } catch {
    return false;
  }
}

function snoozeToday(popupId) {
  const tomorrow = new Date();
  tomorrow.setHours(23, 59, 59, 999);
  localStorage.setItem(`${STORAGE_KEY}_${popupId}`, tomorrow.toISOString());
}

function getBackendOrigin() {
  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return window.location.origin;
}

function resolvePopupUrl(linkUrl) {
  const baseUrl =
    linkUrl?.startsWith("/") && !linkUrl.startsWith("//")
      ? getBackendOrigin()
      : window.location.href;
  return new URL(linkUrl, baseUrl);
}

function isDownloadableUrl(linkUrl) {
  return FILE_URL_PATTERN.test(linkUrl || "");
}

function extractFilenameFromDisposition(header) {
  if (!header) return "";
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);

  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || "";
}

function extractFilenameFromUrl(url) {
  const segments = url.pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] || "download");
}

async function triggerFileDownload(linkUrl) {
  const resolvedUrl = resolvePopupUrl(linkUrl);

  if (resolvedUrl.origin !== window.location.origin) {
    window.location.assign(resolvedUrl.toString());
    return;
  }

  const res = await fetch(resolvedUrl.toString(), {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`download failed: ${res.status}`);
  }

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("text/html")) {
    window.location.assign(resolvedUrl.toString());
    return;
  }

  const blob = await res.blob();
  const filename =
    extractFilenameFromDisposition(res.headers.get("content-disposition")) ||
    extractFilenameFromUrl(resolvedUrl);

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export default function PopupModal() {
  const [popups, setPopups] = useState([]);
  const [index, setIndex] = useState(0);
  const [closed, setClosed] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobile()) return;
    fetch("/api/popups/active")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const visible = (data || []).filter((p) => !isSnoozed(p.id));
        setPopups(visible);
        if (visible.length > 0) {
          setTimeout(() => setVisible(true), 100);
        }
      })
      .catch(() => {});
  }, []);

  const popup = popups[index];

  if (!popup || closed) return null;

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      if (index + 1 < popups.length) {
        setIndex((i) => i + 1);
        setTimeout(() => setVisible(true), 100);
      } else {
        setClosed(true);
      }
    }, 300);
  };

  const handleSnooze = () => {
    snoozeToday(popup.id);
    handleClose();
  };

  const handleUpdate = async () => {
    if (!popup.linkUrl) return;

    if (!isDownloadableUrl(popup.linkUrl)) {
      window.open(popup.linkUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      await triggerFileDownload(popup.linkUrl);
    } catch (error) {
      console.error("Failed to download popup file", error);
      window.location.assign(resolvePopupUrl(popup.linkUrl).toString());
    }
  };

  // content에서 앱 정보 파싱 (선택적)
  // 형식: "앱이름|설명" 또는 그냥 설명 텍스트
  const parts = (popup.content || "").split("|");
  const appName = parts.length >= 2 ? parts[0].trim() : popup.title;
  const description = parts.length >= 2 ? parts[1].trim() : (popup.content || "이 앱을 사용하려면 최신 버전을 다운로드하세요. 업데이트를 다운로드하는 동안에도 계속해서 앱을 사용할 수 있습니다.");

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* 배경 딤 */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      {/* 바텀시트 */}
      <div
        className={`relative bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "85vh", overflowY: "auto" }}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          {/* 구글 플레이 로고 */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3.18 1.07C2.47 1.47 2 2.22 2 3.09v17.82c0 .87.47 1.62 1.18 2.02l.1.06 9.98-9.98v-.24L3.28 2.01l-.1.06z" fill="#4285F4"/>
            <path d="M16.26 16.27l-3.32-3.32v-.24l3.32-3.32.07.04 3.94 2.24c1.12.64 1.12 1.68 0 2.32l-3.94 2.24-.07.04z" fill="#FBBC04"/>
            <path d="M16.33 16.23L12.94 12.84 3.18 22.6c.37.39.94.42 1.59.05l11.56-6.42" fill="#34A853"/>
            <path d="M16.33 7.77L4.77 1.35C4.12.98 3.55 1.01 3.18 1.4l9.76 9.76 3.39-3.39z" fill="#EA4335"/>
          </svg>

          <div className="flex-1">
            <p className="text-[13px] text-gray-500 leading-tight">Google Play</p>
            <p className="text-[16px] font-bold text-gray-900 leading-tight">업데이트 가능</p>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* 설명 */}
        <p className="px-5 pb-4 text-[14px] text-gray-700 leading-relaxed">
          {description}
        </p>

        {/* 앱 카드 */}
        <div className="mx-4 mb-4 flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
          {/* 앱 아이콘 */}
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold text-center leading-tight px-1">
              {appName.slice(0, 2).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-gray-900 truncate">{appName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-0.5">
                <span className="text-[12px] text-gray-600">4.7</span>
                <Star size={11} className="text-gray-500 fill-gray-500" />
              </div>
              <span className="text-gray-300 text-xs">·</span>
              <span className="text-[12px] text-gray-600">6.3MB</span>
              <span className="text-gray-300 text-xs">·</span>
              <span className="text-[12px] text-gray-600">3세 이상</span>
            </div>
          </div>
        </div>

        {/* 새로운 기능 (접기/펼치기) */}
        <button
          className="w-full flex items-center justify-between px-5 py-3 border-t border-gray-100 text-left"
          onClick={() => setShowFeatures((v) => !v)}
        >
          <div>
            <p className="text-[14px] font-semibold text-gray-900">새로운 기능</p>
            <p className="text-[12px] text-gray-500">
              최종 업데이트:{" "}
              {popup.endDate
                ? new Date(popup.endDate).toLocaleDateString("ko-KR", { year: "numeric", month: "numeric", day: "numeric" })
                : "2026. 3. 13."}
            </p>
          </div>
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform duration-200 ${showFeatures ? "rotate-180" : ""}`}
          />
        </button>

        {showFeatures && (
          <div className="px-5 pb-4 text-[13px] text-gray-700 leading-relaxed border-t border-gray-100">
            <p className="pt-3">• 보안 업데이트 및 버그 수정</p>
            <p>• 성능 개선 및 안정성 향상</p>
          </div>
        )}

        {/* 버튼 영역 */}
        <div className="flex gap-3 px-4 py-4 border-t border-gray-100">
          <button
            onClick={handleSnooze}
            className="flex-1 py-2.5 rounded-full border border-blue-600 text-blue-600 text-[14px] font-semibold hover:bg-blue-50 transition-colors"
          >
            자세히 알아보기
          </button>
          <button
            onClick={handleUpdate}
            className="flex-1 py-2.5 rounded-full bg-blue-600 text-white text-[14px] font-semibold hover:bg-blue-700 transition-colors"
          >
            업데이트
          </button>
        </div>

        {/* 하단 안전 여백 */}
        <div className="h-2" />
      </div>
    </div>
  );
}
