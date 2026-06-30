'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'th';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [hasSession, setHasSession] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Check if we have a valid recovery session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setHasSession(true);
      }
    });

    // Listen for the PASSWORD_RECOVERY event (hash-based flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMessage(locale === 'th' ? 'รหัสผ่านไม่ตรงกัน' : 'Passwords do not match');
      setStatus('error');
      return;
    }
    if (password.length < 6) {
      setMessage(locale === 'th' ? 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' : 'Password must be at least 6 characters');
      setStatus('error');
      return;
    }

    setStatus('loading');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setStatus('error');
    } else {
      setStatus('success');
      setMessage(locale === 'th' ? 'เปลี่ยนรหัสผ่านสำเร็จ! กำลังไปหน้า Login...' : 'Password updated! Redirecting to login...');
      setTimeout(() => {
        supabase.auth.signOut().then(() => router.push(`/${locale}/login`));
      }, 2000);
    }
  }

  const labelTitle = locale === 'th' ? 'ตั้งรหัสผ่านใหม่' : 'Set New Password';
  const labelNew = locale === 'th' ? 'รหัสผ่านใหม่' : 'New Password';
  const labelConfirm = locale === 'th' ? 'ยืนยันรหัสผ่าน' : 'Confirm Password';
  const labelBtn = locale === 'th' ? 'บันทึกรหัสผ่าน' : 'Save Password';
  const labelNoSession = locale === 'th'
    ? 'ลิงก์รีเซ็ตรหัสผ่านหมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่อีกครั้ง'
    : 'Reset link is invalid or expired. Please request a new one.';

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 text-sm">{labelNoSession}</p>
          <button
            onClick={() => router.push(`/${locale}/login`)}
            className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {locale === 'th' ? 'กลับหน้า Login' : 'Back to Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">{labelTitle}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {labelNew}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {labelConfirm}
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {message && (
            <p className={`text-sm ${status === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5"
          >
            {status === 'loading' ? '...' : labelBtn}
          </button>
        </form>
      </div>
    </div>
  );
}
