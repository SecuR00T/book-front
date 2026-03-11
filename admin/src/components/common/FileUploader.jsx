import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Star, Loader2 } from 'lucide-react';
import { uploadProductImage } from '@/api/products';

export function FileUploader({ images, onChange, primaryIndex = 0, onPrimaryChange }) {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    const handleFiles = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploading(true);
        try {
            const uploaded = [];
            for (const file of files) {
                const result = await uploadProductImage(file);
                uploaded.push(result.url);
            }
            if (uploaded.length > 0) {
                onChange([...images, ...uploaded]);
            }
        } catch (err) {
            console.error('이미지 업로드 실패:', err);
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (<div className="space-y-3">
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden"/>
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading} aria-label="이미지 업로드">
        {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Upload className="h-4 w-4 mr-2"/>}
        {uploading ? '업로드 중...' : '이미지 추가'}
      </Button>
      {images.length > 0 && (<div className="flex flex-wrap gap-3">
          {images.map((img, i) => (<div key={i} className="relative group w-24 h-24 rounded-lg overflow-hidden border bg-muted">
              <img src={img} alt={`이미지 ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }}/>
              <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {onPrimaryChange && (<button type="button" onClick={() => onPrimaryChange(i)} className="p-1 rounded bg-card/80" aria-label="대표 이미지 설정">
                    <Star className={`h-4 w-4 ${i === primaryIndex ? 'text-warning fill-warning' : 'text-foreground'}`}/>
                  </button>)}
                <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} className="p-1 rounded bg-card/80" aria-label="이미지 삭제">
                  <X className="h-4 w-4 text-destructive"/>
                </button>
              </div>
            </div>))}
        </div>)}
    </div>);
}
