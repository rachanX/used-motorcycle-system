# Phase 2 — Authentication + User Management (เสร็จแล้ว)

## สิ่งที่เพิ่มเข้ามา

- **Next.js 15 app จริง** พร้อม Tailwind + สลับภาษาไทย/อังกฤษได้ทันที (`/th/...` และ `/en/...`)
- **Supabase Auth**: หน้า Login (`/[locale]/login`), session ผ่าน cookie, middleware ป้องกันทุกหน้าที่ต้อง login
- **Auto-provision ผู้ใช้**: เมื่อมีคนสมัคร/ถูก invite ผ่าน Supabase Auth ระบบจะสร้างแถวใน `public.users` ให้อัตโนมัติ (role เริ่มต้น = staff)
- **หน้าจัดการผู้ใช้ (Developer only)**: `/[locale]/users` — เชิญผู้ใช้ใหม่ทางอีเมล, แก้ไข role/สาขา/สถานะ, ป้องกันไม่ให้ลดสิทธิ์ตัวเอง
- **Audit log อัตโนมัติ**: login / logout / failed login ถูกบันทึกผ่าน RPC `log_auth_event`
- **App Shell**: sidebar เมนูที่ปรับตาม role (Staff ไม่เห็นเมนู "จัดการผู้ใช้", "บันทึกการใช้งาน", "ตั้งค่าระบบ" เลย — ทั้งซ่อนใน UI และบล็อกด้วย RLS ที่ฐานข้อมูล), Dark mode, สลับภาษา
- **Dashboard เริ่มต้น**: ดึงข้อมูลจริงจาก `v_dashboard_summary` (Phase 9 จะมาทำให้สมบูรณ์ขึ้น)

## โครงสร้างโฟลเดอร์ใหม่

```
used-car-system/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # root html/body shell, dark-mode script
│   │   ├── page.tsx                  # redirects "/" -> "/th/dashboard"
│   │   ├── globals.css
│   │   └── [locale]/
│   │       ├── layout.tsx            # i18n + AppShell wrapper
│   │       ├── login/
│   │       ├── dashboard/
│   │       └── users/                # developer-only
│   ├── components/
│   │   ├── app-shell.tsx             # sidebar/topbar, role-aware nav
│   │   └── language-switcher.tsx
│   ├── lib/supabase/
│   │   ├── client.ts                 # browser client
│   │   ├── server.ts                 # server client + getCurrentAppUser()
│   │   ├── middleware.ts             # session refresh helper
│   │   ├── auth-actions.ts           # login/logout server actions
│   │   └── user-actions.ts           # invite/update user (developer only)
│   ├── i18n/
│   │   ├── request.ts
│   │   └── messages/{th,en}.json
│   ├── middleware.ts                 # locale + auth + developer-route guard
│   └── types/database.types.ts
└── supabase/migrations/0004_auth_provisioning.sql
```

## วิธีรันบนเครื่อง (ฟรีทั้งหมด)

1. ทำตาม `README_PHASE1.md` ให้เสร็จก่อน (สร้างโปรเจกต์ Supabase + รัน migrations 0001-0003)
2. รัน migration ใหม่:
   ```bash
   supabase db push   # จะรัน 0004_auth_provisioning.sql ด้วย
   ```
3. ติดตั้งและรันโปรเจกต์:
   ```bash
   npm install
   cp .env.example .env.local   # แล้วใส่ค่า Supabase URL/Key จริง
   npm run dev
   ```
4. เปิด `http://localhost:3000` → จะ redirect ไปหน้า login ภาษาไทยทันที
5. **สมัครผู้ใช้คนแรก (เจ้าของระบบ)**: ใช้ Supabase Dashboard → Authentication → Add User เพื่อสร้างบัญชีแรก จากนั้นรัน SQL นี้ใน SQL Editor เพื่อเลื่อนตำแหน่งเป็น developer:
   ```sql
   update public.users set role = 'developer', branch_id = null
     where email = 'your-email@example.com';
   ```
6. Login ด้วยบัญชีนั้น → จะเห็นเมนู "จัดการผู้ใช้" ที่ staff คนอื่นจะไม่เห็นเลย

## ทำไม role check ถึงปลอดภัย

มีการตรวจสอบ 3 ชั้น:
1. **Middleware** — ซ่อน/บล็อกเส้นทางที่ developer-only แบบเร็ว (UX layer)
2. **Server Component / Server Action** — เช็ค `me.role !== 'developer'` ก่อนรันคำสั่งใดๆ จริง
3. **RLS ที่ฐานข้อมูล** — แม้มีคนเลี่ยงสองชั้นแรกได้ Postgres ก็จะปฏิเสธ query เอง (เช่น staff select `audit_logs` จะได้ผลลัพธ์ว่างเสมอ)

## ต่อไป: Phase 3 — Branch Management

พิมพ์ "continue with Phase 3" เมื่อพร้อม แล้วผมจะสร้างหน้าจัดการสาขา (เพิ่ม/แก้ไข/กรองสาขา) แบบ full code เหมือน Phase ที่ผ่านมา
