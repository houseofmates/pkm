import React, { useEffect, useMemo, useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ShowerHead, Sparkles, Loader2, Check, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { generateVerticalThumbnail, getGeminiApiKey } from '@/lib/vertex-image';
import api from '@/api/nocobase-client';
import { toast } from 'sonner';
import { secureLogger } from '@/lib/secure-logger';

interface ShowerLoggerModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
}

interface ProductRecord {
  id: string | number;
  name: string;
  brand?: string;
  category?: string;
  expiryDate?: string;
  cost?: string;
  linkTo?: string;
}

function toDisplayValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.label === 'string') return obj.label;
    if (typeof obj.value === 'string' || typeof obj.value === 'number') return String(obj.value);
    if (typeof obj.name === 'string') return obj.name;
  }
  return undefined;
}

function getBusinessDate(): Date {
  const d = new Date();
  if (d.getHours() >= 0 && d.getHours() < 5) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

export function ShowerLoggerModal({ isOpen, onClose }: ShowerLoggerModalProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);
  
  const [formData, setFormData] = useState({
    shaved: false,
    used_body_scrub: false,
    used_body_serum: false,
    used_lotion: false,
    completed_skincare: false,
    brushed_teeth: false,
    washed_hair: false,
    used_conditioner: false,
    applied_deodorant: false,
    shower_duration_minutes: 10,
    water_temp: 'warm',
    mood_before: 'fine',
    mood_after: 'good',
    notes: '',
  });

  const ensureProductsCollection = async () => {
    try {
      await api.getCollection('products');
      return;
    } catch {
      // continue to creation
    }

    await api.createCollection({
      name: 'products',
      title: 'products',
      fields: [
        { name: 'name', type: 'string', unique: true },
        { name: 'brand', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'notes', type: 'text' },
      ],
    });
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      await ensureProductsCollection();
      const res: any = await api.listRecords('products', { pageSize: 500, sort: 'name' });
      const records = (res?.data || []) as any[];
      const mapped: ProductRecord[] = records
        .filter((p) => p?.name)
        .map((p) => ({
          id: p.id,
          name: String(p.name),
          brand: toDisplayValue(p.brand),
          category: toDisplayValue(p.category),
          expiryDate: toDisplayValue(p['expiry-date']),
          cost: toDisplayValue(p.cost),
          linkTo: toDisplayValue(p['link-to']),
        }));
      setProducts(mapped);
    } catch (error: any) {
      secureLogger.error('failed to load products:', error);
      toast.error('failed to load products database');
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const filteredProducts = useMemo(() => {
    if (!productQuery.trim()) return products;
    const q = productQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
    );
  }, [products, productQuery]);

  const selectedProductNames = useMemo(() => {
    const selected = new Set(selectedProducts);
    return products.filter((p) => selected.has(String(p.id))).map((p) => p.name);
  }, [products, selectedProducts]);

  const handleToggle = (field: keyof typeof formData) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleToggleProduct = (id: string | number) => {
    const key = String(id);
    setSelectedProducts((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleAddProduct = async () => {
    const name = newProductName.trim();
    if (!name) return;
    setAddingProduct(true);
    try {
      const created: any = await api.createRecord('products', { name });
      const createdId = created?.data?.id;
      await loadProducts();
      if (createdId !== undefined && createdId !== null) {
        setSelectedProducts((prev) => [...prev, String(createdId)]);
      }
      setNewProductName('');
      toast.success('product added');
    } catch (error: any) {
      secureLogger.error('failed to add product:', error);
      toast.error('failed to add product');
    } finally {
      setAddingProduct(false);
    }
  };

  const handleGenerateThumbnail = async () => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      toast.error('AI API Key is missing. Please set it up in settings (press Command+Shift+P and search for AI Settings).');
      return;
    }

    setGenerating(true);
    try {
      const logDate = getBusinessDate();
      const formattedDate = format(logDate, 'MMMM do, yyyy');
      
      const prompt = `create a cinematic 16:9 vertical portrait containing a lone beautiful female anime character relaxing in a neon-lit futuristic bathtub. the image must have a deep space dark background, vibrant yellow and powder blue lighting, and text overlay that reads exactly '${formattedDate}' in varela round font in the top left corner.`;
      
      const url = await generateVerticalThumbnail(prompt, apiKey);
      setThumbnailUrl(url);
      toast.success('Motivating thumbnail generated!');
    } catch (error: any) {
      secureLogger.error('Failed to generate thumbnail:', error);
      toast.error('Failed to generate image: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const logDate = getBusinessDate();
      const fullPayload = {
        date: format(logDate, 'yyyy-MM-dd'),
        products_used: selectedProductNames,
        shaved: formData.shaved,
        used_body_scrub: formData.used_body_scrub,
        used_body_serum: formData.used_body_serum,
        used_lotion: formData.used_lotion,
        completed_skincare: formData.completed_skincare,
        brushed_teeth: formData.brushed_teeth,
        washed_hair: formData.washed_hair,
        used_conditioner: formData.used_conditioner,
        applied_deodorant: formData.applied_deodorant,
        shower_duration_minutes: formData.shower_duration_minutes,
        water_temp: formData.water_temp,
        mood_before: formData.mood_before,
        mood_after: formData.mood_after,
        notes: formData.notes,
        thumbnail_url: thumbnailUrl,
      };

      try {
        await api.createRecord('hygiene_logs', fullPayload);
      } catch {
        await api.createRecord('hygiene_logs', {
          date: fullPayload.date,
          products_used: fullPayload.products_used,
          shaved: fullPayload.shaved,
          used_body_scrub: fullPayload.used_body_scrub,
          used_body_serum: fullPayload.used_body_serum,
          used_lotion: fullPayload.used_lotion,
          completed_skincare: fullPayload.completed_skincare,
          brushed_teeth: fullPayload.brushed_teeth,
          thumbnail_url: fullPayload.thumbnail_url,
        });
      }

      toast.success('Shower log saved successfully!');
      onClose(false);
      // Reset form
      setFormData({
        shaved: false,
        used_body_scrub: false,
        used_body_serum: false,
        used_lotion: false,
        completed_skincare: false,
        brushed_teeth: false,
        washed_hair: false,
        used_conditioner: false,
        applied_deodorant: false,
        shower_duration_minutes: 10,
        water_temp: 'warm',
        mood_before: 'fine',
        mood_after: 'good',
        notes: '',
      });
      setSelectedProducts([]);
      setProductQuery('');
      setThumbnailUrl(null);
    } catch (error: any) {
      secureLogger.error('Failed to save shower log:', error);
      toast.error('Failed to save log: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-[#050505] border-white/10 text-white font-varela">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold lowercase tracking-tight">
            <ShowerHead className="h-6 w-6 text-[#3c9fdd]" />
            shower logger
          </DialogTitle>
          <DialogDescription className="text-white/60 lowercase">
            track your hygiene routine and generate some motivation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="products-search" className="text-sm font-medium text-white/80 lowercase">products used</Label>
            <Input
              id="products-search"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="search products..."
              className="bg-black/50 border-white/10 focus:border-[#f5af12]/50 text-white"
            />
            <div className="max-h-36 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-2 space-y-1">
              {productsLoading && <p className="text-xs text-white/50 lowercase px-1 py-1">loading products...</p>}
              {!productsLoading && filteredProducts.length === 0 && (
                <p className="text-xs text-white/50 lowercase px-1 py-1">no matching products yet</p>
              )}
              {!productsLoading && filteredProducts.map((product) => {
                const selected = selectedProducts.includes(String(product.id));
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleToggleProduct(product.id)}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-sm lowercase transition-colors"
                    style={{
                      backgroundColor: selected ? 'rgba(245, 175, 18, 0.18)' : 'rgba(255,255,255,0.03)',
                      border: selected ? '1px solid rgba(245, 175, 18, 0.45)' : '1px solid rgba(255,255,255,0.08)',
                      color: selected ? '#f5af12' : 'rgba(255,255,255,0.85)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        {product.name}
                        {product.brand ? ` · ${product.brand}` : ''}
                      </span>
                      {product.cost && <span className="text-[11px] text-white/50">${product.cost}</span>}
                    </div>
                    <div className="mt-0.5 text-[10px] text-white/50 lowercase">
                      {product.category || 'uncategorized'}
                      {product.expiryDate ? ` · expires ${product.expiryDate}` : ''}
                      {product.linkTo ? ' · has link' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Input
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddProduct();
                  }
                }}
                placeholder="add a new product"
                className="bg-black/50 border-white/10 focus:border-[#f5af12]/50 text-white"
              />
              <Button
                type="button"
                onClick={handleAddProduct}
                disabled={addingProduct || !newProductName.trim()}
                className="bg-white/10 hover:bg-white/20 text-white lowercase"
              >
                {addingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            {selectedProductNames.length > 0 && (
              <p className="text-xs text-white/60 lowercase">{selectedProductNames.length} products selected</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <Label className="text-sm lowercase">shaved</Label>
              <Switch checked={formData.shaved} onCheckedChange={() => handleToggle('shaved')} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <Label className="text-sm lowercase">scrub</Label>
              <Switch checked={formData.used_body_scrub} onCheckedChange={() => handleToggle('used_body_scrub')} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <Label className="text-sm lowercase">serum</Label>
              <Switch checked={formData.used_body_serum} onCheckedChange={() => handleToggle('used_body_serum')} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <Label className="text-sm lowercase">lotion</Label>
              <Switch checked={formData.used_lotion} onCheckedChange={() => handleToggle('used_lotion')} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <Label className="text-sm lowercase">skincare</Label>
              <Switch checked={formData.completed_skincare} onCheckedChange={() => handleToggle('completed_skincare')} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <Label className="text-sm lowercase">teeth</Label>
              <Switch checked={formData.brushed_teeth} onCheckedChange={() => handleToggle('brushed_teeth')} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <Label className="text-sm lowercase">wash hair</Label>
              <Switch checked={formData.washed_hair} onCheckedChange={() => handleToggle('washed_hair')} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <Label className="text-sm lowercase">conditioner</Label>
              <Switch checked={formData.used_conditioner} onCheckedChange={() => handleToggle('used_conditioner')} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <Label className="text-sm lowercase">deodorant</Label>
              <Switch checked={formData.applied_deodorant} onCheckedChange={() => handleToggle('applied_deodorant')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-white/80 lowercase">duration (minutes)</Label>
              <Input
                type="number"
                min={1}
                max={120}
                value={formData.shower_duration_minutes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    shower_duration_minutes: Math.max(1, Math.min(120, Number(e.target.value) || 1)),
                  }))
                }
                className="bg-black/50 border-white/10 focus:border-[#f5af12]/50 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-white/80 lowercase">water temp</Label>
              <select
                value={formData.water_temp}
                onChange={(e) => setFormData((prev) => ({ ...prev, water_temp: e.target.value }))}
                className="h-10 rounded-md bg-black/50 border border-white/10 text-sm lowercase px-3 text-white"
              >
                <option value="cool">cool</option>
                <option value="warm">warm</option>
                <option value="hot">hot</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-white/80 lowercase">mood before</Label>
              <select
                value={formData.mood_before}
                onChange={(e) => setFormData((prev) => ({ ...prev, mood_before: e.target.value }))}
                className="h-10 rounded-md bg-black/50 border border-white/10 text-sm lowercase px-3 text-white"
              >
                <option value="terrible">terrible</option>
                <option value="bad">bad</option>
                <option value="fine">fine</option>
                <option value="good">good</option>
                <option value="great">great</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-white/80 lowercase">mood after</Label>
              <select
                value={formData.mood_after}
                onChange={(e) => setFormData((prev) => ({ ...prev, mood_after: e.target.value }))}
                className="h-10 rounded-md bg-black/50 border border-white/10 text-sm lowercase px-3 text-white"
              >
                <option value="terrible">terrible</option>
                <option value="bad">bad</option>
                <option value="fine">fine</option>
                <option value="good">good</option>
                <option value="great">great</option>
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-medium text-white/80 lowercase">notes</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="quick notes about this shower"
              className="bg-black/50 border-white/10 focus:border-[#f5af12]/50 text-white"
            />
          </div>

          <div className="space-y-3">
            <Button 
              variant="outline"
              onClick={handleGenerateThumbnail}
              disabled={generating}
              className="w-full bg-[#f5af12]/10 border-[#f5af12]/20 hover:bg-[#f5af12]/20 text-[#f5af12] lowercase gap-2 h-12 rounded-xl"
            >
              {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              generate motivating thumbnail
            </Button>

            {thumbnailUrl && (
              <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden border border-[#3c9fdd]/30 shadow-[0_0_20px_rgba(60,159,221,0.2)]">
                <img src={thumbnailUrl} alt="Motivation" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                  <Check className="h-4 w-4 text-[#3c9fdd]" />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="w-full bg-white text-black hover:bg-white/90 font-bold lowercase h-12 rounded-xl"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'save log'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
