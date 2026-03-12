import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCustomerServiceInquiries,
  replyCustomerServiceInquiry,
} from '@/api/customerService';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { FilterBar } from '@/components/common/FilterBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function CustomerServicePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState('');
  const [answerDraft, setAnswerDraft] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customer-service', keyword, status, page, pageSize],
    queryFn: () => getCustomerServiceInquiries({ keyword, status, page, pageSize }),
  });

  const inquiries = data?.data || [];

  const selectedInquiry = useMemo(
    () => inquiries.find((inquiry) => inquiry.id === selectedId) || null,
    [inquiries, selectedId]
  );

  const replyMut = useMutation({
    mutationFn: ({ id, answer }) => replyCustomerServiceInquiry(id, { answer }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-service'] });
      toast({ title: '답변이 저장되었습니다.' });
    },
    onError: (error) => {
      toast({
        title: error?.message || '답변 저장에 실패했습니다.',
        variant: 'destructive',
      });
    },
  });

  const columns = [
    { key: 'id', header: 'ID', render: (row) => <span className="font-mono">{row.id}</span> },
    { key: 'subject', header: '문의 제목', sortable: true },
    {
      key: 'userName',
      header: '작성자',
      render: (row) => (
        <div>
          <p className="font-medium">{row.userName || '-'}</p>
          <p className="text-xs text-muted-foreground">{row.userEmail || '-'}</p>
        </div>
      ),
    },
    { key: 'status', header: '상태', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', header: '등록일', sortable: true },
  ];

  return (
    <div>
      <PageHeader title="고객센터 문의 관리" description={`총 ${data?.total || 0}건`} />

      <FilterBar
        keyword={keyword}
        onKeywordChange={(v) => {
          setKeyword(v);
          setPage(1);
        }}
        keywordPlaceholder="제목/내용/작성자 검색"
        onReset={() => {
          setKeyword('');
          setStatus('');
          setPage(1);
        }}
      >
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="OPEN">OPEN</SelectItem>
            <SelectItem value="ANSWERED">ANSWERED</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={inquiries}
        total={data?.total || 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRowClick={(row) => {
          setSelectedId(row.id);
          setAnswerDraft(row.adminAnswer || '');
        }}
        loading={isLoading}
      />

      {selectedInquiry && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">{selectedInquiry.subject}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="rounded-md bg-muted/60 p-3 text-sm"
              dangerouslySetInnerHTML={{ __html: selectedInquiry.content || '문의 내용이 없습니다.' }}
            />

            <Textarea
              rows={6}
              value={answerDraft}
              onChange={(e) => setAnswerDraft(e.target.value)}
              placeholder="운영자 답변을 입력하세요."
            />
            <div className="flex justify-end">
              <Button
                onClick={() => replyMut.mutate({ id: selectedInquiry.id, answer: answerDraft })}
                disabled={replyMut.isPending || !answerDraft.trim()}
              >
                {replyMut.isPending ? '저장중...' : '답변 저장'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
