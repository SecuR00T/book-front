import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "popup_hidden_until";

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

export default function PopupModal() {
  const [popups, setPopups] = useState([]);
  const [index, setIndex] = useState(0);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    fetch("/api/popups/active")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const visible = (data || []).filter((p) => !isSnoozed(p.id));
        setPopups(visible);
      })
      .catch(() => {});
  }, []);

  const popup = popups[index];

  if (!popup || closed) return null;

  const handleClose = () => {
    if (index + 1 < popups.length) {
      setIndex((i) => i + 1);
    } else {
      setClosed(true);
    }
  };

  const handleSnooze = () => {
    snoozeToday(popup.id);
    handleClose();
  };

  const handleClick = () => {
    if (popup.linkUrl) {
      window.open(popup.linkUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl bg-white">
        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
          <X size={16} />
        </button>

        {/* 팝업 내용 */}
        <div
          className={`p-6 pb-4 ${popup.linkUrl ? "cursor-pointer" : ""}`}
          onClick={popup.linkUrl ? handleClick : undefined}
        >
          <h2 className="text-lg font-bold text-gray-900 pr-8">{popup.title}</h2>
          {popup.content && (
            <p className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {popup.content}
            </p>
          )}
          {popup.linkUrl && (
            <p className="mt-3 text-xs font-semibold text-amber-700 underline underline-offset-2">
              자세히 보기 →
            </p>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex border-t border-gray-100">
          <button
            onClick={handleSnooze}
            className="flex-1 py-3 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
          >
            오늘 하루 보지 않기
          </button>
          <div className="w-px bg-gray-100" />
          <button
            onClick={handleClose}
            className="flex-1 py-3 text-xs font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
