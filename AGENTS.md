# Project instructions

## Source of truth

- Đọc `PLAN.md` trước khi triển khai hoặc thay đổi kiến trúc.
- `PLAN.md` là đặc tả sản phẩm và kiến trúc chính của dự án.
- Không tự mở rộng phạm vi ngoài plan.
- Nếu cần thay đổi một quyết định trong plan, phải giải thích lý do trước khi thực hiện.
- Giữ repository ở trạng thái có thể build và test sau mỗi giai đoạn lớn.

## Skills

- Với mọi công việc Go, bắt đầu bằng skill `cc-skills-golang:golang-how-to` và chỉ tải các skill Go liên quan mà orchestrator lựa chọn.
- Với code Astro, `.astro`, SSR, routing hoặc frontend structure, sử dụng skill `astro` khi skill này khả dụng.
- Không đọc toàn bộ bộ skill Go nếu nhiệm vụ chỉ cần một vài skill chuyên biệt.

## Backend rules

- Giữ đúng hướng phụ thuộc của Clean Architecture: `delivery/adapters -> application -> domain`.
- Domain và application không được import Gin, pgx hoặc package hạ tầng.
- Dùng constructor injection thủ công; không thêm DI framework.
- HTTP handler chỉ bind, validate sơ bộ, gọi use case và map response.
- Mọi database query phải được parameterize và nhận `context.Context`.
- Thao tác cập nhật article và tags phải chạy trong transaction.
- Mỗi thay đổi schema phải có migration; không sửa migration đã được áp dụng.
- Markdown chỉ được render và sanitize bởi backend.
- Không log secret, database URL hoặc toàn bộ nội dung bài viết.

## Backend unit tests

- Mọi domain rule, use case hoặc hành vi backend mới hay bị thay đổi phải có unit test tương ứng trong cùng thay đổi.
- Mỗi bug fix backend phải bổ sung regression test có thể thất bại trước khi sửa và thành công sau khi sửa.
- Ưu tiên table-driven tests cho validation, state transition, slug, pagination và error mapping.
- Unit test phải cô lập database, filesystem, network và HTTP server thật; sử dụng fake hoặc mock thông qua các port/interface của application.
- Repository PostgreSQL được kiểm tra bằng integration test riêng, không thay thế unit test của domain và application.
- HTTP handler dùng `httptest`; kiểm tra status code, response body và việc map domain error.
- Test phải ổn định, không phụ thuộc thứ tự chạy hoặc thời gian thực; inject clock/ID generator khi hành vi phụ thuộc thời gian hoặc UUID.
- Trước khi hoàn thành backend, chạy tối thiểu `go test ./...`; chạy thêm `go test -race ./...` khi thay đổi có concurrency hoặc shared state.

## Frontend rules

- Dùng Astro SSR, TypeScript, Tailwind CSS 4 và shadcn/ui (Base Nova, Base UI).
- React 19 chỉ dùng cho island tương tác: theme toggle và editor quản trị (gồm preview/xóa); không chuyển trang công khai thành React SPA.
- Trang công khai ưu tiên server-rendered HTML; component shadcn tĩnh phải SSR và không gắn `client:*`.
- JavaScript phía client chỉ dành cho editor, preview và theme, ngoại trừ scrollspy mục lục nhỏ không dùng framework trên trang bài viết. Scrollspy chỉ cập nhật trạng thái DOM, không đổi URL, fragment, focus hoặc trạng thái `details`.
- Giữ token semantic light/dark của shadcn, `.dark` là theme selector, và không duy trì hai hệ thống style cho cùng một control.
- Không lặp lại logic render Markdown ở frontend.
- Giữ giao diện một cột, tối giản, responsive và truy cập được bằng bàn phím.

## Scope boundaries

- V1 không có authentication, tài khoản độc giả, bình luận, tìm kiếm, đặt lịch đăng, upload ảnh hoặc đa ngôn ngữ.
- Route quản lý không xuất hiện trong navigation công khai.
- Không thêm tính năng ngoài phạm vi để chuẩn bị cho tương lai.
- Không commit hoặc push nếu người dùng chưa yêu cầu.

## API and compatibility

- API phải tuân theo contract trong `PLAN.md`.
- Khi thay đổi request hoặc response, cập nhật OpenAPI và frontend types cùng lúc.
- Timestamp dùng UTC và ISO-8601.
- Bài draft không được lộ qua API, sitemap, RSS hoặc trang công khai.

## Git workflow

- Khi người dùng yêu cầu triển khai toàn bộ `PLAN.md`, chia công việc thành các milestone logic và có thể review độc lập.
- Được phép tạo local commit sau mỗi milestone đã hoàn chỉnh và vượt qua validation tương ứng.
- Không commit trạng thái đang compile lỗi, test lỗi hoặc còn thiếu phần bắt buộc của milestone.
- Unit test phải nằm trong cùng commit với hành vi backend mới hoặc bị thay đổi.
- Mỗi commit chỉ chứa thay đổi thuộc milestone hiện tại; không stage thay đổi không liên quan.
- Trước mỗi commit, kiểm tra `git status`, staged diff và kết quả test.
- Sử dụng Conventional Commits: `feat`, `fix`, `test`, `chore`, `docs`, `refactor`.
- Không amend, squash, rebase hoặc sửa commit đã có nếu người dùng chưa yêu cầu.
- Không push lên remote, tạo pull request hoặc merge branch nếu người dùng chưa yêu cầu.
- Nếu validation không chạy được, không tự commit; báo rõ blocker và kết quả đã kiểm tra.

## Validation

Trước khi hoàn thành một thay đổi:

- Chạy `gofmt`, `go vet` và các Go unit test liên quan.
- Chạy frontend type-check, test và production build.
- Chạy integration/E2E test cho luồng bị ảnh hưởng khi có thể.
- Với thay đổi hạ tầng, kiểm tra `docker compose config` và build container.
- Báo rõ test nào đã chạy, kết quả và test nào chưa thể chạy.
