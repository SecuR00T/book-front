import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bell, FileText, HelpCircle, List, MessageSquareText, Paperclip, PlusCircle } from "lucide-react";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/PageLayout";

const TAB_KEYS = {
  NOTICE: "notice",
  FAQ: "faq",
  INQUIRY: "inquiry",
};

const tabs = [
  { key: TAB_KEYS.NOTICE, label: "공지사항", icon: Bell },
  { key: TAB_KEYS.FAQ, label: "자주 묻는 질문", icon: HelpCircle },
  { key: TAB_KEYS.INQUIRY, label: "1:1 문의", icon: MessageSquareText },
];

const formatCreatedAt = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR");
};

export default function CustomerService() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [inquiryError, setInquiryError] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");

  const [notices, setNotices] = useState([]);
  const [selectedNoticeId, setSelectedNoticeId] = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [noticeError, setNoticeError] = useState("");

  const [faqs, setFaqs] = useState([]);
  const [faqCategory, setFaqCategory] = useState("");
  const [faqCategories, setFaqCategories] = useState([]);

  const activeTab = useMemo(() => {
    const tab = (searchParams.get("tab") || TAB_KEYS.NOTICE).toLowerCase();
    return Object.values(TAB_KEYS).includes(tab) ? tab : TAB_KEYS.NOTICE;
  }, [searchParams]);

  const switchTab = (tabKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tabKey === TAB_KEYS.NOTICE) {
        next.delete("tab");
      } else {
        next.set("tab", tabKey);
      }
      return next;
    });
  };

  const loadNoticeDetail = async (noticeId) => {
    if (!noticeId) return;
    setNoticeLoading(true);
    setNoticeError("");
    setSelectedNoticeId(noticeId);
    try {
      const detail = await api.support.notice(noticeId);
      setSelectedNotice(detail);
    } catch {
      setSelectedNotice(null);
      setNoticeError("공지 상세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setNoticeLoading(false);
    }
  };

  const loadFaqs = useCallback(async (category = "") => {
    const target = category || "";
    setFaqCategory(target);
    try {
      const rows = (await api.support.faqs(target || undefined)) || [];
      setFaqs(rows);
      const allRows = target ? ((await api.support.faqs()) || []) : rows;
      const categories = [...new Set(allRows.map((f) => f.category).filter(Boolean))];
      setFaqCategories(categories);
    } catch {
      setFaqs([]);
    }
  }, []);

  useEffect(() => {
    api.support
      .notices()
      .then((v) => {
        const rows = v || [];
        setNotices(rows);
        if (rows.length) {
          void loadNoticeDetail(rows[0].id);
        } else {
          setSelectedNotice(null);
          setSelectedNoticeId(null);
        }
      })
      .catch(() => {
        setNotices([]);
        setSelectedNotice(null);
        setSelectedNoticeId(null);
        setNoticeError("공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      });

    void loadFaqs("");
  }, [loadFaqs]);

  const submit = async (e) => {
    e.preventDefault();
    if (!user) {
      setInquiryError("로그인 후 1:1 문의를 등록할 수 있습니다.");
      setInquiryMessage("");
      return;
    }
    setInquiryError("");
    setInquiryMessage("");
    try {
      await api.customerService.create({ subject, content });
      setSubject("");
      setContent("");
      setInquiryMessage("문의가 등록되었습니다. 내 문의 목록에서 상태를 확인할 수 있습니다.");
    } catch (err) {
      setInquiryError(err instanceof Error ? err.message : "문의 등록에 실패했습니다.");
    }
  };

  return (
    <PageLayout title="고객센터" description="공지사항, FAQ, 1:1 문의를 한 화면에서 확인할 수 있습니다.">
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === TAB_KEYS.NOTICE && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">공지사항</h2>
            <span className="text-xs text-muted-foreground">최신 공지 {notices.length}건</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="space-y-2">
              {notices.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => loadNoticeDetail(n.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                    selectedNoticeId === n.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:border-primary/50 hover:bg-secondary/50"
                  }`}
                >
                  <p className="line-clamp-2 font-semibold">{n.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatCreatedAt(n.createdAt)}</p>
                </button>
              ))}
              {notices.length === 0 && (
                <p className="rounded-xl border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                  등록된 공지사항이 없습니다.
                </p>
              )}
            </div>

            <article className="min-h-[240px] rounded-2xl border border-border bg-background p-5">
              {noticeLoading && <p className="text-sm text-muted-foreground">공지 상세를 불러오는 중입니다.</p>}
              {!noticeLoading && noticeError && <p className="text-sm text-red-600">{noticeError}</p>}
              {!noticeLoading && !noticeError && selectedNotice && (
                <>
                  <h3 className="text-xl font-bold">{selectedNotice.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{formatCreatedAt(selectedNotice.createdAt)}</p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7">{selectedNotice.content}</p>
                  {selectedNotice.attachmentUrl && (
                    <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3">
                      <Paperclip size={14} className="shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">첨부파일</p>
                        <a
                          href={selectedNotice.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-sm font-semibold text-primary underline hover:opacity-80"
                        >
                          {selectedNotice.attachmentName || selectedNotice.attachmentUrl}
                        </a>
                      </div>
                    </div>
                  )}
                </>
              )}
              {!noticeLoading && !noticeError && !selectedNotice && (
                <p className="text-sm text-muted-foreground">왼쪽에서 공지글을 선택해 주세요.</p>
              )}
            </article>
          </div>
        </section>
      )}

      {activeTab === TAB_KEYS.FAQ && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-lg font-bold">자주 묻는 질문</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadFaqs("")}
              className={`rounded-full border px-3 py-1 text-xs ${
                faqCategory === ""
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              전체
            </button>
            {faqCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => loadFaqs(category)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  faqCategory === category
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {faqs.map((f) => (
              <details key={f.id} className="rounded-xl border border-border bg-background px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold">[{f.category}] {f.question}</summary>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{f.answer}</p>
              </details>
            ))}
            {faqs.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                등록된 FAQ가 없습니다.
              </p>
            )}
          </div>
        </section>
      )}

      {activeTab === TAB_KEYS.INQUIRY && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-lg font-bold">1:1 문의</h2>
          {!user ? (
            <div className="rounded-xl border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
              1:1 문의는 로그인 후 이용할 수 있습니다.
              <div className="mt-3">
                <Link to="/login" className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  로그인하기
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={submit} className="space-y-2 rounded-xl border border-border bg-background p-4">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
                  <PlusCircle size={14} />
                  문의 작성
                </h3>
                <input
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                  placeholder="문의 제목"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <textarea
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                  rows={4}
                  placeholder="문의 내용을 입력하세요."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">문의 등록</button>
              </form>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex min-h-[118px] flex-col justify-between rounded-xl border border-border bg-background p-4">
                  <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
                    <List size={14} />
                    내 문의 목록
                  </h3>
                  <Link
                    to="/customer-service/inquiries"
                    className="mt-3 inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-semibold hover:bg-secondary"
                  >
                    목록으로 이동
                  </Link>
                </div>

                <div className="flex min-h-[118px] flex-col justify-between rounded-xl border border-border bg-background p-4">
                  <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
                    <FileText size={14} />
                    문의 상세
                  </h3>
                  <Link
                    to="/customer-service/inquiries"
                    className="mt-3 inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-semibold hover:bg-secondary"
                  >
                    상세 페이지 이동
                  </Link>
                </div>
              </div>
            </>
          )}

          {inquiryMessage && <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{inquiryMessage}</p>}
          {inquiryError && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{inquiryError}</p>}
        </section>
      )}
    </PageLayout>
  );
}
