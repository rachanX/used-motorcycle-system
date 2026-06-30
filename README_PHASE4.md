# Phase 4 — Vehicle Inventory (เสร็จแล้ว)

## สิ่งที่เพิ่มเข้ามา

หน้า `/[locale]/vehicles`:

- **ค้นหา**: รหัสสต็อก, ยี่ห้อ, รุ่น, ทะเบียน, VIN (ใช้ trigram index จาก Phase 1 ทำให้เร็วแม้มี 10,000+ คัน)
- **กรอง**: ตามสถานะ (พร้อมขาย/จอง/ผ่อน/ขายสด/ปิดสัญญา) และตามสาขา
- **เรียงลำดับ**: ใหม่ล่าสุด, ราคาต่ำ-สูง, ราคาสูง-ต่ำ, ปีใหม่-เก่า
- **Pagination**: 20 รายการ/หน้า ใช้ `range()` ของ Supabase ไม่โหลดข้อมูลทั้งหมดมาที่ client
- ทุกตัวกรองอยู่ใน URL (`?q=...&status=...&branch=...&sort=...&page=...`) — แชร์ลิงก์หรือ bookmark ได้
- **เพิ่ม/แก้ไขรถยนต์**: staff เพิ่มได้เฉพาะสาขาตัวเอง (ฟอร์มล็อกสาขาให้อัตโนมัติ), developer เพิ่มได้ทุกสาขา — ตรวจสอบซ้ำทั้งฝั่ง client และ RLS ฐานข้อมูล
- ตรวจจับรหัสสต็อก/VIN ซ้ำ และแจ้งเตือนเป็นภาษาที่เลือกอยู่

## ไฟล์ที่เพิ่ม

```
src/app/[locale]/vehicles/
├── page.tsx              # server: search+filter+sort+pagination query
├── vehicle-table.tsx       # client: filter bar, table, pagination controls
└── vehicle-form-modal.tsx  # client: add/edit form (14 ฟิลด์ตาม spec)
src/lib/supabase/vehicle-actions.ts   # server actions, branch-scoped + RLS-backed
```

## หมายเหตุเรื่อง performance (รองรับ 10,000+ คัน)

- ใช้ `select(..., { count: 'exact' })` คู่กับ `.range()` — query เดียวได้ทั้งหน้าข้อมูลและจำนวนรวม
- ไม่มีการดึงข้อมูลทั้งตารางมา filter ที่ฝั่ง client เลย ทุกอย่าง filter/sort/paginate ที่ฐานข้อมูล
- Index ที่ใช้: `idx_vehicles_branch`, `idx_vehicles_status`, `idx_vehicles_search_trgm`, `idx_vehicles_created_at` (สร้างไว้แล้วใน Phase 1)

## ต่อไป: Phase 5 — Customer Management

พิมพ์ "continue" เมื่อพร้อม แล้วผมจะสร้างหน้าจัดการลูกค้า: โปรไฟล์ลูกค้า, ประวัติสัญญา, ประวัติการชำระเงิน, ค้นหาลูกค้า
