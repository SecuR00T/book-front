import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createNotice } from "@/api/notices";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const INITIAL_FORM = {
  title: "",
  content: "",
  file: null,
};

export default function NoticesPage() {
  const { toast } = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [lastCreated, setLastCreated] = useState(null);
  const fileInputRef = useRef(null);

  const createMutation = useMutation({
    mutationFn: createNotice,
    onSuccess: (created) => {
      setLastCreated(created || null);
      setForm(INITIAL_FORM);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ title: "공지사항이 등록되었습니다." });
    },
    onError: (error) => {
      toast({
        title: error?.message || "공지사항 등록에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();

    if (!title || !content) {
      toast({
        title: "제목과 내용을 모두 입력해 주세요.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({ title, content, file: form.file || undefined });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="공지사항 관리"
        description="관리자에서 공지사항을 작성하면 홈페이지 고객센터 공지사항 탭에 바로 노출됩니다."
      />

      <Card>
        <CardHeader>
          <CardTitle>공지사항 작성</CardTitle>
          <CardDescription>등록 즉시 홈페이지 공지 목록에서 확인할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="notice-title">제목</Label>
              <Input
                id="notice-title"
                placeholder="공지 제목을 입력해 주세요."
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice-content">내용</Label>
              <Textarea
                id="notice-content"
                placeholder="공지 내용을 입력해 주세요."
                value={form.content}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, content: event.target.value }))
                }
                rows={10}
                maxLength={5000}
              />
            </div>

            {/* 파일 첨부 */}
            <div className="space-y-2">
              <Label htmlFor="notice-file">첨부파일</Label>
              <Input
                id="notice-file"
                type="file"
                ref={fileInputRef}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))
                }
              />
              {form.file && (
                <p className="text-xs text-muted-foreground">
                  선택된 파일: {form.file.name} ({(form.file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "등록 중..." : "공지 등록"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {lastCreated && (
        <Card>
          <CardHeader>
            <CardTitle>최근 등록 공지</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-semibold">{lastCreated.title}</p>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{lastCreated.content}</p>
            {lastCreated.attachmentUrl && (
              <div className="mt-2 rounded border p-2 text-xs">
                <p className="font-medium">첨부파일 업로드 완료</p>
                <p className="text-muted-foreground">파일명: {lastCreated.attachmentName}</p>
                <a
                  href={lastCreated.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-blue-600 underline"
                >
                  {lastCreated.attachmentUrl}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
