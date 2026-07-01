'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import {
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  type CatalogKind,
} from '@/lib/supabase/catalog-actions';

type Item = { id: string; name: string; is_active: boolean };

export default function BrandsModelsClient({
  locale,
  brands,
  models,
}: {
  locale: string;
  brands: Item[];
  models: Item[];
}) {
  const isThai = locale === 'th';
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <CatalogSection locale={locale} kind="brand" title={isThai ? 'ยี่ห้อ' : 'Brands'} items={brands} />
      <CatalogSection locale={locale} kind="model" title={isThai ? 'รุ่น' : 'Models'} items={models} />
    </div>
  );
}

function CatalogSection({
  locale,
  kind,
  title,
  items,
}: {
  locale: string;
  kind: CatalogKind;
  title: string;
  items: Item[];
}) {
  const isThai = locale === 'th';
  const L = (th: string, en: string) => (isThai ? th : en);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => startTransition(() => router.refresh());
  const errText = (code?: string) =>
    code === 'exists' ? L('มีอยู่แล้ว', 'Already exists') : L('ดำเนินการไม่สำเร็จ', 'Action failed');

  async function add() {
    const n = newName.trim();
    if (!n) return;
    setBusy(true); setErr(null);
    const res = await createCatalogItem(locale, kind, n);
    setBusy(false);
    if (res?.error) { setErr(errText(res.error)); return; }
    setNewName(''); refresh();
  }

  async function save(id: string) {
    const n = editName.trim();
    if (!n) { setEditingId(null); return; }
    setErr(null);
    const res = await updateCatalogItem(locale, kind, id, { name: n });
    if (res?.error) { setErr(errText(res.error)); return; }
    setEditingId(null); refresh();
  }

  async function remove(id: string) {
    if (!confirm(L('ลบรายการนี้?', 'Delete this item?'))) return;
    setErr(null);
    const res = await deleteCatalogItem(locale, kind, id);
    if (res?.error) { setErr(errText(res.error)); return; }
    refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <h2 className="font-semibold text-slate-900 dark:text-white mb-3">
        {title} <span className="text-slate-400 font-normal">({items.length})</span>
      </h2>

      <div className="flex gap-2 mb-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder={L('เพิ่มรายการ…', 'Add new…')}
          className="input flex-1"
        />
        <button
          onClick={add}
          disabled={busy || !newName.trim()}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {L('เพิ่ม', 'Add')}
        </button>
      </div>

      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.length === 0 && (
          <li className="py-3 text-sm text-slate-400">{L('ยังไม่มีข้อมูล', 'No items yet')}</li>
        )}
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2 py-2">
            {editingId === it.id ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') save(it.id); if (e.key === 'Escape') setEditingId(null); }}
                  autoFocus
                  className="input flex-1"
                />
                <button onClick={() => save(it.id)} className="text-emerald-600 hover:text-emerald-700" aria-label="save">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600" aria-label="cancel">
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-slate-800 dark:text-slate-100">{it.name}</span>
                <button
                  onClick={() => { setEditingId(it.id); setEditName(it.name); }}
                  className="text-blue-600 hover:text-blue-700"
                  aria-label="edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove(it.id)} className="text-red-600 hover:text-red-700" aria-label="delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
