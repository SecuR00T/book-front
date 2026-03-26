import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPopups, createPopup, updatePopup, deletePopup, uploadPopupImage } from "@/api/popups";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, ImagePlus } from "lucide-react";

const DEVICE_OPTIONS = [
  { value: "all",    label: "전체" },
  { value: "pc",     label: "PC" },
  { value: "mobile", label: "모바일" },
];

const POPUP_TYPE_OPTIONS = [
  { value: "update", label: "업데이트 공지" },
  { value: "ad",     label: "광고 배너" },
];

const today     = () => new Date().toISOString().slice(0, 10);
const nextMonth = () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10); };

const EMPTY_FORM = {
  title: "", content: "", linkUrl: "",
  startDate: today(), endDate: nextMonth(),
  isActive: true, deviceType: "all",
  popupType: "update", imageUrl: "",
};

const selectCls =
  "w-full h-11 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const TYPE_BADGE = {
  update: "bg-blue-100 text-blue-700",
  ad:     "bg-amber-100 text-amber-700",
};
const TYPE_LABEL = { update: "업데이트", ad: "광고" };

export default function PopupsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterActive,  setFilterActive]  = useState("");
  const [filterDevice,  setFilterDevice]  = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

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
    onError: (e) => toast({ title: e.message, variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updatePopup(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["popups"] }); toast({ title: "팝업이 수정되었습니다." }); closeForm(); },
    onError: (e) => toast({ title: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: deletePopup,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["popups"] }); toast({ title: "팝업이 삭제되었습니다." }); },
    onError: (e) => toast({ title: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setImagePreview("");
    setShowForm(true);
  };
  const openEdit = (p) => {
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
  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setImagePreview("");
  };

  const handleImageFile = async (file) => {
    if (!file) return;
    const maxMB = 5;
    if (file.size > maxMB * 1024 * 1024) {
      toast({ title: `이미지는 ${maxMB}MB 이하만 가능합니다.`, variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    try {
      setUploading(true);
      const { imageUrl } = await uploadPopupImage(file);
      setForm((p) => ({ ...p, imageUrl }));
      toast({ title: "이미지 업로드 완료" });
    } catch {
      toast({ title: "이미지 업로드 실패", variant: "destructive" });
    } finally {
      setUploading(false);
    }
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

  /* ── 섹션 제목 ── */
  const SectionTitle = ({ children }) => (
    <div className="flex items-center gap-2 pt-3 pb-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase whitespace-nowrap">{children}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="팝업 관리" description="홈페이지 메인화면에 띄울 팝업을 관리하세요." />

      {/* ── 필터 카드 ── */}
      <Card className="shadow-sm">
        <CardContent className="pt-4 pb-4">
          {/* 검색어 */}
          <div className="space-y-1 mb-3">
            <Label className="text-xs text-muted-foreground">검색어</Label>
            <Input
              placeholder="팝업 제목 검색"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
            />
          </div>
          {/* 사용여부 + Device */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">사용여부</Label>
              <select className={selectCls} value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
                <option value="">전체</option>
                <option value="true">사용</option>
                <option value="false">미사용</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Device</Label>
              <select className={selectCls} value={filterDevice} onChange={(e) => setFilterDevice(e.target.value)}>
                {DEVICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {/* 새 팝업 등록 버튼 */}
          <Button onClick={openCreate} className="w-full bg-[#2f355f] hover:bg-[#23284b] text-white h-11">
            <Plus className="mr-1.5 h-4 w-4" /> 새 팝업 등록
          </Button>
        </CardContent>
      </Card>

      {/* ── 목록: 모바일 카드 / 데스크탑 테이블 ── */}

      {/* 모바일 카드 리스트 (sm 미만) */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-10 text-sm">불러오는 중...</p>
        ) : popups.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">등록된 팝업이 없습니다.</p>
        ) : popups.map((popup) => (
          <Card key={popup.id} className="shadow-sm">
            <CardContent className="p-4 space-y-3">
              {/* 상단: 타입배지 + 제목 + 사용여부 */}
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold flex-shrink-0 ${TYPE_BADGE[popup.popupType] || TYPE_BADGE.update}`}>
                  {TYPE_LABEL[popup.popupType] || "업데이트"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {popup.imageUrl && (
                      <img src={popup.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border" />
                    )}
                    <p className="font-semibold text-sm truncate">{popup.title}</p>
                  </div>
                </div>
                <span className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold flex-shrink-0 ${popup.isActive ? "bg-[#2f355f] text-white" : "bg-muted text-muted-foreground"}`}>
                  {popup.isActive ? "사용" : "미사용"}
                </span>
              </div>

              {/* 중단: 날짜 + Device */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>📅 {popup.startDate} ~ {popup.endDate}</span>
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                  {popup.deviceType || "all"}
                </span>
              </div>

              {/* 하단: 등록일 + 버튼 */}
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  등록: {popup.createdAt ? popup.createdAt.slice(0, 10) : "-"}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => openEdit(popup)}>
                    <Pencil className="h-3 w-3 mr-1" />수정
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8 px-3 text-xs" onClick={() => onDelete(popup)} disabled={deleteMutation.isPending}>
                    <Trash2 className="h-3 w-3 mr-1" />삭제
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 데스크탑 테이블 (sm 이상) */}
      <Card className="shadow-sm hidden sm:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-[#f8f7f4] text-[#5c4a32]">
                  {["순번","타입","팝업제목","시작일","종료일","사용여부","Device","등록일","관리"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap text-xs tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">불러오는 중...</td></tr>
                ) : popups.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">등록된 팝업이 없습니다.</td></tr>
                ) : popups.map((popup, idx) => (
                  <tr key={popup.id} className="border-b last:border-0 hover:bg-[#faf9f7] transition-colors">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{popups.length - idx}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_BADGE[popup.popupType] || TYPE_BADGE.update}`}>
                        {TYPE_LABEL[popup.popupType] || "업데이트"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[160px]">
                      <div className="flex items-center gap-2">
                        {popup.imageUrl && (
                          <img src={popup.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border" />
                        )}
                        <span className="block truncate">{popup.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{popup.startDate}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{popup.endDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${popup.isActive ? "bg-[#2f355f] text-white" : "bg-muted text-muted-foreground"}`}>
                        {popup.isActive ? "사용" : "미사용"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
                        {popup.deviceType || "all"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {popup.createdAt ? popup.createdAt.slice(0, 10) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openEdit(popup)}>
                          <Pencil className="h-3 w-3 mr-1" />수정
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => onDelete(popup)} disabled={deleteMutation.isPending}>
                          <Trash2 className="h-3 w-3 mr-1" />삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── 등록/수정 모달 ── */}
      {showForm && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* 배경 딤 클릭 시 닫기 */}
          <div className="absolute inset-0" onClick={closeForm} />

          <div
            className="relative w-full bg-white rounded-t-2xl shadow-2xl flex flex-col"
            style={{ maxHeight: "92vh" }}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
              <h2 className="text-base font-semibold text-[#2f355f]">
                {editId ? "팝업 수정" : "새 팝업 등록"}
              </h2>
              <button
                onClick={closeForm}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* 모달 바디 */}
            <form onSubmit={onSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">

                {/* ── 기본 정보 ── */}
                <SectionTitle>기본 정보</SectionTitle>

                {/* 팝업 타입 — 세로 배치로 버튼 잘림 방지 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    팝업 타입 <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-col gap-2">
                    {POPUP_TYPE_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, popupType: o.value }))}
                        className={`w-full py-3 rounded-xl border text-sm font-semibold transition-all text-center ${
                          form.popupType === o.value
                            ? o.value === "ad"
                              ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200"
                              : "bg-[#2f355f] text-white border-[#2f355f] shadow-md shadow-indigo-200"
                            : "border-input text-muted-foreground bg-white"
                        }`}
                      >
                        {o.value === "update" ? "📦 " : "📢 "}{o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 제목 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">제목 <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="팝업 제목을 입력하세요"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    maxLength={200}
                    className="h-11"
                  />
                </div>

                {/* 내용 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">내용</Label>
                  <Textarea
                    placeholder={
                      form.popupType === "ad"
                        ? "광고 내용을 입력하세요"
                        : "앱이름|업데이트 설명\n예: 북촌|보안 업데이트가 포함되어 있습니다"
                    }
                    value={form.content}
                    onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                    rows={3}
                    className="resize-none text-sm"
                  />
                  {form.popupType === "update" && (
                    <p className="text-xs bg-blue-50 text-blue-600 rounded-lg px-3 py-2">
                      앱이름|설명 형식으로 입력하면 앱카드에 이름이 표시됩니다.
                    </p>
                  )}
                </div>

                {/* ── 미디어 & 링크 ── */}
                <SectionTitle>미디어 & 링크</SectionTitle>

                {/* 이미지 업로드 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    이미지{" "}
                    {form.popupType === "ad" && (
                      <span className="text-xs text-muted-foreground font-normal">(광고 배너에 표시)</span>
                    )}
                  </Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFile(e.target.files?.[0])}
                  />
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-input bg-muted">
                      <img
                        src={imagePreview}
                        alt="preview"
                        className="w-full object-cover"
                        style={{ maxHeight: 160 }}
                      />
                      <button
                        type="button"
                        onClick={() => { setImagePreview(""); setForm((p) => ({ ...p, imageUrl: "" })); }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full py-5 rounded-xl border-2 border-dashed border-input text-muted-foreground flex flex-col items-center justify-center gap-2 text-sm"
                    >
                      <ImagePlus size={24} />
                      <span className="font-medium">{uploading ? "업로드 중..." : "탭하여 이미지 업로드"}</span>
                      <span className="text-xs">최대 5MB · JPG / PNG</span>
                    </button>
                  )}
                </div>

                {/* 링크 URL */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">링크 URL</Label>
                  <Input
                    placeholder={form.popupType === "update" ? "APK 다운로드 경로" : "https://example.com"}
                    value={form.linkUrl}
                    onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))}
                    className="h-11"
                  />
                </div>

                {/* ── 일정 & 설정 ── */}
                <SectionTitle>일정 & 설정</SectionTitle>

                {/* 날짜 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">시작일 <span className="text-destructive">*</span></Label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                      className="h-11 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">종료일 <span className="text-destructive">*</span></Label>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                      className="h-11 text-sm"
                    />
                  </div>
                </div>

                {/* 디바이스 + 사용여부 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Device 타입</Label>
                    <select
                      className={selectCls}
                      value={form.deviceType}
                      onChange={(e) => setForm((p) => ({ ...p, deviceType: e.target.value }))}
                    >
                      {DEVICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">사용여부</Label>
                    <label className="flex items-center gap-2.5 h-11 cursor-pointer px-3 rounded-lg border border-input">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                        className="h-4 w-4 accent-[#2f355f]"
                      />
                      <span className={`text-sm font-medium ${form.isActive ? "text-[#2f355f]" : "text-muted-foreground"}`}>
                        {form.isActive ? "사용" : "미사용"}
                      </span>
                    </label>
                  </div>
                </div>

                {/* 하단 여백 (sticky 버튼에 가려지지 않게) */}
                <div className="h-2" />
              </div>

              {/* 하단 버튼 — 고정 */}
              <div className="flex-shrink-0 border-t bg-white px-5 py-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeForm}
                  className="flex-1 h-12 text-sm"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || uploading}
                  className="flex-[2] h-12 bg-[#2f355f] hover:bg-[#23284b] text-white text-sm font-semibold"
                >
                  {isPending ? "저장 중..." : editId ? "수정 완료" : "등록"}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
