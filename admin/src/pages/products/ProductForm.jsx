import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct } from '@/api/products';
import { PageHeader } from '@/components/common/PageHeader';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import { TagInput } from '@/components/common/TagInput';
import { FileUploader } from '@/components/common/FileUploader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
const categories = ['소설', '에세이', '인문', '경제/경영', '자기계발', 'IT/과학'];
export default function ProductFormPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        title: '', subtitle: '', author: '', publisher: '', publishedDate: '', isbn13: '',
        category: '', tags: [], price: 0, salePrice: 0, stock: 0,
        status: '판매중', description: '', images: [],
    });
    const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
    const mutation = useMutation({
        mutationFn: createProduct,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast({ title: '상품이 등록되었습니다.' }); navigate('/products'); },
        onError: () => toast({ title: '등록 실패', variant: 'destructive' }),
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title || !form.author || !form.publisher || !form.category) {
            toast({ title: '필수 항목을 입력해주세요.', variant: 'destructive' });
            return;
        }
        if (form.price <= 0) {
            toast({ title: '가격을 입력해주세요.', variant: 'destructive' });
            return;
        }
        mutation.mutate(form);
    };
    return (<div>
      <PageHeader title="상품 등록" description="새 도서를 등록합니다."/>
      <form onSubmit={handleSubmit} onKeyDown={e => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement)
        e.preventDefault(); }} className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2"><Label>제목 *</Label><Input value={form.title} onChange={e => set('title', e.target.value)} maxLength={200}/></div>
            <div className="space-y-2"><Label>부제</Label><Input value={form.subtitle} onChange={e => set('subtitle', e.target.value)}/></div>
            <div className="space-y-2"><Label>저자 *</Label><Input value={form.author} onChange={e => set('author', e.target.value)}/></div>
            <div className="space-y-2"><Label>출판사 *</Label><Input value={form.publisher} onChange={e => set('publisher', e.target.value)}/></div>
            <div className="space-y-2"><Label>출간일</Label><Input type="date" value={form.publishedDate} onChange={e => set('publishedDate', e.target.value)}/></div>
            <div className="space-y-2"><Label>ISBN13</Label><Input value={form.isbn13} onChange={e => set('isbn13', e.target.value)} maxLength={13} placeholder="9781234567890"/></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">분류/태그</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>카테고리 *</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue placeholder="카테고리 선택"/></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>태그</Label><TagInput value={form.tags} onChange={v => set('tags', v)}/></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">가격/재고</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>정가 *</Label><CurrencyInput value={form.price} onChange={v => set('price', v)}/></div>
            <div className="space-y-2"><Label>할인가</Label><CurrencyInput value={form.salePrice || 0} onChange={v => set('salePrice', v)}/></div>
            <div className="space-y-2"><Label>재고</Label><Input type="number" min={0} value={form.stock} onChange={e => set('stock', Math.max(0, Number(e.target.value)))}/></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">상세 설명</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={8} placeholder="도서 상세 설명을 입력하세요..."/>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">이미지</CardTitle></CardHeader>
          <CardContent><FileUploader images={form.images} onChange={v => set('images', v)}/></CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? '저장 중...' : '저장'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/products')}>취소</Button>
        </div>
      </form>
    </div>);
}
