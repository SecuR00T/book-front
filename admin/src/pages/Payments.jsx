import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPayments, getPayment, cancelPayment } from '@/api/payments';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { FilterBar } from '@/components/common/FilterBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PAYMENT_METHOD_LABEL = {
  CARD: '신용카드',
  BANK_TRANSFER: '무통장 입금',
  PAY: '간편결제',
};

const STATUS_LABEL = {
  PAID: '결제완료',
  CANCELLED: '결제취소',
  PENDING: '결제대기',
};

export default function PaymentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailId, setDetailId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['payments', keyword, status, paymentMethod, startDate, endDate, page, pageSize],
    queryFn: () => getPayments({ keyword, status, paymentMethod, startDate, endDate, page, pageSize }),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['payment-detail', detailId],
    queryFn: () => getPayment(detailId),
    enabled: !!detailId,
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => cancelPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-detail', confirmId] });
      toast({ title: '결제가 취소되었습니다.' });
      setConfirmId(null);
    },
    onError: (err) => {
      toast({ title: '취소 실패', description: err.message, variant: 'destructive' });
      setConfirmId(null);
    },
  });

  const columns = [
    {
      key: 'createdAt',
      header: '결제일시',
      render: (p) => <span className="font-mono text-xs">{p.createdAt}</span>,
    },
    {
      key: 'orderNumber',
      header: '주문번호',
      render: (p) => <span className="font-mono text-sm">{p.orderNumber}</span>,
    },
    { key: 'customerName', header: '고객명' },
    {
      key: 'paymentMethod',
      header: '결제수단',
      render: (p) => PAYMENT_METHOD_LABEL[p.paymentMethod] || p.paymentMethod,
    },
    {
      key: 'cardNumberMasked',
      header: '카드번호',
      render: (p) =>
        p.cardNumberMasked ? (
          <span className="inline-flex items-center gap-1 font-mono text-xs">
            <CreditCard size={12} className="text-muted-foreground" />
            {p.cardNumberMasked}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        ),
    },
    {
      key: 'amount',
      header: '결제금액',
      render: (p) => <span className="font-semibold">₩{Number(p.amount).toLocaleString()}</span>,
    },
    {
      key: 'status',
      header: '상태',
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDetailId(p.id); }}>
            상세
          </Button>
          {p.status !== 'CANCELLED' && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); setConfirmId(p.id); }}
            >
              취소
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="결제 관리" description={`총 ${data?.total || 0}건의 결제 내역`} />

      <FilterBar
        keyword={keyword}
        onKeywordChange={(v) => { setKeyword(v); setPage(1); }}
        keywordPlaceholder="주문번호/고객명 검색"
        onReset={() => {
          setKeyword(''); setStatus(''); setPaymentMethod('');
          setStartDate(''); setEndDate(''); setPage(1);
        }}
      >
        <Select value={status} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="결제상태" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="PAID">결제완료</SelectItem>
            <SelectItem value="CANCELLED">결제취소</SelectItem>
            <SelectItem value="PENDING">결제대기</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="결제수단" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="CARD">신용카드</SelectItem>
            <SelectItem value="BANK_TRANSFER">무통장 입금</SelectItem>
            <SelectItem value="PAY">간편결제</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">시작일</Label>
            <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">종료일</Label>
            <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="w-36" />
          </div>
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={data?.data || []}
        total={data?.total || 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={isLoading}
      />

      {/* 결제 상세 다이얼로그 */}
      <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard size={18} />
              결제 상세 정보
            </DialogTitle>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="py-10 text-center text-sm text-muted-foreground">로딩 중...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">결제 정보</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <Row label="결제 ID" value={detail.id} />
                    <Row label="주문번호" value={<span className="font-mono">{detail.orderNumber}</span>} />
                    <Row label="결제일시" value={detail.createdAt} />
                    <Row label="결제수단" value={PAYMENT_METHOD_LABEL[detail.paymentMethod] || detail.paymentMethod} />
                    <Row
                      label="상태"
                      value={
                        <span className="flex items-center gap-2">
                          <StatusBadge status={detail.status} />
                          {detail.status !== 'CANCELLED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => { setConfirmId(detail.id); }}
                            >
                              취소
                            </Button>
                          )}
                        </span>
                      }
                    />
                    {detail.cancelledAt && <Row label="취소일시" value={detail.cancelledAt} />}
                    <Row label="결제금액" value={<span className="font-bold">₩{Number(detail.amount).toLocaleString()}</span>} />
                    {detail.couponCode && <Row label="쿠폰코드" value={detail.couponCode} />}
                    {detail.pointUsed > 0 && <Row label="포인트사용" value={`${detail.pointUsed.toLocaleString()}p`} />}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">고객 / 카드 정보</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <Row label="고객명" value={detail.customerName} />
                    {detail.customerEmail && <Row label="이메일" value={detail.customerEmail} />}
                    {detail.cardNumberMasked && (
                      <>
                        <hr className="border-border my-2" />
                        <Row
                          label="카드번호"
                          value={
                            <span className="font-mono flex items-center gap-1">
                              <CreditCard size={12} className="text-muted-foreground" />
                              {detail.cardNumberMasked}
                            </span>
                          }
                        />
                        {detail.cardHolder && <Row label="소유자명" value={detail.cardHolder} />}
                        {detail.cardExpiry && <Row label="유효기간" value={detail.cardExpiry} />}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {detail.items && detail.items.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">주문 상품</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>상품명</TableHead>
                          <TableHead className="text-right">단가</TableHead>
                          <TableHead className="text-right">수량</TableHead>
                          <TableHead className="text-right">소계</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.items.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell>{item.title}</TableCell>
                            <TableCell className="text-right">₩{Number(item.unitPrice).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right font-medium">
                              ₩{(Number(item.unitPrice) * item.quantity).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 결제 취소 확인 모달 */}
      <ConfirmModal
        open={!!confirmId}
        onOpenChange={(open) => { if (!open) setConfirmId(null); }}
        title="결제 취소"
        description="해당 결제를 취소하시겠습니까? 주문 상태도 취소됩니다."
        confirmLabel="취소 처리"
        variant="destructive"
        onConfirm={() => { if (confirmId) cancelMutation.mutate(confirmId); }}
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? '-'}</span>
    </div>
  );
}
