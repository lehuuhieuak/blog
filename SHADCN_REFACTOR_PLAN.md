# Refactor frontend shadcn trong worktree riêng

## Summary

- Tiền điều kiện: commit WIP xoá cover image trên nhánh `dev`, gồm cả cập nhật `PLAN.md`.
- Tạo `/home/hieulh/blog-shadcn-ui` từ commit đó, branch `refactor/shadcn-frontend`; không mang bất kỳ thay đổi chưa commit nào còn lại từ workspace gốc.
- Cập nhật `PLAN.md` để cho phép client islands shadcn/Base UI ở public UI, nhưng dữ liệu và Markdown vẫn SSR; không biến site thành SPA.

## Implementation Changes

- Thêm các primitive Base Nova cần thiết qua shadcn CLI: `accordion`, `navigation-menu`, `scroll-area`, và `field`; chỉ giữ dependency/lockfile do CLI thực sự thay đổi.
- Loại bỏ `LinkButton` và `server-button-styles`; dùng trực tiếp `Button` với Base UI `render` cho các link dạng control, filter, pagination và action.
- Thiết kế lại public/admin UI với shadcn + Tailwind utilities:
  - Header dùng `NavigationMenu`; theme toggle, alerts, badges, tables, field editor, dialog xóa và pagination dùng component shadcn trực tiếp.
  - Mục lục dùng `Accordion` ở mobile và `ScrollArea` sticky ở desktop; giữ inline scrollspy không framework, không đổi URL/focus/trạng thái accordion.
  - Giữ layout đọc tối giản, một cột nội dung, neutral tokens, không thêm card/shadow trang trí trái với `PLAN.md`.
- Chuyển toàn bộ layout/spacing/typography của route và shared component sang utilities; xoá các selector custom không còn cần trong `global.css`.
- Giữ CSS toàn cục chỉ cho shadcn theme tokens/base reset, reduced motion, và typography/layout của HTML Markdown đã được backend sanitize. Không thay đổi API, schema hay pipeline render Markdown.

## Test Plan

- Cập nhật Playwright từ legacy class selector sang role và `data-*` ổn định; kiểm tra keyboard navigation, theme, Accordion TOC, ScrollArea sticky, scrollspy, editor preview, AlertDialog và responsive không tràn ngang.
- Chạy trong worktree: `npm run check`, `npm run test`, `npm run build`, và `npm run test:e2e` khi backend E2E sẵn sàng.
- Không commit hoặc push sau refactor nếu không có yêu cầu riêng.

## Assumptions

- Commit WIP là base duy nhất cho worktree và đã đồng bộ việc bỏ cover image với `PLAN.md`.
- Ưu tiên dùng trực tiếp shadcn Base UI, chấp nhận hydration cho các primitive UI; public content/data fetching vẫn server-rendered.
