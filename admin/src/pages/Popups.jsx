import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPopups, createPopup, updatePopup, deletePopup, uploadPopupImage } from "@/api/popups";
import { PageHeader } from "@/components/common/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, X } from "lucide-react";

/* ── 색상 (Android Activity 동일) ── */
const C = {
  navy:      "#2F355F",
  amber:     "#F59E0B",
  amberBg:   "#FEF3C7",
  amberText: "#B45309",
  blueBg:    "#DBEAFE",
  blueText:  "#1D4ED8",
  red:       "#EF4444",
  border:    "#E5E5E5",
  bgPage:    "#F5F5F7",
  primary:   "#1A1A2E",
  sub:       "#6B7280",
  muted:     "#9CA3AF",
  badgeGray: "#E5E7EB",
};

const DEVICE_OPTIONS = [
  { value: "all",    label: "전체" },
  { value: "pc",     label: "PC" },
  { value: "mobile", label: "모바일" },
];

const today     = () => new Date().toISOString().slice(0, 10);
const nextMonth = () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10); };

const EMPTY_FORM = {
  title: "", content: "", linkUrl: "",
  startDate: today(), endDate: nextMonth(),
  isActive: true, deviceType: "all",
  popupType: "update", imageUrl: "",
};

/* ── 공통 컴포넌트 ── */

function Badge({ children, bg, color, border }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap"
      style={{
        backgroundColor: bg,
        color,
        border: border ? `1px solid ${C.border}` : undefined,
      }}
    >
      {children}
    </span>
  );
}

/* 섹션 구분선 (Android makeSectionHeader) */
function SectionHeader({ children }) {
  return (
    <div className="flex items-center gap-2 py-3 mt-1">
      <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
      <span className="text-[11px] font-bold tracking-widest uppercase whitespace-nowrap" style={{ color: C.muted }}>
        {children}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
    </div>
  );
}

function FormLabel({ children }) {
  return (
    <p className="text-sm font-bold mb-1.5" style={{ color: C.primary }}>
      {children}
    </p>
  );
}

function FormInput({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#2F355F]/30 ${className}`}
      style={{ borderColor: C.border, backgroundColor: "#fff", color: C.primary }}
      {...props}
    />
  );
}

function FormTextarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#2F355F]/30 resize-none ${className}`}
      style={{ borderColor: C.border, backgroundColor: "#fff", color: C.primary }}
      rows={3}
      {...props}
    />
  );
}

function FormSelect({ children, className = "", ...props }) {
  return (
    <select
      className={`w-full rounded-xl border px-3.5 h-12 text-sm outline-none ${className}`}
      style={{ borderColor: C.border, backgroundColor: "#fff", color: C.primary }}
      {...props}
    >
      {children}
    </select>
  );
}

/* ── 메인 페이지 ── */
export default function PopupsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterActive,  setFilterActive]  = useState("");
  const [filterDevice,  setFilterDevice]  = useState("");
  const [showForm,      setShowForm]      = useState(false);
  const [editId,        setEditId]        = useState(null);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [uploading,     setUploading]     = useState(false);
  const [imagePreview,  setImagePreview]  = useState("");

  const { data: popups = [], isLoading } = useQuery({
    queryKey: ["popups", filterKeyword, filterActive, filterDevice],
    queryFn: () => getPopups({
      keyword:    filterKeyword || undefined,
      active:     filterActive !== "" ? filterActive : undefined,
      deviceType: filterDevice || undefined,
    }),
  });

  const createMutation = useMutation({
    mutationFn: createPopup,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["popups"] }); toast({ title: "팝업이 등록되었습니다." }); closeForm(); },
    onError:   (e) => toast({ title: e.message, variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updatePopup(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["popups"] }); toast({ title: "팝업이 수정되었습니다." }); closeForm(); },
    onError:   (e) => toast({ title: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: deletePopup,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["popups"] }); toast({ title: "팝업이 삭제되었습니다." }); },
    onError:   (e) => toast({ title: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setImagePreview(""); setShowForm(true); };
  const openEdit   = (p) => {
    setEditId(p.id);
    setForm({
      title: p.title || "", content: p.content || "", linkUrl: p.linkUrl || "",
      startDate: p.startDate || today(), endDate: p.endDate || nextMonth(),
      isActive: p.isActive ?? true, deviceType: p.deviceType || "all",
      popupType: p.popupType || "update", imageUrl: p.imageUrl || "",
    });
    setImagePreview(p.imageUrl || "");
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); setImagePreview(""); };

  const handleImageFile = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "이미지는 5MB 이하만 가능합니다.", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    try {
      setUploading(true);
      const { imageUrl } = await uploadPopupImage(file);
      setForm((p) => ({ ...p, imageUrl }));
      toast({ title: "이미지 업로드 완료" });
    } catch { toast({ title: "이미지 업로드 실패", variant: "destructive" }); }
    finally  { setUploading(false); }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast({ title: "제목을 입력해 주세요.", variant: "destructive" }); return; }
    editId ? updateMutation.mutate({ id: editId, data: form }) : createMutation.mutate(form);
  };
  const onDelete = (p) => {
    if (!window.confirm(`"${p.title}" 팝업을 삭제하시겠습니까?`)) return;
    deleteMutation.mutate(p.id);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isAd      = form.popupType === "ad";

  return (
    <div className="space-y-4" style={{ backgroundColor: C.bgPage, minHeight: "100%" }}>
      <PageHeader title="팝업 관리" description="홈페이지 메인화면에 띄울 팝업을 관리하세요." />

      {/* ── 필터 카드 ── */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ backgroundColor: "#fff", border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        {/* 검색어 */}
        <div>
          <p className="text-[11px] mb-1" style={{ color: C.muted }}>검색어</p>
          <FormInput
            placeholder="팝업 제목 검색"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
          />
        </div>
        {/* 사용여부 + Device */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[11px] mb-1" style={{ color: C.muted }}>사용여부</p>
            <FormSelect value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
              <option value="">전체</option>
              <option value="true">사용</option>
              <option value="false">미사용</option>
            </FormSelect>
          </div>
          <div>
            <p className="text-[11px] mb-1" style={{ color: C.muted }}>Device</p>
            <FormSelect value={filterDevice} onChange={(e) => setFilterDevice(e.target.value)}>
              {DEVICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FormSelect>
          </div>
        </div>
        {/* 버튼 */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["popups"] })}
            className="h-10 px-4 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: C.navy }}
          >
            검색
          </button>
          <button
            onClick={openCreate}
            className="h-10 px-4 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: C.navy }}
          >
            + 새 팝업 등록
          </button>
        </div>
      </div>

      {/* ── 팝업 카드 리스트 ── */}
      {isLoading ? (
        <p className="text-center py-12 text-sm" style={{ color: C.muted }}>불러오는 중...</p>
      ) : popups.length === 0 ? (
        <p className="text-center py-12 text-sm" style={{ color: C.muted }}>등록된 팝업이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {popups.map((popup) => {
            const isAdCard = popup.popupType === "ad";
            return (
              <div
                key={popup.id}
                className="rounded-2xl p-4 space-y-2"
                style={{ backgroundColor: "#fff", border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              >
                {/* 상단: 타입 배지 + 제목 + 사용여부 */}
                <div className="flex items-center gap-2">
                  <Badge
                    bg={isAdCard ? C.amberBg : C.blueBg}
                    color={isAdCard ? C.amberText : C.blueText}
                  >
                    {isAdCard ? "광고" : "업데이트"}
                  </Badge>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {popup.imageUrl && (
                      <img src={popup.imageUrl} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0 border" style={{ borderColor: C.border }} />
                    )}
                    <span className="font-bold text-sm truncate" style={{ color: C.primary }}>{popup.title}</span>
                  </div>
                  <Badge
                    bg={popup.isActive ? C.navy : C.badgeGray}
                    color={popup.isActive ? "#fff" : C.sub}
                  >
                    {popup.isActive ? "사용" : "미사용"}
                  </Badge>
                </div>

                {/* 중단: 날짜 + 디바이스 */}
                <div className="flex items-center gap-3">
                  <span className="text-xs flex-1" style={{ color: C.sub }}>
                    📅 {popup.startDate} ~ {popup.endDate}
                  </span>
                  <Badge bg="transparent" color={C.muted} border>
                    {popup.deviceType || "all"}
                  </Badge>
                </div>

                {/* 하단: 등록일 + 버튼 */}
                <div
                  className="flex items-center pt-2"
                  style={{ borderTop: `1px solid ${C.border}` }}
                >
                  <span className="flex-1 text-xs" style={{ color: C.muted }}>
                    등록: {popup.createdAt ? popup.createdAt.slice(0, 10) : "-"}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(popup)}
                      className="h-8 px-3 rounded-xl text-xs font-semibold border"
                      style={{ borderColor: C.border, color: C.primary, backgroundColor: "#fff" }}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => onDelete(popup)}
                      disabled={deleteMutation.isPending}
                      className="h-8 px-3 rounded-xl text-xs font-semibold text-white"
                      style={{ backgroundColor: C.red }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 등록/수정 폼 오버레이 ── */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          {/* 배경 딤 */}
          <div className="absolute inset-0" onClick={closeForm} />

          {/* 폼 패널 */}
          <div
            className="relative w-full flex flex-col"
            style={{
              backgroundColor: "#fff",
              borderRadius: "20px 20px 0 0",
              maxHeight: "92vh",
              overflowX: "hidden",
            }}
          >
            {/* 헤더 */}
            <div
              className="flex items-center px-5 py-4 flex-shrink-0"
              style={{ borderBottom: `1px solid ${C.border}` }}
            >
              <p className="flex-1 text-base font-bold" style={{ color: C.navy }}>
                {editId ? "팝업 수정" : "새 팝업 등록"}
              </p>
              <button
                onClick={closeForm}
                className="w-9 h-9 flex items-center justify-center rounded-full"
                style={{ color: C.muted }}
              >
                <X size={20} />
              </button>
            </div>

            {/* 폼 바디 */}
            <form onSubmit={onSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4" style={{ overflowX: "hidden" }}>

                {/* ── 기본 정보 ── */}
                <SectionHeader>기본 정보</SectionHeader>

                {/* 팝업 타입 토글 (Android 동일: 가로 2버튼) */}
                <FormLabel>팝업 타입 *</FormLabel>
                <div className="flex gap-2 mb-4" style={{ width: "100%" }}>
                  {[
                    { value: "update", emoji: "📦", label: "업데이트 공지" },
                    { value: "ad",     emoji: "📢", label: "광고 배너" },
                  ].map((o) => {
                    const selected = form.popupType === o.value;
                    const isAdBtn  = o.value === "ad";
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, popupType: o.value }))}
                        className="h-12 rounded-xl text-sm font-bold transition-all"
                        style={{
                          flex: "1 1 0",
                          minWidth: 0,
                          overflow: "hidden",
                          backgroundColor: selected
                            ? (isAdBtn ? C.amber : C.navy)
                            : "#fff",
                          color: selected ? "#fff" : C.sub,
                          border: `1px solid ${selected ? (isAdBtn ? C.amber : C.navy) : C.border}`,
                        }}
                      >
                        {o.emoji} {o.label}
                      </button>
                    );
                  })}
                </div>

                {/* 제목 */}
                <FormLabel>제목 *</FormLabel>
                <FormInput
                  placeholder="팝업 제목을 입력하세요"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  maxLength={200}
                  className="mb-4"
                />

                {/* 내용 */}
                <FormLabel>내용</FormLabel>
                <FormTextarea
                  placeholder={
                    isAd
                      ? "광고 내용을 입력하세요"
                      : "앱이름|업데이트 설명  예: 북촌|보안 업데이트"
                  }
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  className="mb-2"
                />
                {!isAd && (
                  <div
                    className="rounded-xl px-3 py-2 mb-4 text-xs"
                    style={{ backgroundColor: C.blueBg, color: C.blueText }}
                  >
                    앱이름|설명 형식으로 입력하면 앱카드에 이름이 표시됩니다.
                  </div>
                )}

                {/* ── 미디어 & 링크 ── */}
                <SectionHeader>미디어 & 링크</SectionHeader>

                {/* 이미지 업로드 */}
                <FormLabel>이미지</FormLabel>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageFile(e.target.files?.[0])}
                />
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border mb-4" style={{ borderColor: C.border }}>
                    <img src={imagePreview} alt="preview" className="w-full object-cover" style={{ maxHeight: 160 }} />
                    <button
                      type="button"
                      onClick={() => { setImagePreview(""); setForm((p) => ({ ...p, imageUrl: "" })); }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "#fff" }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-5 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 mb-4"
                    style={{ borderColor: C.border, color: C.muted }}
                  >
                    <ImagePlus size={24} />
                    <span className="text-sm font-semibold">{uploading ? "업로드 중..." : "탭하여 이미지 업로드"}</span>
                    <span className="text-xs">최대 5MB · JPG / PNG</span>
                  </button>
                )}

                {/* 링크 URL */}
                <FormLabel>링크 URL</FormLabel>
                <FormInput
                  placeholder={isAd ? "https://example.com" : "APK 다운로드 경로"}
                  value={form.linkUrl}
                  onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))}
                  className="mb-4"
                />

                {/* ── 일정 & 설정 ── */}
                <SectionHeader>일정 & 설정</SectionHeader>

                {/* 날짜 */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <FormLabel>시작일 *</FormLabel>
                    <FormInput
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <FormLabel>종료일 *</FormLabel>
                    <FormInput
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                {/* 디바이스 + 사용여부 */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <FormLabel>Device 타입</FormLabel>
                    <FormSelect
                      value={form.deviceType}
                      onChange={(e) => setForm((p) => ({ ...p, deviceType: e.target.value }))}
                    >
                      {DEVICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </FormSelect>
                  </div>
                  <div>
                    <FormLabel>사용여부</FormLabel>
                    <label
                      className="flex items-center gap-2.5 h-12 px-3 rounded-xl border cursor-pointer"
                      style={{ borderColor: C.border }}
                    >
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                        className="h-4 w-4"
                        style={{ accentColor: C.navy }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: form.isActive ? C.navy : C.muted }}
                      >
                        {form.isActive ? "사용" : "미사용"}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="h-2" />
              </div>

              {/* 하단 버튼 고정 (sticky footer) */}
              <div
                className="flex-shrink-0 flex gap-2 px-5 py-4"
                style={{ borderTop: `1px solid ${C.border}`, backgroundColor: "#fff" }}
              >
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 h-12 rounded-xl text-sm font-bold border"
                  style={{ borderColor: C.border, color: C.primary, backgroundColor: "#fff" }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isPending || uploading}
                  className="h-12 rounded-xl text-sm font-bold text-white"
                  style={{ flex: 2, backgroundColor: C.navy, opacity: (isPending || uploading) ? 0.6 : 1 }}
                >
                  {isPending ? "저장 중..." : editId ? "수정 완료" : "등록"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
