import { redirect } from 'next/navigation';

export default async function VehiclesRootPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/vehicles/overview`);
}
