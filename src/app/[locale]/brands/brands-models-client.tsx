'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import {
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
} from '@/lib/supabase/catalog-actions';

type Brand = { id: string; name: string; is_active: boolean };
type Model = { id: string; name: string; is_active: boolean; brand_id: string };

export default function BrandsModelsClient({
  locale,
  brands,
  models,
}: {
  locale: string;
  brands: Brand[];
  models: Model[];
}) {
  const isThai = locale === 'th';
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <BrandSection locale={locale} title={isThai ? 'ยี่ห้อ' : 'Brands'} brands={brands} />
      <ModelSection locale={locale} title={isThai ? 'รุ่น' : 'Models'} brands={brands} models={models} />
    </div>
  );
}

/* Brands */
function BrandSection({ locale, title, brands }: { locale: string; title: string; brands: Brand[] }) {
  const isThai = locale === 'th';
  const L = (th: string, en: string) => (isThai ? th : en);
  const router = useRouter();
  const [, start] = useTransition();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const refresh = () => start(() => router.refresh());
  const em = (c?: string) => (c === 'exists' ? L('มีอยู่แล้ว', 'Already exists') : L('ดำเนินการไม่สำเร็จ', 'Action failed'));

  async function add() {
    const n = name.trim(); if (!n) return;
    const res = await createCatalogItem(locale, 'brand', n);
    if (res?.error) { setErr(em(res.error)); return; }
    setName(''); setErr(null); refresh();
  }
  async function save(id: string) {
    const n = editName.trim(); if (!n) { setEditingId(null); return; }
    const res = await updateCatalogItem(locale, 'brand', id, { name: n });
    if (res?.error) { setErr(em(res.error)); return; }
    setEditingId(null); setErr(null); refresh();
  }
  async function remove(id: string) {
    if (!confirm(L('ลบยี่ห้อนี้? รุ่นทั้งหมดของยี่ห้อนี้จะถูกลบด้วย', 'Delete this brand? All its models will be deleted too.'))) return;
    const res = await deleteCatalogItem(locale, 'brand', id);
    if (res?.error) { setErr(em(res.error)); return; }
    setErr(null); refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <h2 className="font-semibold text-slate-900 dark:text-white mb-3">
        {title} <span className="text-slate-400 font-normal">({brands.length})</span>
      </h2>
      <div className="flex gap-2 mb-3">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder={L('เพิ่มยี่ห้อ…', 'Add brand…')} className="input flex-1" />
        <button onClick={add} disabled={!name.trim()}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          <Plus className="h-4 w-4" /> {L('เพิ่ม', 'Add')}
        </button>
      </div>
      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {brands.length === 0 && <li className="py-3 text-sm text-slate-400">{L('ยังไม่มีข้อมูล', 'No items yet')}</li>}
        {brands.map((b) => (
          <li key={b.id} className="flex items-center gap-2 py-2">
            {editingId === b.id ? (
              <>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') save(b.id); if (e.key === 'Escape') setEditingId(null); }} className="input flex-1" />
                <button onClick={() => save(b.id)} className="text-emerald-600"><Check className="h-4 w-4" /></button>
                <button onClick={() => setEditingId(null)} className="text-slate-400"><X className="h-4 w-4" /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-slate-800 dark:text-slate-100">{b.name}</span>
                <button onClick={() => { setEditingId(b.id); setEditName(b.name); }} className="text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove(b.id)} className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Models (belong to a brand) */
function ModelSection({ locale, title, brands, models }: { locale: string; title: string; brands: Brand[]; models: Model[] }) {
  const isThai = locale === 'th';
  const L = (th: string, en: string) => (isThai ? th : en);
  const router = useRouter();
  const [, start] = useTransition();
  const [brandId, setBrandId] = useState('');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const refresh = () => start(() => router.refresh());
  const em = (c?: string) => (c === 'exists' ? L('มีอยู่แล้วในยี่ห้อนี้', 'Already exists for this brand') : c === 'brandRequired' ? L('กรุณาเลือกยี่ห้อ', 'Please select a brand') : L('ดำเนินการไม่สำเร็จ', 'Action failed'));

  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? '—';

  async function add() {
    const n = name.trim();
    if (!brandId) { setErr(em('brandRequired')); return; }
    if (!n) return;
    const res = await createCatalogItem(locale, 'model', n, brandId);
    if (res?.error) { setErr(em(res.error)); return; }
    setName(''); setErr(null); refresh();
  }
  async function save(id: string) {
    const n = editName.trim(); if (!n) { setEditingId(null); return; }
    const res = await updateCatalogItem(locale, 'model', id, { name: n });
    if (res?.error) { setErr(em(res.error)); return; }
    setEditingId(null); setErr(null); refresh();
  }
  async function remove(id: string) {
    if (!confirm(L('ลบรุ่นนี้?', 'Delete this model?'))) return;
    const res = await deleteCatalogItem(locale, 'model', id);
    if (res?.error) { setErr(em(res.error)); return; }
    setErr(null); refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <h2 className="font-semibold text-slate-900 dark:text-white mb-3">
        {title} <span className="text-slate-400 font-normal">({models.length})</span>
      </h2>
      <div className="flex flex-wrap gap-2 mb-3">
        <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="input w-32">
          <option value="">{L('ยี่ห้อ', 'Brand')}</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder={L('เพิ่มรุ่น…', 'Add model…')} className="input flex-1 min-w-[8rem]" />
        <button onClick={add} disabled={!name.trim() || !brandId}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          <Plus className="h-4 w-4" /> {L('เพิ่ม', 'Add')}
        </button>
      </div>
      {brands.length === 0 && <p className="text-xs text-amber-600 mb-2">{L('เพิ่มยี่ห้อก่อน', 'Add a brand first')}</p>}
      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {models.length === 0 && <li className="py-3 text-sm text-slate-400">{L('ยังไม่มีข้อมูล', 'No items yet')}</li>}
        {models.map((m) => (
          <li key={m.id} className="flex items-center gap-2 py-2">
            {editingId === m.id ? (
              <>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') save(m.id); if (e.key === 'Escape') setEditingId(null); }} className="input flex-1" />
                <button onClick={() => save(m.id)} className="text-emerald-600"><Check className="h-4 w-4" /></button>
                <button onClick={() => setEditingId(null)} className="text-slate-400"><X className="h-4 w-4" /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-slate-800 dark:text-slate-100">
                  {m.name} <span className="text-xs text-slate-400">· {brandName(m.brand_id)}</span>
                </span>
                <button onClick={() => { setEditingId(m.id); setEditName(m.name); }} className="text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove(m.id)} className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
