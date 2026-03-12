import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, deleteProducts } from '@/api/products';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { FilterBar } from '@/components/common/FilterBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
export default function ProductListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('');
    const [category, setCategory] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selectedIds, setSelectedIds] = useState([]);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const { data, isLoading } = useQuery({
        queryKey: ['products', keyword, status, category, page, pageSize],
        queryFn: () => getProducts({ keyword, status, category, page, pageSize }),
    });
    const deleteMutation = useMutation({
        mutationFn: deleteProducts,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setSelectedIds([]); toast({ title: '삭제 완료' }); },
        onError: () => toast({ title: '삭제 실패', variant: 'destructive' }),
    });
    const columns = [
        { key: 'title', header: '제목', sortable: true, render: p => <span className="font-medium">{p.title}</span> },
        { key: 'author', header: '저자', sortable: true },
        { key: 'publisher', header: '출판사' },
        { key: 'category', header: '카테고리' },
        { key: 'price', header: '가격', sortable: true, render: p => <span>₩{(p.salePrice || p.price).toLocaleString()}</span> },
        { key: 'stock', header: '재고', sortable: true, render: p => <span className={p.stock <= 5 ? 'text-destructive font-medium' : ''}>{p.stock}</span> },
        { key: 'status', header: '상태', render: p => <StatusBadge status={p.status}/> },
        { key: 'actions', header: '', render: p => <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); navigate(`/products/${p.id}`); }}>수정</Button> },
    ];
    return (<div>
      <PageHeader title="상품 관리" description={`총 ${data?.total || 0}개의 도서`} actions={<div className="flex gap-2">
            {selectedIds.length > 0 && (<Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} aria-label="선택 삭제">
                <Trash2 className="h-4 w-4 mr-1"/>{selectedIds.length}개 삭제
              </Button>)}
            <Button onClick={() => navigate('/products/new')} aria-label="상품 등록"><Plus className="h-4 w-4 mr-1"/>상품 등록</Button>
          </div>}/>
      <FilterBar keyword={keyword} onKeywordChange={v => { setKeyword(v); setPage(1); }} keywordPlaceholder="제목/저자/ISBN 검색" onReset={() => { setKeyword(''); setStatus(''); setCategory(''); setPage(1); }}>
        <Select value={status} onValueChange={v => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="상태"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="판매중">판매중</SelectItem>
            <SelectItem value="품절">품절</SelectItem>
            <SelectItem value="판매중지">판매중지</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={v => { setCategory(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="카테고리"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {['소설', '에세이', '인문', '경제/경영', '자기계발', 'IT/과학'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>
      <DataTable columns={columns} data={data?.data || []} total={data?.total || 0} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} onRowClick={p => navigate(`/products/${p.id}`)} loading={isLoading}/>
      <ConfirmModal open={deleteOpen} onOpenChange={setDeleteOpen} title="상품 삭제" description={`${selectedIds.length}개의 상품을 삭제하시겠습니까?`} variant="destructive" confirmLabel="삭제" onConfirm={() => { deleteMutation.mutate(selectedIds); setDeleteOpen(false); }}/>
    </div>);
}
