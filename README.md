# Blog cá nhân tối giản

Monorepo cho blog một tác giả bằng Go/Gin/PostgreSQL và Astro SSR. Markdown chỉ được render, tô màu code và sanitize ở backend; giao diện công khai gửi HTML từ server, còn JavaScript chỉ phục vụ theme và editor quản trị.

## Chạy toàn bộ stack

1. Sao chép cấu hình mẫu: `cp .env.example .env`.
2. Đổi `POSTGRES_PASSWORD` và các giá trị `SITE_*` trong `.env` trước khi dùng ngoài máy cá nhân.
3. Chạy `docker compose up --build`.
4. Mở `http://localhost:4321`; API ở `http://localhost:8080`.

Compose khởi động PostgreSQL, chạy migration versioned một lần, rồi mới khởi động API và Astro. Kiểm tra `docker compose ps` để thấy các healthcheck. Dừng và xóa dữ liệu local bằng `docker compose down --volumes`.

## Phát triển

Máy cần Go 1.27, Node.js 24 và PostgreSQL 18, hoặc có thể dùng các container Docker trong cấu hình trên.

- Backend: đặt `DATABASE_URL`, sau đó chạy trong `backend/`: `go run ./cmd/api`.
- Migration: trong `backend/`: `go run ./cmd/migrate`.
- Frontend: đặt `API_URL=http://localhost:8080/api/v1` và `PUBLIC_API_URL=http://localhost:8080/api/v1`, sau đó chạy trong `frontend/`: `npm ci && npm run dev`.
- Migration mới: thêm file mới có tên tăng dần trong `backend/migrations/`, ví dụ `000002_add_summary.sql`. Không chỉnh sửa migration đã áp dụng.

## Kiểm tra

- Backend: `cd backend && gofmt -w $(find . -name '*.go') && go vet ./... && go test ./...`.
- PostgreSQL integration: `cd backend && DATABASE_URL=postgres://... go test -tags=integration ./internal/adapters/postgres`.
- Frontend: `cd frontend && npm ci && npm run check && npm run test && npm run build`.
- E2E sau khi stack chạy: `cd frontend && BASE_URL=http://localhost:4321 npm run test:e2e`.

CI chạy những kiểm tra trên, kiểm tra Compose và xác minh luồng tạo nháp → preview → xuất bản → sửa giữ slug → gỡ xuất bản → xóa bằng Playwright.

## Cấu hình production

Toàn bộ cấu hình nằm trong biến môi trường. Quan trọng nhất là `DATABASE_URL` (backend), `CORS_ALLOWED_ORIGIN`, `SITE_URL`, `PUBLIC_API_URL` và các giá trị `SITE_*`. `SITE_URL` phải là URL canonical công khai; `PUBLIC_API_URL` phải là URL API mà trình duyệt của người đọc truy cập được. Không commit `.env` hoặc secret.

Thông tin nhận diện blog mẫu được tập trung ở biến `SITE_NAME`, `SITE_AUTHOR`, `SITE_DESCRIPTION`, `SITE_SOCIAL_URL` (và fallback trong `frontend/src/lib/site.ts`). Không có xác thực trong khu vực `/quan-tri`; hãy chỉ đưa nó ra Internet khi lớp bảo vệ phù hợp đã được bổ sung ở phiên bản sau.
