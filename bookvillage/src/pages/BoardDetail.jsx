import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Edit3, Eye, FileUp, MessageSquare, Trash2, X } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/PageLayout";

const COMMENT_PAGE_SIZE = 5;

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatSize = (bytes) => {
  const n = Number(bytes || 0);
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
};

const isPreviewableContentType = (contentType) => {
  const type = String(contentType || "").toLowerCase();
  return type.startsWith("image/") || type.includes("pdf") || type.startsWith("text/");
};

export default function BoardDetail() {
  const { user } = useAuth();
  const { postId: postIdParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const postId = Number(postIdParam);
  const validPostId = Number.isInteger(postId) && postId > 0 ? postId : null;

  const [post, setPost] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentSort, setCommentSort] = useState("latest");
  const [commentPage, setCommentPage] = useState(0);
  const [commentPageInfo, setCommentPageInfo] = useState({
    page: 0,
    size: COMMENT_PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  });

  const [commentInput, setCommentInput] = useState("");
  const [commentEditId, setCommentEditId] = useState(null);
  const [commentEditInput, setCommentEditInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [preview, setPreview] = useState(null);

  const clearPreview = useCallback(() => {
    setPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  useEffect(() => () => clearPreview(), [clearPreview]);

  useEffect(() => {
    const flash = location.state?.message;
    if (!flash) return;
    setMessage(flash);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!preview) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") clearPreview();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [preview, clearPreview]);

  useEffect(() => {
    setCommentPage(0);
    setCommentEditId(null);
    setCommentEditInput("");
    clearPreview();
  }, [validPostId, clearPreview]);

  useEffect(() => {
    setCommentPage(0);
  }, [commentSort]);

  const loadDetail = useCallback(async () => {
    if (!validPostId) return;
    setLoading(true);
    setError("");
    try {
      const [postRes, attachmentsRes] = await Promise.all([
        api.board.get(validPostId),
        api.board.listAttachments(validPostId),
      ]);
      setPost(postRes || null);
      setAttachments(attachmentsRes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "게시글 상세를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [validPostId]);

  const loadComments = useCallback(async (targetPage) => {
    if (!validPostId) return;
    const safePage = Math.max(0, Number(targetPage || 0));
    setCommentsLoading(true);
    try {
      const data = await api.board.listComments(validPostId, commentSort, safePage, COMMENT_PAGE_SIZE);
      const rows = data?.items || [];
      const totalPages = Number(data?.totalPages || 0);

      if (rows.length === 0 && safePage > 0 && totalPages > 0) {
        setCommentPage(totalPages - 1);
        return;
      }

      setComments(rows);
      setCommentPageInfo({
        page: Number(data?.page ?? safePage),
        size: Number(data?.size ?? COMMENT_PAGE_SIZE),
        totalElements: Number(data?.totalElements ?? 0),
        totalPages,
        hasNext: Boolean(data?.hasNext),
        hasPrevious: Boolean(data?.hasPrevious),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "댓글을 불러오지 못했습니다.");
    } finally {
      setCommentsLoading(false);
    }
  }, [validPostId, commentSort]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    loadComments(commentPage);
  }, [loadComments, commentPage]);

  const isPostOwner = useMemo(() => post?.userId === user?.id, [post, user?.id]);

  const removePost = async () => {
    if (!validPostId) return;
    if (!window.confirm("이 게시글을 삭제할까요?")) return;
    setError("");
    try {
      await api.board.delete(validPostId);
      navigate("/board", { state: { message: "게시글이 삭제되었습니다." } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "게시글 삭제에 실패했습니다.");
    }
  };

  const submitComment = async () => {
    if (!validPostId) return;
    if (!commentInput.trim()) {
      setError("댓글 내용을 입력해 주세요.");
      return;
    }
    setError("");
    setMessage("");
    try {
      await api.board.createComment(validPostId, commentInput.trim());
      setCommentInput("");
      setCommentPage(0);
      await Promise.all([loadComments(0), loadDetail()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "댓글 등록에 실패했습니다.");
    }
  };

  const startEditComment = (comment) => {
    setCommentEditId(comment.id);
    setCommentEditInput(comment.content || "");
  };

  const saveEditComment = async () => {
    if (!commentEditId) return;
    if (!commentEditInput.trim()) {
      setError("댓글 내용을 입력해 주세요.");
      return;
    }
    setError("");
    setMessage("");
    try {
      await api.board.updateComment(commentEditId, commentEditInput.trim());
      setCommentEditId(null);
      setCommentEditInput("");
      await Promise.all([loadComments(commentPage), loadDetail()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "댓글 수정에 실패했습니다.");
    }
  };

  const removeComment = async (commentId) => {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    setError("");
    setMessage("");
    try {
      await api.board.deleteComment(commentId);
      if (commentEditId === commentId) {
        setCommentEditId(null);
        setCommentEditInput("");
      }
      await Promise.all([loadComments(commentPage), loadDetail()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "댓글 삭제에 실패했습니다.");
    }
  };

  const uploadAttachment = async (file) => {
    if (!validPostId || !file) return;
    setError("");
    setMessage("");
    setUploading(true);
    try {
      await api.board.uploadAttachment(validPostId, file);
      setMessage("첨부파일이 업로드되었습니다.");
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "첨부파일 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (attachmentId) => {
    if (!validPostId) return;
    if (!window.confirm("이 첨부파일을 삭제할까요?")) return;
    setError("");
    setMessage("");
    try {
      await api.board.deleteAttachment(validPostId, attachmentId);
      setMessage("첨부파일이 삭제되었습니다.");
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "첨부파일 삭제에 실패했습니다.");
    }
  };

  const downloadAttachment = async (attachment) => {
    if (!attachment) return;
    setError("");
    try {
      await api.board.downloadAttachment(attachment.id, attachment.originalName || "attachment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "첨부파일 다운로드에 실패했습니다.");
    }
  };

  const openPreview = async (attachment) => {
    if (!attachment) return;
    setError("");
    setMessage("");
    try {
      const { blob, filename, contentType } = await api.board.previewAttachment(
        attachment.id,
        attachment.originalName || "attachment",
      );
      const type = String(contentType || "").toLowerCase();

      if (!isPreviewableContentType(type)) {
        throw new Error("이 파일 형식은 미리보기를 지원하지 않습니다.");
      }

      if (type.startsWith("text/")) {
        const text = await blob.text();
        setPreview((prev) => {
          if (prev?.url) URL.revokeObjectURL(prev.url);
          return {
            attachmentId: attachment.id,
            mode: "text",
            name: filename,
            text,
            url: null,
            contentType: type,
          };
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      setPreview((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return {
          attachmentId: attachment.id,
          mode: type.includes("pdf") ? "pdf" : "image",
          name: filename,
          text: "",
          url,
          contentType: type,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "첨부파일 미리보기에 실패했습니다.");
    }
  };

  if (!validPostId) {
    return (
      <PageLayout hideIntro>
        <div className="rounded-2xl border border-red-200 bg-card p-6">
          <p className="text-sm font-semibold text-red-600">올바르지 않은 게시글 경로입니다.</p>
          <button
            type="button"
            onClick={() => navigate("/board")}
            className="mt-3 h-10 rounded-xl border border-border px-4 text-sm hover:bg-secondary"
          >
            목록으로
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="게시글 상세" description="게시글 상세, 댓글, 첨부파일을 확인합니다.">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate("/board")}
          className="h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary"
        >
          목록으로
        </button>
        {isPostOwner && (
          <>
            <button
              type="button"
              onClick={() => navigate(`/board/${validPostId}/edit`)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary"
            >
              <Edit3 size={14} />
              수정
            </button>
            <button
              type="button"
              onClick={removePost}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} />
              삭제
            </button>
          </>
        )}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        {loading ? (
          <p className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">상세 정보를 불러오는 중입니다...</p>
        ) : !post ? (
          <p className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">게시글을 찾을 수 없습니다.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background px-3 py-3">
              <p className="text-lg font-bold">{post.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {post.authorName || "Unknown"} | 작성 {formatDateTime(post.createdAt)}
                {post.updatedAt && ` | 수정 ${formatDateTime(post.updatedAt)}`}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6" dangerouslySetInnerHTML={{ __html: post.content }}></p>
            </div>

            <div className="rounded-xl border border-border bg-background px-3 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">첨부파일</p>
                {isPostOwner && (
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary">
                    <FileUp size={13} />
                    파일 업로드
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) uploadAttachment(file);
                        e.target.value = "";
                      }}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              {attachments.length === 0 ? (
                <p className="text-xs text-muted-foreground">첨부파일이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((a) => (
                    <div key={a.id} className="rounded-lg border border-border px-2 py-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium" title={a.originalName}>{a.originalName}</p>
                        <span className="text-muted-foreground">{formatSize(a.fileSize)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-secondary"
                          onClick={() => openPreview(a)}
                        >
                          <Eye size={12} />
                          미리보기
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-secondary"
                          onClick={() => downloadAttachment(a)}
                        >
                          <Download size={12} />
                          다운로드
                        </button>
                        {isPostOwner && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50"
                            onClick={() => removeAttachment(a.id)}
                          >
                            <Trash2 size={12} />
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-background px-3 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">댓글</p>
                <select
                  value={commentSort}
                  onChange={(e) => setCommentSort(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2 text-xs outline-none focus:border-primary"
                >
                  <option value="latest">최신순</option>
                  <option value="oldest">오래된순</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="댓글을 입력해 주세요."
                  className="h-9 flex-1 rounded-lg border border-input px-3 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={submitComment}
                  className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
                >
                  <MessageSquare size={12} />
                  등록
                </button>
              </div>

              {commentsLoading ? (
                <p className="mt-2 text-xs text-muted-foreground">댓글을 불러오는 중입니다...</p>
              ) : comments.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">등록된 댓글이 없습니다.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-lg border border-border px-2 py-2">
                      <p className="text-[11px] text-muted-foreground">
                        {c.authorName || "Unknown"} | {formatDateTime(c.createdAt)}
                      </p>
                      {commentEditId === c.id ? (
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            value={commentEditInput}
                            onChange={(e) => setCommentEditInput(e.target.value)}
                            className="h-8 flex-1 rounded-md border border-input px-2 text-xs outline-none focus:border-primary"
                          />
                          <button type="button" className="text-xs text-primary" onClick={saveEditComment}>저장</button>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground"
                            onClick={() => {
                              setCommentEditId(null);
                              setCommentEditInput("");
                            }}
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: c.content }}></p>
                      )}

                      {c.userId === user?.id && commentEditId !== c.id && (
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <button type="button" className="text-primary" onClick={() => startEditComment(c)}>수정</button>
                          <button type="button" className="text-red-500" onClick={() => removeComment(c.id)}>삭제</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  댓글 {commentPageInfo.totalElements}개 | {commentPageInfo.totalPages > 0 ? commentPageInfo.page + 1 : 0}/{commentPageInfo.totalPages} 페이지
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!commentPageInfo.hasPrevious}
                    onClick={() => setCommentPage((p) => Math.max(0, p - 1))}
                    className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    disabled={!commentPageInfo.hasNext}
                    onClick={() => setCommentPage((p) => p + 1)}
                    className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
                  >
                    다음
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      {preview && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 sm:p-8">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={clearPreview} />
          <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{preview.name}</p>
                <p className="text-xs text-muted-foreground">{preview.contentType || "preview"}</p>
              </div>
              <button
                type="button"
                className="rounded-md border border-border p-1.5 hover:bg-secondary"
                onClick={clearPreview}
              >
                <X size={14} />
              </button>
            </div>
            <div className="max-h-[calc(88vh-58px)] overflow-auto bg-background p-4">
              {preview.mode === "image" && (
                <img src={preview.url} alt={preview.name} className="mx-auto max-h-[74vh] w-auto rounded-lg border border-border" />
              )}
              {preview.mode === "pdf" && (
                <iframe src={preview.url} title={preview.name} className="h-[74vh] w-full rounded-lg border border-border bg-white" />
              )}
              {preview.mode === "text" && (
                <pre className="max-h-[74vh] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-3 text-xs">{preview.text}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
