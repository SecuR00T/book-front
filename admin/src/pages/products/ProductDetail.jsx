import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProduct, updateProduct, deleteProducts } from '@/api/products';
import { adjustInventory } from '@/api/inventory';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import { TagInput } from '@/components/common/TagInput';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
export default function ProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [adjustForm, setAdjustForm] = useState({ type: '입고', quantity: 0, reason: '' });
    const { data: product, isLoading } = useQuery({ queryKey: ['product', id], queryFn: () => getProduct(id) });
    const [form, setForm] = useState({});
    const merged = { ...product, ...form };
    const hasChanges = Object.keys(form).length > 0;
    const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
    const updateMutation = useMutation({
        mutationFn: (data) => updateProduct(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['product', id] }); setForm({}); toast({ title: '저장 완료' }); },
    });
    const deleteMutation = useMutation({
        mutationFn: () => deleteProducts([id]),
        onSuccess: () => { toast({ title: '삭제 완료' }); navigate('/products'); },
    });
    const adjustMutation = useMutation({
        mutationFn: () => adjustInventory({ productId: id, ...adjustForm }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['product', id] }); setAdjustOpen(false); toast({ title: '재고 조정 완료' }); },
    });
    if (isLoading || !product)
        return <div className="p-8 text-center text-muted-foreground">로딩 중...</div>;
    return (<div>
      <PageHeader title={product.title} description={`${product.author} · ${product.publisher}`} actions={<div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)}><Package className="h-4 w-4 mr-1"/>재고 조정</Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4 mr-1"/>삭제</Button>
          </div>}/>

      <form onSubmit={e => { e.preventDefault(); updateMutation.mutate(form); }} onKeyDown={e => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement)
        e.preventDefault(); }} className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2"><Label>제목</Label><Input value={merged.title || ''} onChange={e => set('title', e.target.value)}/></div>
            <div className="space-y-2"><Label>저자</Label><Input value={merged.author || ''} onChange={e => set('author', e.target.value)}/></div>
            <div className="space-y-2"><Label>출판사</Label><Input value={merged.publisher || ''} onChange={e => set('publisher', e.target.value)}/></div>
            <div className="space-y-2"><Label>ISBN13</Label><Input value={merged.isbn13 || ''} onChange={e => set('isbn13', e.target.value)}/></div>
            <div className="space-y-2"><Label>출간일</Label><Input type="date" value={merged.publishedDate || ''} onChange={e => set('publishedDate', e.target.value)}/></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">분류</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select value={merged.category || ''} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['소설', '에세이', '인문', '경제/경영', '자기계발', 'IT/과학'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>태그</Label><TagInput value={merged.tags || []} onChange={v => set('tags', v)}/></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">가격/재고</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>정가</Label><CurrencyInput value={merged.price || 0} onChange={v => set('price', v)}/></div>
            <div className="space-y-2"><Label>할인가</Label><CurrencyInput value={merged.salePrice || 0} onChange={v => set('salePrice', v)}/></div>
            <div className="space-y-2"><Label>재고</Label><Input type="number" value={merged.stock ?? 0} disabled className="bg-muted"/></div>
            <div className="space-y-2"><Label>상태</Label><StatusBadge status={merged.status || '판매중'}/></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">상세 설명</CardTitle></CardHeader>
          <CardContent><Textarea value={merged.description || ''} onChange={e => set('description', e.target.value)} rows={6}/></CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={!hasChanges || updateMutation.isPending}>{updateMutation.isPending ? '저장 중...' : '저장'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/products')}>목록</Button>
        </div>
      </form>

      <ConfirmModal open={deleteOpen} onOpenChange={setDeleteOpen} title="상품 삭제" description="이 상품을 삭제하시겠습니까?" variant="destructive" confirmLabel="삭제" onConfirm={() => deleteMutation.mutate()}/>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>재고 조정</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>유형</Label>
              <Select value={adjustForm.type} onValueChange={v => setAdjustForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="입고">입고</SelectItem><SelectItem value="출고">출고</SelectItem><SelectItem value="조정">조정</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>수량</Label><Input type="number" min={1} value={adjustForm.quantity} onChange={e => setAdjustForm(f => ({ ...f, quantity: Number(e.target.value) }))}/></div>
            <div className="space-y-2"><Label>사유</Label><Input value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>취소</Button>
            <Button onClick={() => adjustMutation.mutate()} disabled={!adjustForm.quantity || !adjustForm.reason}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);
}
