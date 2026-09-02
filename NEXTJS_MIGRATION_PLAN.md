# Migration Astro → Next.js 16.3.4

## Tóm tắt

- Thay Astro 6 SSR bằng Next.js 16.3.4 App Router — bản vá mới nhất của dòng Active LTS hiện tại ([Next.js releases](https://nextjs.org/blog), [npm](https://www.npmjs.com/package/next)).
- Giữ nguyên URL, giao diện, SEO, accessibility, API contract và port `4321`.
- Cập nhật `PLAN.md` trước khi triển khai: lý do đổi quyết định là chuẩn hóa frontend trên React/Next.js; dùng Server Components để hạn chế JavaScript bổ sung so với Astro.
- Áp dụng `vercel-react-best-practices`: tránh fetch waterfall, thu nhỏ client boundary, không serialize dữ liệu không cần thiết và tối ưu import `lucide-react`.

## Thay đổi triển khai

- Cập nhật `PLAN.md`, `AGENTS.md` và README từ Astro SSR sang Next.js App Router/RSC; giữ nguyên giới hạn React client-side hiện có.
- Gỡ Astro, adapter và Vite Tailwind; thêm Next.js 16.3.4, cấu hình TypeScript strict, Tailwind CSS 4 qua PostCSS và `output: "standalone"`.
- Chuyển routing sang `src/app` với route group public/admin, không thay đổi các đường dẫn:
  - Public: `/`, `/bai-viet/[slug]`, `/the/[slug]`, `/gioi-thieu`, `/404`.
  - Admin: `/quan-tri/bai-viet`, `/moi`, `/[id]`.
  - Metadata/response: `/robots.txt`, `/sitemap.xml`, `/rss.xml`.
- Dùng Server Components mặc định cho layout, danh sách bài, bảng quản trị, phân trang, mục lục và các trạng thái tĩnh.
- Chỉ dùng `"use client"` cho `ThemeToggle`, `ArticleEditor`, AlertDialog và error boundary bắt buộc của Next.js. Scrollspy tiếp tục là JavaScript thuần, listener thụ động, không đổi URL/focus/trạng thái `<details>`.
- Chuyển các shadcn component tĩnh đang phụ thuộc hook Base UI, đặc biệt Badge/link dạng button, sang markup server-safe; Base UI tương tác chỉ nằm dưới client boundary.
- Giữ `<img>` cho cover URL tùy ý thay vì `next/image`; HTML Markdown tiếp tục dùng `dangerouslySetInnerHTML` duy nhất với nội dung đã sanitize từ backend.
- Dùng Metadata API cho canonical, Open Graph/Twitter và `generateMetadata`; giữ JSON-LD với escaping chống chèn `</script>`.
- Root layout chạy script theme đồng bộ trước hydration và đặt `suppressHydrationWarning` phù hợp để không nháy theme.

## Data flow và compatibility

- Giữ nguyên `API_URL`, `PUBLIC_API_URL`, `SITE_URL` và các biến `SITE_*`; browser editor vẫn gọi trực tiếp Go API, không thêm BFF.
- Server fetch dùng `cache: "no-store"` để giữ semantics request-time hiện tại và không làm draft/published bị stale.
- Fetch bài dùng cùng URL/options trong page và metadata để Next deduplicate trong một request; danh sách bài và tags cùng các trang sitemap được tải song song bằng `Promise.all`.
- Không thay đổi backend API, OpenAPI, article types, database hay migration.
- Bài draft/slug không tồn tại dùng `notFound()` và trả đúng `404`.
- Khi Go API lỗi, dùng Next route error boundary, hiển thị thông báo không khả dụng và chấp nhận status `500` thay cho Astro `503`.
- Docker dùng `.next/standalone`, copy `.next/static` và `public`, chạy `node server.js` với `HOSTNAME=0.0.0.0`, `PORT=4321`; Compose, CORS và healthcheck giữ nguyên địa chỉ.
- Chỉ xóa source/config Astro sau khi các route Next tương ứng đã build và vượt validation.

## Kiểm thử

- Giữ và chuyển các unit test Vitest cho pagination/query parsing; bổ sung test cho chuẩn hóa `page`, status filter và API error mapping nếu logic được tách mới.
- Chạy `npm ci`, `npm run check` (`tsc --noEmit`), `npm test` và `npm run build`.
- Chạy toàn bộ Playwright lifecycle hiện có: draft không lộ, preview, publish, tag, khóa slug, unpublish, delete, theme, responsive, keyboard, metadata, RSS, sitemap, robots và TOC scrollspy.
- Thêm assertion cho `/404`, slug không tồn tại/draft trả `404`, admin có `noindex`, HTML public được SSR và lỗi upstream đi qua Next error boundary.
- Chạy `go vet ./...`, `go test ./...`, `docker compose config --quiet`, build/start stack sạch và E2E qua Compose.
- Xác nhận không còn dependency, config, source `.astro` hoặc tài liệu vận hành tham chiếu Astro.

## Giả định

- Đây là migration parity, không redesign và không thêm tính năng.
- Không bật Cache Components, ISR, Server Actions hoặc proxy API trong migration này.
- Baseline hiện tại đã vượt Astro check, 3 unit tests và production build.
- Giữ nguyên, không stage các file untracked `.agents/skills/vercel-react-best-practices/` và `skills-lock.json`.
- Không commit hoặc push nếu người dùng chưa yêu cầu.
