# Kế hoạch xây dựng blog cá nhân tối giản

## 1. Tóm tắt

- Monorepo gồm `backend/`, `frontend/` và `compose.yaml`.
- Backend: Go 1.27, Gin, PostgreSQL 18, `pgx/v5`, theo Clean Architecture.
- Frontend: Astro 6 SSR, TypeScript, Node.js 24 LTS và CSS thuần.
- Không dùng React hoặc Tailwind; JavaScript phía client chỉ dành cho theme và trình soạn Markdown.
- Docker Compose chạy PostgreSQL, migration, API và Astro frontend.

Astro được chọn vì phù hợp với website thiên về nội dung, hỗ trợ server-side rendering và mặc định gửi rất ít JavaScript xuống trình duyệt. Điều này phù hợp với mục tiêu SEO tốt, giao diện tối giản và tập trung vào trải nghiệm đọc.

## 2. Backend và dữ liệu

### 2.1. Kiến trúc

Backend tuân theo Clean Architecture với hướng phụ thuộc từ ngoài vào trong:

- **Domain:** `Article`, `Tag`, trạng thái bài viết, domain errors và các quy tắc nghiệp vụ.
- **Application:** các use case CRUD, xuất bản, gỡ xuất bản, phân trang và Markdown preview.
- **Ports:** repository, transaction manager và Markdown renderer interfaces.
- **Adapters:** Gin HTTP handlers, PostgreSQL/pgx repositories, logging và cấu hình môi trường.
- **Bootstrap:** khởi tạo database pool, dependency injection, router và HTTP server.

Domain và application không được phụ thuộc vào Gin, pgx hoặc chi tiết hạ tầng.

### 2.2. Schema PostgreSQL

#### Bảng `articles`

- `id`: UUID, primary key.
- `title`: tiêu đề bài viết.
- `slug`: duy nhất, dùng trong URL.
- `excerpt`: mô tả ngắn và SEO description.
- `content_markdown`: nội dung Markdown gốc.
- `cover_image_url`: URL ảnh bìa, cho phép null.
- `status`: `draft` hoặc `published`.
- `published_at`: thời điểm xuất bản đầu tiên, cho phép null.
- `created_at`, `updated_at`: timestamp có timezone.

#### Bảng `tags`

- `id`: khóa chính.
- `name`: tên hiển thị.
- `slug`: duy nhất, dùng để lọc theo URL.

#### Bảng `article_tags`

- Quan hệ nhiều-nhiều giữa bài viết và thẻ.
- Khóa ngoại dùng `ON DELETE CASCADE`.
- Cập nhật bài viết và các thẻ trong cùng một transaction.

### 2.3. Quy tắc nghiệp vụ

- Chỉ bài có trạng thái `published` được trả về qua API công khai.
- Bài nháp chỉ xuất hiện trong API và giao diện quản lý.
- Khi xuất bản lần đầu, backend đặt `published_at` theo UTC.
- Gỡ xuất bản giữ nguyên `published_at` để bảo toàn lịch sử.
- Slug tự sinh từ tiêu đề tiếng Việt nếu người viết để trống.
- Slug tự sinh bị trùng sẽ được thêm hậu tố số; slug nhập thủ công bị trùng trả về HTTP `409`.
- Slug không được đổi sau lần xuất bản đầu tiên nhằm bảo vệ liên kết SEO.
- Xóa bài là xóa vĩnh viễn, giao diện phải yêu cầu xác nhận trước khi gọi API.
- Cover image chỉ chấp nhận URL `http` hoặc `https`.
- Bài viết được sắp xếp theo `published_at` giảm dần.
- Phân trang mặc định 10 bài/trang và giới hạn tối đa 50 bài/trang.

### 2.4. Markdown

- Hỗ trợ GitHub-Flavored Markdown bằng Goldmark.
- Tô màu code block bằng Chroma.
- Sinh mục lục từ heading cấp `h2` và `h3` với anchor ổn định.
- Tính thời gian đọc, tối thiểu một phút.
- Không cho phép raw HTML tùy ý và loại bỏ script, event handler hoặc URL nguy hiểm.
- Backend trả về HTML đã sanitize, mục lục và thời gian đọc; frontend không tự render theo một pipeline khác.
- Endpoint preview sử dụng chính renderer của bài công khai để bảo đảm kết quả giống nhau.

### 2.5. Hạ tầng backend

- Migration có version và chạy bằng một Docker Compose job trước API.
- Cấu hình hoàn toàn qua biến môi trường.
- Structured logging, request ID, panic recovery và graceful shutdown.
- Có health check và readiness check riêng.
- CORS chỉ cho phép origin frontend được cấu hình.

## 3. Frontend và giao diện

### 3.1. Kiến trúc frontend

Frontend dùng feature-based architecture:

- `pages`: routing và ghép các phần của trang.
- `features`: article, tag và editor, bao gồm API client, types và component đặc thù.
- `components`: UI dùng chung và không chứa nghiệp vụ.
- `layouts`: layout công khai và layout quản lý.
- `lib`: site config, HTTP client và utilities.
- `styles`: CSS variables, typography và global styles.

Astro chạy ở chế độ SSR với Node adapter standalone. Các trang công khai dùng Astro component; theme và editor dùng TypeScript phía client, không bổ sung UI framework khác.

### 3.2. Route công khai

- `/`: danh sách bài mới nhất, 10 bài mỗi trang.
- `/bai-viet/[slug]`: trang đọc bài.
- `/the/[slug]`: danh sách bài theo thẻ, có phân trang.
- `/gioi-thieu`: thông tin mẫu về tác giả và blog.
- `/404`: trang không tìm thấy.
- `/rss.xml`: RSS feed cho các bài mới nhất.
- `/sitemap.xml`: sitemap động từ các bài đã xuất bản.
- `/robots.txt`: chỉ dẫn crawler.

Trang bài viết hiển thị:

- Tiêu đề, excerpt, ngày đăng và ngày cập nhật nếu cần.
- Thời gian đọc và danh sách thẻ.
- Ảnh bìa tùy chọn.
- Nội dung Markdown đã render.
- Mục lục từ `h2` và `h3`.

Bài nháp hoặc slug không tồn tại phải trả về HTTP `404` ở route công khai.

### 3.3. Route quản lý

- `/quan-tri/bai-viet`: danh sách bài, lọc theo trạng thái và phân trang.
- `/quan-tri/bai-viet/moi`: tạo bài mới.
- `/quan-tri/bai-viet/[id]`: sửa bài.

Editor gồm:

- Tiêu đề.
- Slug tự sinh nhưng cho phép chỉnh khi bài chưa từng xuất bản.
- Excerpt.
- Cover image URL.
- Danh sách tag nhập bằng dấu phẩy.
- Markdown textarea và preview.
- Các hành động lưu nháp, xuất bản, cập nhật, gỡ xuất bản và xóa.
- Cảnh báo khi rời trang trong lúc còn thay đổi chưa lưu.
- Banner cảnh báo rằng khu vực quản lý hiện chưa có xác thực.

Route quản lý không được liên kết từ navigation công khai.

### 3.4. Thiết kế giao diện

- Dùng khung trang responsive tối đa 88rem (~1408px) với gutter co giãn theo viewport. Các trang danh sách và giới thiệu giữ cột đọc tối đa khoảng 52rem; trang bài viết desktop dùng cột bài tối đa 48rem cùng mục lục sticky ở cột phải, còn màn hình hẹp hiển thị mục lục thu gọn phía trên bài viết. Khu vực quản trị dùng toàn bộ khung rộng.
- Dùng system font, khoảng trắng rộng và màu sắc tiết chế.
- Không dùng card lớn, sidebar quảng cáo hoặc thành phần gây mất tập trung.
- Responsive từ mobile đến desktop.
- Semantic HTML, focus state rõ ràng và thao tác được bằng bàn phím.
- Theme sáng/tối dùng CSS variables.
- Mặc định theo theme hệ thống; nút chuyển theme lưu lựa chọn vào `localStorage`.
- Có inline script nhỏ để tránh nháy sai theme khi tải trang.
- Tên blog, tác giả, mô tả và liên kết xã hội nằm trong một file cấu hình trung tâm với giá trị mẫu dễ thay đổi.

### 3.5. SEO

- Mọi trang bài viết được render thành HTML phía server.
- Canonical URL dựa trên biến môi trường `SITE_URL`.
- Metadata động từ title, excerpt và cover image.
- Open Graph và Twitter card.
- Article JSON-LD cho mỗi bài đã xuất bản.
- Semantic heading structure.
- Sitemap, RSS và `robots.txt` được sinh từ dữ liệu thật.
- Không đưa route quản lý hoặc bài nháp vào sitemap.

## 4. API contract

### 4.1. System endpoints

- `GET /healthz`
- `GET /readyz`

### 4.2. Public endpoints

- `GET /api/v1/articles?page=&page_size=&tag=`
- `GET /api/v1/articles/:slug`
- `GET /api/v1/tags`

### 4.3. Admin endpoints

- `GET /api/v1/admin/articles?page=&page_size=&status=`
- `POST /api/v1/admin/articles`
- `GET /api/v1/admin/articles/:id`
- `PUT /api/v1/admin/articles/:id`
- `DELETE /api/v1/admin/articles/:id`
- `POST /api/v1/admin/markdown/preview`

Admin endpoints được đặt trong Gin route group riêng để có thể gắn authentication middleware sau này mà không đổi contract.

### 4.4. Request và response

Payload tạo/cập nhật bài gồm:

```json
{
  "title": "Tiêu đề",
  "slug": "tieu-de",
  "excerpt": "Mô tả ngắn",
  "content_markdown": "# Nội dung",
  "cover_image_url": "https://example.com/image.jpg",
  "tags": ["Golang", "Backend"],
  "status": "draft"
}
```

Danh sách trả về:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 10,
    "total": 0,
    "total_pages": 0
  }
}
```

Lỗi trả về:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Dữ liệu không hợp lệ",
    "fields": {}
  }
}
```

- Timestamp dùng ISO-8601 UTC.
- Validation error trả `422`, không tìm thấy trả `404`, slug trùng trả `409`.
- Xóa thành công trả `204`.
- Contract được mô tả và kiểm tra bằng OpenAPI.

## 5. Docker và môi trường chạy

Docker Compose gồm:

- `db`: PostgreSQL 18 với persistent volume và healthcheck.
- `migrate`: chạy migration một lần và thoát.
- `api`: Go API, chỉ khởi động sau khi migration thành công.
- `web`: Astro SSR Node server.

Các container dùng multi-stage build và chạy bằng non-root user khi khả thi. Repository có `.env.example`, không commit secret và có README hướng dẫn:

- Chạy toàn bộ stack.
- Chạy frontend/backend riêng khi phát triển.
- Tạo migration mới.
- Chạy test và build.
- Thay đổi thông tin nhận diện blog.
- Cấu hình domain, CORS và database cho production.

## 6. Kiểm thử và tiêu chí nghiệm thu

### 6.1. Backend

- Unit test validation và trạng thái domain.
- Test slug tiếng Việt, slug collision và khóa slug sau xuất bản.
- Test chuẩn hóa, thêm và xóa tag.
- Test phân trang và chỉ trả bài đã xuất bản.
- Test Markdown chống XSS, link nguy hiểm, code block, mục lục và thời gian đọc.
- Repository integration test với PostgreSQL 18.
- HTTP handler test bằng `httptest` cho status code và response contract.

### 6.2. Frontend và end-to-end

- Type check và production build của Astro.
- Playwright kiểm tra luồng:
  1. Tạo bài nháp.
  2. Xác nhận bài chưa xuất hiện công khai.
  3. Xem trước Markdown.
  4. Xuất bản và thấy bài trên trang chủ.
  5. Lọc bài theo tag.
  6. Sửa bài và giữ nguyên slug đã xuất bản.
  7. Gỡ xuất bản và xác nhận trang công khai trả 404.
  8. Xóa bài sau bước xác nhận.
- Kiểm tra metadata, canonical, JSON-LD, sitemap, RSS và robots.
- Kiểm tra theme persistence, responsive và điều hướng bàn phím.

### 6.3. CI và nghiệm thu cuối

- GitHub Actions chạy Go format/vet/test, frontend check/test/build và integration test.
- `docker compose up --build` phải tự chạy migration và đưa tất cả healthcheck về trạng thái thành công.
- Toàn bộ luồng CRUD và xuất bản phải hoạt động trên stack Docker mới hoàn toàn.

## 7. Giả định và ngoài phạm vi v1

- Blog chỉ có một tác giả và chỉ dùng tiếng Việt.
- Giá trị nhận diện ban đầu là nội dung mẫu, được thay trong một cấu hình duy nhất.
- Màn hình và API quản lý cố ý chưa có xác thực. Không có bảng user trong v1.
- Chưa có tài khoản độc giả, bình luận, lượt thích hoặc lưu bài.
- Chưa có tìm kiếm toàn văn.
- Chưa có đặt lịch đăng.
- Chưa có upload ảnh hoặc object storage.
- Chưa có rich-text editor.
- Không hỗ trợ đa ngôn ngữ trong v1.
- Không có soft delete; thao tác xóa là vĩnh viễn.

## 8. Tài liệu tham khảo kỹ thuật

- Astro cho content-driven website: <https://docs.astro.build/en/concepts/why-astro/>
- Astro Node SSR adapter: <https://v6.docs.astro.build/en/guides/integrations-guide/node/>
- Gin route groups và middleware: <https://gin-gonic.com/en/docs/routing/grouping-routes/>
- Go release history: <https://go.dev/doc/devel/release>
- Node.js release schedule: <https://nodejs.org/en/about/previous-releases>
- PostgreSQL UUID type: <https://www.postgresql.org/docs/current/datatype-uuid.html>
