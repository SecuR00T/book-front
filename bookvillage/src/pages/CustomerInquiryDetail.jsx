import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api/client";
import PageLayout from "@/components/PageLayout";

const parseId = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const formatCreatedAt = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR");
};

export default function CustomerInquiryDetail() {
  const { inquiryId: inquiryIdParam } = useParams();
  const inquiryId = parseId(inquiryIdParam);

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!inquiryId) {
      setError("올바르지 않은 문의 번호입니다.");
      return;
    }

    let active = true;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const rows = (await api.customerService.list()) || [];
        if (!active) return;
        const target = rows.find((item) => Number(item?.id) === inquiryId) || null;
        if (!target) {
          setError("해당 문의를 찾을 수 없습니다.");
          setInquiry(null);
          return;
        }
        setInquiry(target);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "문의 상세를 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [inquiryId]);

  const statusText = useMemo(() => {
    const raw = String(inquiry?.status || "");
    if (raw === "ANSWERED") return "답변 완료";
    if (raw === "PENDING") return "답변 대기";
    return raw || "-";
  }, [inquiry?.status]);

  return (
    <PageLayout title="문의 상세" description="선택한 1:1 문의 내용을 확인합니다.">
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Link
            to="/customer-service/inquiries"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
          >
            목록으로
          </Link>
          <Link
            to="/customer-service?tab=inquiry"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
          >
            문의 작성으로
          </Link>
        </div>

        {loading && (
          <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            문의 정보를 불러오는 중입니다.
          </p>
        )}

        {!loading && error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {!loading && !error && inquiry && (
          <article className="space-y-4 rounded-xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{inquiry.subject || "(제목 없음)"}</h2>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {statusText}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{formatCreatedAt(inquiry.createdAt)}</p>

            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">문의 내용</p>
              <p className="whitespace-pre-wrap rounded-lg border border-border bg-card px-3 py-3 text-sm leading-6">
                {inquiry.content || "내용이 없습니다."}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">관리자 답변</p>
              <p
                className="whitespace-pre-wrap rounded-lg border border-border bg-card px-3 py-3 text-sm leading-6"
                dangerouslySetInnerHTML={{ __html: inquiry.adminAnswer || "아직 등록된 답변이 없습니다." }}
              />
            </div>
          </article>
        )}
      </section>
    </PageLayout>
  );
}
