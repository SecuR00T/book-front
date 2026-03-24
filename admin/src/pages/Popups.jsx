import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPopups, createPopup, updatePopup, deletePopup } from "@/api/popups";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const DEVICE_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "pc", label: "PC" },
  { value: "mobile", label: "모바일" },
];

const today = () => new Date().toISOString().slice(0, 10);
const nextMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

const EMPTY_FORM = {
  title: "",
  content: "",
  linkUrl: "",
  startDate: today(),
  endDate: nextMonth(),
  isActive: true,
  deviceType: "all",
};

export default function PopupsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterDevice, setFilterDevice] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: popups = [], isLoading } = useQuery({
    queryKey: ["popups", filterKeyword, filterActive, filterDevice],
    queryFn: () =>
      getPopups({
        keyword: filterKeyword || undefined,
        active: filterActive !== "" ? filterActive : undefined,
        deviceType: filterDevice || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createPopup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["popups"] });
      toast({ title: "팝업이 등록되었습니다." });
      closeForm();
    },
    onError: (e) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updatePopup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["popups"] });
      toast({ title: "팝업이 수정되었습니다." });
      closeForm();
    },
    onError: (e) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePopup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["popups"] });
      toast({ title: "팝업이 삭제되었습니다." });
    },
    onError: (e) => toast({ title: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (popup) => {
    setEditId(popup.id);
    setForm({
      title: popup.title || "",
      content: popup.content || "",
      linkUrl: popup.linkUrl || "",
      startDate: popup.startDate || today(),
      endDate: popup.endDate || nextMonth(),
      isActive: popup.isActive ?? true,
      deviceType: popup.deviceType || "all",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: "제목을 입력해 주세요.", variant: "destructive" });
      return;
    }
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const onDelete = (popup) => {
    if (!window.confirm(`"${popup.title}" 팝업을 삭제하시겠습니까?`)) return;
    deleteMutation.mutate(popup.id);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="팝업 관리"
        description="홈페이지 메인화면에 띄울 팝업을 관리하세요."
      />

      {/* 필터 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs mb-1 block">검색어</Label>
              <Input
                placeholder="팝업 제목 검색"
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">사용여부</Label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
              >
                <option value="">전체</option>
                <option value="true">사용</option>
                <option value="false">미사용</option>
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Device</Label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={filterDevice}
                onChange={(e) => setFilterDevice(e.target.value)}
              >
                {DEVICE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <Button onClick={openCreate} className="ml-auto">
              <Plus className="mr-1 h-4 w-4" /> 새 팝업 등록
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 팝업 목록 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">순번</th>
                  <th className="px-4 py-3 text-left font-medium">팝업제목</th>
                  <th className="px-4 py-3 text-left font-medium">시작일</th>
                  <th className="px-4 py-3 text-left font-medium">종료일</th>
                  <th className="px-4 py-3 text-left font-medium">사용여부</th>
                  <th className="px-4 py-3 text-left font-medium">Device</th>
                  <th className="px-4 py-3 text-left font-medium">등록일</th>
                  <th className="px-4 py-3 text-left font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      불러오는 중...
                    </td>
                  </tr>
                ) : popups.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      등록된 팝업이 없습니다.
                    </td>
                  </tr>
                ) : (
                  popups.map((popup, idx) => (
                    <tr key={popup.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground">{popups.length - idx}</td>
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{popup.title}</td>
                      <td className="px-4 py-3">{popup.startDate}</td>
                      <td className="px-4 py-3">{popup.endDate}</td>
                      <td className="px-4 py-3">
                        <Badge variant={popup.isActive ? "default" : "secondary"}>
                          {popup.isActive ? "사용" : "미사용"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{popup.deviceType || "all"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {popup.createdAt ? popup.createdAt.slice(0, 10) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(popup)}>
                            <Pencil className="h-3 w-3 mr-1" /> 수정
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onDelete(popup)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> 삭제
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 등록/수정 폼 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editId ? "팝업 수정" : "새 팝업 등록"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={closeForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>제목 *</Label>
                  <Input
                    placeholder="팝업 제목을 입력하세요"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label>내용</Label>
                  <Textarea
                    placeholder="팝업 내용을 입력하세요"
                    value={form.content}
                    onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>링크 URL</Label>
                  <Input
                    placeholder="https://example.com"
                    value={form.linkUrl}
                    onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>시작일 *</Label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>종료일 *</Label>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Device 타입</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.deviceType}
                      onChange={(e) => setForm((p) => ({ ...p, deviceType: e.target.value }))}
                    >
                      {DEVICE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>사용여부</Label>
                    <div className="flex items-center gap-3 h-10">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.isActive}
                          onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{form.isActive ? "사용" : "미사용"}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={closeForm}>
                    취소
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "저장 중..." : editId ? "수정 완료" : "등록"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
