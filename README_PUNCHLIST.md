# Punch List — Used Motorcycle Management System (เสร็จแล้ว)

## 1. UI/UX — Logo + Branding

- วาง logo placeholder ไว้ที่ `/public/logo.png` (256×256, สี brand blue) — **แทนที่ด้วยโลโก้จริงของธุรกิจคุณได้เลยแค่ overwrite ไฟล์เดิม ไม่ต้องแก้โค้ด**
- ใช้ `next/image` แสดงโลโก้ที่: หน้า Login, Sidebar (desktop), Topbar (mobile)
- เปลี่ยนชื่อระบบเป็น "Used Motorcycle Management System" / "ระบบจัดการรถมอเตอร์ไซค์มือสอง" ทั้ง metadata และ UI

## 2. Icon Update — Car → Motorcycle

แทนที่ไอคอน `Car` ด้วย `Bike` (lucide-react ไม่มีไอคอน "Motorcycle" เฉพาะ — `Bike` คือไอคอนที่ใกล้เคียงที่สุดและเป็นที่นิยมใช้แทนกันในระบบจริง) ในทุกจุด: เมนู Sidebar, การ์ดแดชบอร์ด, ทางลัด

## 3. Contract Management — Edit Contract

ไฟล์ใหม่: `src/app/[locale]/contracts/[id]/edit-contract-modal.tsx` + `updateContractAction` ใน `contract-actions.ts`

**แก้ไขได้:** ค่างวดต่อเดือน, วันครบกำหนดชำระ, วันที่สิ้นสุดสัญญา, สถานะสัญญา (manual override)
**แก้ไขไม่ได้โดยเจตนา:** ราคาขาย, เงินดาวน์, ยอดไฟแนนซ์, จำนวนงวด, ลูกค้า, รถ — เพราะ trigger สร้างตารางผ่อนชำระไปแล้วตั้งแต่ตอนสร้างสัญญา (Phase 1) การแก้ค่าพวกนี้ภายหลังจะทำให้ตารางงวดไม่ตรงกับสัญญา จึงล็อกไว้เพื่อความถูกต้องของข้อมูล — ถ้าต้องการเปลี่ยนจริงๆ แนะนำให้ยกเลิกสัญญาเดิมแล้วสร้างใหม่

## 4. Motorcycle Faceplate — Repair Cost

- Migration `0006_punch_list_softdelete_repaircost.sql`: เพิ่มคอลัมน์ `repair_cost numeric(12,2)` ใน `vehicles`
- เพิ่มช่องกรอกในฟอร์มเพิ่ม/แก้ไขรถมอเตอร์ไซค์ (อยู่คู่กับราคาขาย)

## 5. Soft Delete + Confirmation Modal

**Migration 0006** เพิ่ม `deleted_at timestamptz` ให้ 5 ตาราง: customers, vehicles, contracts, notifications, branches — พร้อมอัปเดต RLS SELECT policies ให้กรอง `deleted_at is null` อัตโนมัติทุก query (แถวที่ถูกลบจะไม่โผล่ในแอปอีกเลย แต่ข้อมูลยังอยู่ในฐานข้อมูลเพื่อการตรวจสอบย้อนหลัง — ตรงตาม pattern audit-friendly ที่ระบบนี้ใช้อยู่แล้ว)

**Component ใหม่:** `src/components/confirm-modal.tsx` — modal "คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?" แบบใช้ซ้ำได้ทั่วทั้งระบบ ใช้แล้วใน: รถมอเตอร์ไซค์, ลูกค้า, สาขา, สัญญา (developer only), การแจ้งเตือน

**กฎความปลอดภัยที่ใส่เพิ่ม** (ป้องกันลบข้อมูลที่จะทำให้ระบบพัง):
- ลบรถที่ `status = financing` ไม่ได้ (ติดสัญญาอยู่)
- ลบลูกค้าที่มีสัญญา active ไม่ได้
- ลบสาขาที่ยังมีรถหรือพนักงานอยู่ไม่ได้
- ลบสัญญาที่ยัง active ไม่ได้ (ต้องยกเลิกก่อน)
- การลบทั้งหมด (ยกเว้น mark-read ของแจ้งเตือน) จำกัดเฉพาะ Developer

## 6. Payments Module — Two-Layer UI

**Layer 1** `/payments` — เขียนใหม่ทั้งหมด แสดง 1 แถวต่อ 1 สัญญา (ไม่ใช่ 1 แถวต่อ 1 งวดเหมือนเดิม): ชื่อลูกค้า, รถ, งวดที่ชำระแล้ว/ทั้งหมด, ยอดคงเหลือ, สถานะ — ดึงจาก view ใหม่ `v_contract_payment_summary` ที่สร้างไว้ใน migration 0006 (คำนวณที่ฐานข้อมูล ไม่ใช่ vehicles client)

**Layer 2** `/payments/[contractId]` — คลิกแถวในหน้า Layer 1 แล้วเข้ามาดูตารางงวดผ่อนชำระแบบเต็มของสัญญานั้น พร้อมปุ่มบันทึกการชำระเงิน (ใช้ modal เดิมจาก Phase 7 ไม่ได้เขียนใหม่)

## ไฟล์ที่เพิ่ม/แก้ไขทั้งหมด

```
supabase/migrations/0006_punch_list_softdelete_repaircost.sql   # NEW
public/logo.png                                                  # NEW (placeholder)
src/components/confirm-modal.tsx                                 # NEW
src/components/notification-bell.tsx                              # (unchanged, no edit needed)
src/app/[locale]/contracts/[id]/edit-contract-modal.tsx           # NEW
src/app/[locale]/payments/contract-summary-table.tsx              # NEW (Layer 1)
src/app/[locale]/payments/[contractId]/page.tsx                   # NEW (Layer 2)
src/app/[locale]/payments/[contractId]/payment-detail-client.tsx  # NEW (Layer 2)
src/app/[locale]/payments/payment-table.tsx                       # REMOVED (superseded)
src/app/[locale]/payments/page.tsx                                # REWRITTEN
src/lib/supabase/vehicle-actions.ts      # + softDeleteVehicleAction, repair_cost
src/lib/supabase/customer-actions.ts     # + softDeleteCustomerAction
src/lib/supabase/branch-actions.ts       # + softDeleteBranchAction
src/lib/supabase/contract-actions.ts     # + updateContractAction, softDeleteContractAction
src/lib/supabase/notification-actions.ts # + softDeleteNotificationAction
src/types/database.types.ts              # + deleted_at, repair_cost, ContractPaymentSummary
src/app/[locale]/{vehicles,customers,branches}/*-table.tsx   # delete buttons wired in
src/app/[locale]/login/page.tsx, src/components/app-shell.tsx  # logo + Bike icon
```

ทุก server action ใหม่ยังคงหลักการเดิมของระบบ: **Server Actions only**, ตรวจสอบ role + branch-scope ที่ระดับโค้ดก่อนเสมอ, และพึ่ง RLS เป็นชั้นป้องกันสุดท้ายที่ฐานข้อมูล — ไม่มี action ไหนข้ามขั้นตอนนี้

## ขั้นตอนอัปเดต

```bash
supabase db push   # รัน 0006_punch_list_softdelete_repaircost.sql
npm install        # ไม่มี dependency ใหม่ ใช้ของเดิมทั้งหมด
```

แทนที่ `/public/logo.png` ด้วยโลโก้จริงของธุรกิจ (ขนาดแนะนำ 256×256 หรือใหญ่กว่า, พื้นหลังโปร่งใสหรือสี่เหลี่ยมก็ได้ — โค้ด render เป็นสี่เหลี่ยมมุมโค้งให้อัตโนมัติ)
