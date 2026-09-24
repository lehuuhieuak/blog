# Blog cá nhân tối giản

Monorepo cho blog một tác giả bằng Go/Gin/PostgreSQL và Next.js App Router. Markdown chỉ được render, tô màu code và sanitize ở backend; giao diện công khai gửi HTML từ Server Components. Frontend dùng Tailwind CSS 4 và shadcn/ui (Base UI) cho controls/trạng thái; chỉ theme toggle và editor quản trị là Client Components. Trang bài viết có thêm script nhỏ không dùng framework để highlight mục lục khi cuộn; nội dung công khai vẫn SSR hoàn toàn.

## Chạy toàn bộ stack

1. Sao chép cấu hình mẫu: `cp .env.example .env`.
2. Đổi `POSTGRES_PASSWORD` và các giá trị `SITE_*` trong `.env` trước khi dùng ngoài máy cá nhân.
3. Chạy `docker compose up --build`.
4. Mở `http://localhost:4321`; API ở `http://localhost:8080`.

Compose khởi động PostgreSQL, chạy migration versioned một lần, rồi mới khởi động API và Next.js. Kiểm tra `docker compose ps` để thấy các healthcheck. Dừng và xóa dữ liệu local bằng `docker compose down --volumes`.

## Route và đăng nhập quản trị

Các route công khai là `/`, `/articles/[slug]`, `/tags/[slug]`, `/about`, `/rss.xml`, `/sitemap.xml` và `/robots.txt`. Khu vực quản trị dùng `/admin/login`, `/admin/articles`, `/admin/articles/new` và `/admin/articles/[id]`. Các route tiếng Việt cũ trả về `404`.

### Thông tin đăng nhập ban đầu

Tài khoản quản trị cố định ban đầu có username `admin` và password `Hieu1234@@`. Hãy thay password này trước khi triển khai công khai. Không có màn hình đổi password: để đổi, tạo bcrypt hash cho password mới, thay hash credential cố định trong backend, rồi build và triển khai lại API. Username cũng là credential cố định của backend.

Phiên đăng nhập được ký bằng `ADMIN_SESSION_SECRET`, lưu trong cookie `HttpOnly`, và hết hạn sau 8 giờ. Đổi session secret sẽ làm mất hiệu lực các phiên đã cấp. Local HTTP có thể dùng `ADMIN_COOKIE_SECURE=false`; với HTTPS production phải đặt `ADMIN_COOKIE_SECURE=true`.

## Phát triển

Máy cần Go 1.27, Node.js 24 và PostgreSQL 18, hoặc có thể dùng các container Docker trong cấu hình trên.

- Backend: đặt `DATABASE_URL` trỏ tới PostgreSQL local. Khi frontend chạy bằng `npm run dev` trên origin mặc định `http://localhost:3000`, chạy trong `backend/`: `CORS_ALLOWED_ORIGIN=http://localhost:3000 ADMIN_SESSION_SECRET=local-development-session-secret-32-bytes-minimum ADMIN_COOKIE_SECURE=false go run ./cmd/api`. Giá trị session secret mẫu này chỉ dành cho phát triển local và có ít nhất 32 byte; thay `CORS_ALLOWED_ORIGIN` nếu frontend dùng origin khác.
- Migration: trong `backend/`: `go run ./cmd/migrate`.
- Frontend: đặt `API_URL=http://localhost:8080/api/v1` và `PUBLIC_API_URL=http://localhost:8080/api/v1`, sau đó chạy trong `frontend/`: `npm ci && npm run dev`. Next.js vẫn SSR nội dung bằng Server Components; chỉ theme và editor là Client Components, còn mục lục bài viết dùng scrollspy JavaScript tối thiểu không đổi URL khi cuộn.
- Migration mới: thêm file mới có tên tăng dần trong `backend/migrations/`, ví dụ `000002_add_summary.sql`. Không chỉnh sửa migration đã áp dụng.

## Kiểm tra

- Backend: `cd backend && gofmt -w $(find . -name '*.go') && go vet ./... && go test ./...`.
- PostgreSQL integration: `cd backend && DATABASE_URL=postgres://... go test -tags=integration ./internal/adapters/postgres`.
- Frontend: `cd frontend && npm ci && npm run check && npm run test && npm run build`.
- E2E sau khi stack chạy: `cd frontend && BASE_URL=http://localhost:4321 npm run test:e2e`.

CI chạy những kiểm tra trên, kiểm tra Compose và xác minh luồng tạo nháp → preview → xuất bản → sửa giữ slug → gỡ xuất bản → xóa bằng Playwright.

## Cấu hình production

Toàn bộ cấu hình nằm trong biến môi trường. Quan trọng nhất là `DATABASE_URL` (backend), `CORS_ALLOWED_ORIGIN`, `ADMIN_SESSION_SECRET`, `ADMIN_COOKIE_SECURE`, `SITE_URL`, `PUBLIC_API_URL` và các giá trị `SITE_*`. `SITE_URL` phải là URL canonical công khai; `PUBLIC_API_URL` phải là URL API mà trình duyệt của người đọc truy cập được. Không commit `.env` hoặc secret.

Tạo signing secret từ bộ sinh số ngẫu nhiên mật mã an toàn, ví dụ `openssl rand -hex 32`; kết quả có 32 byte ngẫu nhiên. Đặt kết quả vào `ADMIN_SESSION_SECRET` trong runtime environment của server. Giá trị phải có ít nhất 32 byte; không dùng chuỗi mẫu trong `.env.example` hay `deploy/runtime.env.example` ở production. API sẽ không khởi động nếu secret thiếu hoặc ngắn hơn yêu cầu. Khi chạy qua HTTPS, đặt `ADMIN_COOKIE_SECURE=true` để cookie chỉ được gửi qua HTTPS.

Thông tin nhận diện blog mẫu được tập trung ở biến `SITE_NAME`, `SITE_AUTHOR`, `SITE_DESCRIPTION`, `SITE_SOCIAL_URL` (và fallback trong `frontend/src/lib/site.ts`). Khu vực `/admin` yêu cầu phiên đăng nhập hợp lệ; API quản trị cũng xác minh phiên ở backend.

## CI/CD production

Pipeline GitHub Actions trong [`.github/workflows/ci.yml`](.github/workflows/ci.yml) luôn chạy kiểm tra Go, frontend, Compose/E2E và kiểm tra Compose production cho pull request lẫn mọi push. Chỉ push vào `main` sau khi toàn bộ job này thành công mới được phép:

1. Build và publish ba image private lên GHCR: `api`, `migrate`, `web`.
2. Ghim mỗi image theo digest SHA-256 của chính lần build đó.
3. Chờ approval của GitHub Environment `production`.
4. Qua SSH đã ghim host key, pull digest, chạy migration, thay API rồi web, và chờ từng healthcheck.

Image không dùng `latest`. Migration lỗi giữ nguyên containers đang chạy. Nếu API hoặc web mới không healthy, script tự quay lại manifest image ứng dụng hiện tại; cơ sở dữ liệu không bị rollback. Vì thế migration production bắt buộc theo chiến lược backward-compatible/expand-contract.

### 1. Cấu hình GitHub một lần

Trong repository GitHub, đặt **Actions → General → Workflow permissions** thành `Read and write permissions` để `GITHUB_TOKEN` có thể publish package. Tạo các repository variables sau (chúng là dữ liệu công khai, không phải secrets):

| Variable | Ví dụ |
| --- | --- |
| `PUBLIC_API_URL` | `https://blog.example.com/api/v1` |
| `SITE_URL` | `https://blog.example.com` |
| `SITE_NAME` | `Góc nhỏ của Minh` |
| `SITE_AUTHOR` | `Minh` |
| `SITE_DESCRIPTION` | `Những ghi chép ngắn về công nghệ và cuộc sống.` |
| `SITE_SOCIAL_URL` | URL mạng xã hội, hoặc để trống |

Tạo Environment tên `production`, giới hạn branch `main`, bật **Required reviewers** và **Prevent self-review**. Chỉ reviewer được duyệt sau khi developer đã chạy backup ở bước 3. Thêm các Environment secrets sau:

| Secret | Nội dung |
| --- | --- |
| `PRODUCTION_SSH_HOST` | IP hoặc hostname của server |
| `PRODUCTION_SSH_PORT` | Cổng SSH, ví dụ `22` |
| `PRODUCTION_SSH_USER` | User deploy riêng, ví dụ `deploy` |
| `PRODUCTION_SSH_PRIVATE_KEY` | Private key Ed25519 dành riêng cho GitHub Actions |
| `PRODUCTION_SSH_KNOWN_HOSTS` | Một dòng `known_hosts` đã lấy và xác minh fingerprint của server |

Tại **Branches → main**, bắt buộc các CI checks và ít nhất một code review trước khi merge. Với repository public, GitHub Environments hỗ trợ required reviewer; với repository private, hãy kiểm tra gói GitHub của bạn có hỗ trợ deployment protection rules trước khi bật CD.

### 2. Chuẩn bị production server

Server cần Docker Engine + Docker Compose v2, một reverse proxy HTTPS đã được cấu hình và PostgreSQL. Tạo user `deploy` không phải root, chỉ cho phép SSH bằng key; user này cần quyền dùng Docker. Lưu ý membership trong nhóm `docker` tương đương đặc quyền cao trên host, vì vậy chỉ cấp cho user deploy riêng và bảo vệ private key tương ứng.

Sao chép các tệp deploy từ repository lên server:

```bash
sudo install -d -o deploy -g deploy -m 0750 /opt/minimal-blog /var/lib/minimal-blog
sudo install -d -o root -g deploy -m 0750 /etc/minimal-blog
sudo install -m 0644 deploy/compose.production.yaml /opt/minimal-blog/compose.production.yaml
sudo install -m 0755 deploy/deploy-production.sh /usr/local/bin/minimal-blog-deploy
sudo install -m 0640 -o root -g deploy deploy/runtime.env.example /etc/minimal-blog/runtime.env
```

Sửa `/etc/minimal-blog/runtime.env`: thay password trong `DATABASE_URL`, đặt `CORS_ALLOWED_ORIGIN=https://blog.example.com`, `SITE_URL=https://blog.example.com`, `PUBLIC_API_URL=https://blog.example.com/api/v1`, `ADMIN_COOKIE_SECURE=true`, rồi đặt `ADMIN_SESSION_SECRET` thành giá trị ngẫu nhiên đã sinh cho server. URL-encode database password nếu có ký tự đặc biệt. File này chỉ tồn tại trên server; không đưa nó vào GitHub. API và migration truy cập PostgreSQL host qua `host.docker.internal:host-gateway`, nên PostgreSQL phải listen trên Docker bridge và `pg_hba.conf` chỉ cho phép subnet Docker truy cập — không mở PostgreSQL ra Internet.

Cấu hình reverse proxy hiện có để domain HTTPS công khai dùng cùng một origin: chuyển `/api/v1/` tới API và các route còn lại, gồm `/admin/...`, tới Next.js. Không cần dựa vào allowlist IP của file cấu hình mẫu trong repository; ứng dụng yêu cầu đăng nhập cho trang quản trị và backend bảo vệ API bằng session. Cấu hình rate limit tại reverse proxy cho `POST /api/v1/admin/auth/login` để giảm nguy cơ dò credential.

Đăng nhập GHCR bằng **PAT classic** có đúng scope `read:packages`, thực hiện dưới user `deploy`. Token chỉ được Docker lưu cục bộ trên server, không đưa vào GitHub Actions:

```bash
sudo -u deploy docker login ghcr.io -u <github-user>
```

API và web chỉ lắng nghe loopback; reverse proxy hiện có là ingress HTTPS công khai. Hãy kiểm tra cấu hình proxy và TLS trước khi chuyển traffic tới ứng dụng.

### 3. Quy trình deploy hằng ngày

1. Merge thay đổi đã được review vào `main`; CI publish ba image theo digest và job production dừng ở trạng thái chờ review.
2. SSH vào server và tạo backup PostgreSQL trước khi approve. Ví dụ PostgreSQL cài local:

   ```bash
   sudo install -d -o postgres -g postgres -m 0700 /var/backups/minimal-blog
   sudo -u postgres pg_dump --format=custom --file="/var/backups/minimal-blog/blog-$(date -u +%Y%m%dT%H%M%SZ).dump" blog
   ```

   Xác nhận file backup tồn tại và có kích thước hợp lý. Nếu database không dùng socket/local user `postgres`, dùng lệnh `pg_dump` tương ứng của hệ thống quản trị database đó.
3. Reviewer vào workflow run, xác nhận backup đã xong rồi approve Environment `production`.
4. Workflow pull digest, chạy migration, deploy và ghi commit/digest/healthcheck trong Job Summary. Server lưu manifest tại `/var/lib/minimal-blog/current.env` và release trước tại `previous.env`.

Sau deploy, xác nhận ít nhất:

```bash
curl --fail https://blog.example.com/readyz
curl --fail https://blog.example.com/api/v1/tags
curl --fail https://blog.example.com/
curl --fail https://blog.example.com/admin/login
```

Xác nhận trang đăng nhập quản trị dùng HTTPS, session cookie có thuộc tính `Secure`, các trang quản trị yêu cầu đăng nhập và reverse proxy áp dụng rate limit cho endpoint login. Lần đầu bật CD, nên deploy một revision vô hại và kiểm tra HTTPS, định tuyến cùng manifest release trước.

### 4. Rollback ứng dụng

Khi healthcheck image mới lỗi, script tự khôi phục `current.env`. Để chủ động quay lại release trước (không rollback database), chạy trên server với SHA và ba image digest trong `/var/lib/minimal-blog/previous.env`:

```bash
sudo -u deploy /usr/local/bin/minimal-blog-deploy <previous-sha> <previous-api-image> <previous-migrate-image> <previous-web-image>
```

Chỉ thực hiện việc này khi migration của release hiện tại vẫn tương thích với application cũ. Migration destructive hoặc không tương thích cần quy trình khôi phục database từ backup riêng, không phải rollback container.
