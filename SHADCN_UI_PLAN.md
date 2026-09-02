# Tích hợp shadcn/ui vào frontend Astro

## Tóm tắt

- Giữ Astro 6 làm SSR server, router, page shell và SEO; không chuyển dự án thành React SPA.
- Thêm React renderer và Tailwind CSS 4 theo [hướng dẫn shadcn cho Astro](https://ui.shadcn.com/docs/installation/astro). Component tĩnh được SSR; chỉ theme toggle và editor được hydrate.
- Dùng shadcn Base Nova với Base UI — tên style hiện tại của primitive mặc định được [shadcn khuyến nghị cho dự án mới](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default).
- Giữ giao diện neutral tối giản, nền light trắng, system font, góc gần vuông và không thêm card/shadow trang trí.
- Cập nhật `PLAN.md`, `AGENTS.md`, README và kế hoạch UI trước khi sửa code vì quyết định “CSS thuần, không React/Tailwind” không còn đúng.

## Nền tảng và design system

- Cấu hình `@astrojs/react`, React 19, Tailwind 4 với `@tailwindcss/vite`, alias `@/*` và JSX TypeScript.
- Khởi tạo `components.json` trong `frontend/` với Base UI, `base-nova`, `neutral`, CSS variables, `rsc: false`, TypeScript, Lucide và pointer cursor.
- Cài có chọn lọc các primitive: `button`, `badge`, `alert`, `table`, `input`, `textarea`, `label`, `alert-dialog`, `pagination` và `separator`; không cài toàn bộ registry.
- Chuyển `global.css` sang cấu trúc Tailwind 4/shadcn, ánh xạ semantic tokens light/dark theo palette hiện tại và dùng `.dark` làm theme selector.
- Giữ CSS chuyên biệt cho Markdown backend-rendered, Chroma, article grid và sticky TOC; loại bỏ dần các rule control/layout cũ sau khi đã thay bằng utility hoặc shadcn.
- Giữ inline theme bootstrap chống nháy; chuyển E2E từ `data-theme` sang kiểm tra class `.dark`.

## Chuyển đổi component

- Giữ layout, route, article list, Markdown HTML và TOC bằng Astro semantic markup; không dùng React cho nội dung tĩnh khi shadcn không đem lại giá trị.
- Dùng component shadcn SSR cho pagination, tag badge, trạng thái lỗi/rỗng, cảnh báo admin và bảng danh sách; không gắn `client:*` cho các component này.
- Chuyển theme toggle thành React island `client:load` dùng shadcn Button và Lucide; giữ hành vi light/dark, system preference và `localStorage` hiện tại.
- Chuyển Article Editor thành React island `client:load` dùng Input, Textarea, Label, Button, Alert và AlertDialog. Giữ nguyên auto-slug, slug lock, dirty warning, payload API, preview HTML đã sanitize, trạng thái busy, redirect và error mapping.
- Thay `window.confirm` bằng AlertDialog có focus trap, Escape/cancel và hành động xóa destructive; không thêm React Hook Form/Zod hoặc quy tắc validation mới.
- Giữ nguyên implementation và regression test sticky TOC hiện có; mobile tiếp tục dùng native `details/summary`.
- Sau migration, xóa CSS/component cũ không còn được tham chiếu và không để tồn tại song song hai hệ thống style cho cùng một control.

## Interface và tương thích

- Không thay đổi backend, database, API contract, OpenAPI hay article data types.
- Props của editor vẫn là `article?: AdminArticle` và `apiBase: string`; dữ liệu được Astro SSR truyền sang React island.
- Public article chỉ hydrate theme toggle; không tải editor, AlertDialog hoặc admin code.
- Theme storage vẫn dùng key `theme` với `light`/`dark`; khi chưa lưu lựa chọn thì theo hệ thống.
- Không bổ sung tính năng V1, authentication, search, upload hoặc client-side Markdown renderer.

## Kiểm thử và nghiệm thu

- Duy trì baseline hiện tại: Astro check 0 lỗi/cảnh báo, 3 unit test pass, production build thành công và hai E2E specs được nhận diện.
- Cập nhật E2E lifecycle cho React editor, theme class và AlertDialog; kiểm tra preview, draft, publish, unpublish, delete cancel/confirm và dirty warning.
- Kiểm tra keyboard/focus cho Button, pagination, table region, theme toggle và AlertDialog; xác nhận lỗi/status được screen reader nhận qua live region.
- Chạy responsive tại 375, 768, 1024 và 1440px; giữ nền light trắng, dark mode, article measure, sticky TOC và không tràn ngang.
- Kiểm tra HTML SSR vẫn chứa nội dung bài, metadata, canonical và navigation trước hydration; trang public chỉ có island theme toggle.
- Chạy `npm run check`, `npm test`, `npm run build`, toàn bộ Playwright E2E và build container web bằng Node 24.
- Không commit hoặc push nếu người dùng chưa yêu cầu.
