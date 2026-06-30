# Phase 5 — Customer Management (เสร็จแล้ว)

## สิ่งที่เพิ่มเข้ามา

**หน้ารายชื่อลูกค้า** `/[locale]/customers`:
- ค้นหาชื่อ/นามสกุล/เบอร์โทร/เลขบัตรประชาชน (trigram index จาก Phase 1)
- Pagination 20 รายการ/หน้า
- เพิ่มลูกค้าใหม่ (staff ถูกล็อกสาขาให้อัตโนมัติเหมือน Phase 4)

**หน้าโปรไฟล์ลูกค้า** `/[locale]/customers/[id]` — ตรงตาม spec Module 3 ครบ:
- **ข้อมูลติดต่อ + ผู้ค้ำประกัน** พร้อมไอคอนอ่านง่าย
- **ประวัติสัญญา (Contract History)** — แสดงทุกสัญญาที่ลูกค้าเคยทำ พร้อมสถานะ (ใช้งานอยู่/เสร็จสิ้น/ค้างชำระ/ยกเลิก)
- **ประวัติการชำระเงิน (Payment History)** — คลิกที่สัญญาแต่ละรายการเพื่อขยายดูตารางงวดผ่อนทั้งหมด (งวดที่, วันครบกำหนด, ยอดที่ต้องชำระ, ยอดที่ชำระแล้ว, วันที่ชำระจริง, สถานะ)
- แก้ไขข้อมูลลูกค้าได้จากหน้าโปรไฟล์โดยตรง

## ไฟล์ที่เพิ่ม

```
src/app/[locale]/customers/
├── page.tsx                  # server: search + pagination
├── customer-table.tsx          # client: list, search bar
├── customer-form-modal.tsx     # client: add/edit form (ใช้ร่วมกันทั้ง 2 หน้า)
└── [id]/
    ├── page.tsx               # server: ดึง customer + contracts + payments แบบ join เดียว
    └── profile-client.tsx      # client: header, contract/payment history accordion
src/lib/supabase/customer-actions.ts   # server actions, branch-scoped + RLS-backed
```

## หมายเหตุ

- หน้าโปรไฟล์ดึงข้อมูลสัญญาและการชำระเงินด้วย query เดียว (`contracts(*, vehicles(...), payments(*))`) ไม่ query วนซ้ำ — เร็วแม้ลูกค้ามีหลายสัญญา
- ทุกอย่างพร้อมต่อกับ Phase 6 (สัญญาผ่อนชำระ) ที่จะมาเพิ่มปุ่ม "สร้างสัญญาใหม่" จากหน้านี้ได้เลย

## ค้างไว้: เพิ่มฟิลด์ "บริษัทที่ซื้อ" ในคลังรถยนต์

ตามที่คุยกันไว้ — รอเพิ่มหลังจบ Phase ถัดไปได้เลยครับ แค่บอกว่า "ทำฟิลด์บริษัทที่ซื้อ" เมื่อพร้อม

## ต่อไป: Phase 6 — สัญญาผ่อนชำระ

พิมพ์ "continue" เพื่อสร้างหน้าสร้าง/แก้ไขสัญญา พร้อมคำนวณยอดผ่อนและยอดคงเหลืออัตโนมัติ
