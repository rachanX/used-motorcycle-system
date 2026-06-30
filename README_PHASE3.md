# Phase 3 — Branch Management (เสร็จแล้ว)

## สิ่งที่เพิ่มเข้ามา

หน้า `/[locale]/branches` ใช้งานได้จริง:

- **เพิ่มสาขา / แก้ไขสาขา** — เฉพาะ Developer (ปุ่มและฟอร์มจะไม่แสดงให้ staff เห็นเลย, ปุ่ม "เพิ่มสาขา" และ "แก้ไข" ถูกซ่อนตาม role + RLS บล็อกซ้ำที่ฐานข้อมูลอีกชั้น)
- **ค้นหา** ชื่อสาขา/รหัสสาขา และ **กรองตามสถานะ** (เปิดใช้งาน/ปิดใช้งาน) — ทำงานผ่าน URL query params (`?q=...&status=...`) จึง share ลิงก์ได้และ refresh แล้วยังกรองอยู่
- แต่ละการ์ดสาขาแสดง **จำนวนรถในสาขานั้น** (นับจากตาราง vehicles แบบ real-time)
- ตรวจสอบรหัสสาขาซ้ำ (unique constraint) และแสดงข้อความแจ้งเตือนเป็นภาษาที่เลือกอยู่
- Layout เป็นการ์อ grid ที่ responsive ทั้งมือถือ/แท็บเล็ต/เดสก์ท็อป ตรงตาม UI/UX requirement

## ไฟล์ที่เพิ่ม

```
src/app/[locale]/branches/
├── page.tsx              # server component: query + filter + search
├── branch-table.tsx       # client: search bar, filter, grid list
└── branch-form-modal.tsx  # client: add/edit form (useActionState)
src/lib/supabase/branch-actions.ts   # server actions, developer-only + RLS-backed
```

แปลภาษาเพิ่มใน `src/i18n/messages/th.json` และ `en.json` (namespace `branches`)

## ทดสอบ

1. `npm run dev` (ต่อจาก Phase 1-2)
2. Login ด้วยบัญชี developer → ไปที่เมนู "สาขา" → กด "เพิ่มสาขา"
3. Login ด้วยบัญชี staff (ที่ผูกกับสาขาใดสาขาหนึ่งในหน้า "จัดการผู้ใช้") → จะเห็นเฉพาะปุ่มค้นหา/กรอง ไม่มีปุ่มเพิ่ม/แก้ไข

## ต่อไป: Phase 4 — Vehicle Inventory

พิมพ์ "continue" หรือ "continue with Phase 4" เมื่อพร้อม แล้วผมจะสร้างหน้าคลังรถยนต์: ค้นหา, กรอง, เรียงลำดับ, pagination พร้อมรองรับข้อมูล 10,000+ คัน
