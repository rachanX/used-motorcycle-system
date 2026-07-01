import { redirect } from 'next/navigation';
import { isPowerUser } from '@/lib/auth/roles';
import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import BrandsModelsClient from './brands-models-client';

export const dynamic = 'force-dynamic';

export default async function BrandsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const me = await getCurrentAppUser();
  if (!me || !isPowerUser(me.role)) redirect(`/${locale}/dashboard`);

  const supabase = await createClient();
  const [{ data: brands }, { data: models }] = await Promise.all([
    supabase.from('motorcycle_brands').select('id, name, is_active').order('name'),
    supabase.from('motorcycle_models').select('id, name, is_active').order('name'),
  ]);

  const isThai = locale === 'th';
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {isThai ? 'ยี่ห้อ / รุ่น' : 'Brands & Models'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isThai
            ? 'จัดการรายการยี่ห้อและรุ่น สำหรับเลือกในฟอร์มเพิ่ม/แก้ไขรถ'
            : 'Manage the brand and model options used in the motorcycle form.'}
        </p>
      </div>
      <BrandsModelsClient
        locale={locale}
        brands={(brands ?? []) as any}
        models={(models ?? []) as any}
      />
    </div>
  );
}
