# Pending Tasks - Epic 11

## ~~Database Permission Configuration Issue~~ ✅ COMPLETED (2026-01-08)

### Problem (RESOLVED)
The `PROPOSAL_CREATE` and `PROPOSAL_EDIT` permissions are not yet in the database.

### Solution Applied
- Ran `npx prisma db push` to sync schema
- Manually seeded role permissions:
  ```
  GIANG_VIEN -> PROPOSAL_CREATE
  GIANG_VIEN -> PROPOSAL_EDIT
  ```

### Result
GIANG_VIEN users now have PROPOSAL_CREATE and PROPOSAL_EDIT permissions. The "Tạo đề tài mới" button should be visible.
