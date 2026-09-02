# Làm mới giao diện blog tối giản, rộng và tập trung vào nội dung

## Tóm tắt

- Cập nhật toàn bộ giao diện public và quản trị, không thêm framework, thư viện UI, webfont hoặc JavaScript không cần thiết.
- Khắc phục các điểm chính: mọi trang đang bị giới hạn chung ở `45rem`, mục lục nằm trong luồng bài viết, nền sáng đang là trắng ngà, admin chưa tận dụng màn hình rộng và một số điều khiển chưa đủ rõ khi dùng bàn phím/mobile.
- Cập nhật `PLAN.md` trước khi triển khai: thay quyết định cột cố định 720px bằng hệ thống độ rộng responsive mới.

## Thay đổi triển khai

- Thiết lập design tokens đơn sắc: nền light `#FFFFFF`, chữ đen/xám than, border xám nhạt; chỉ dùng màu riêng cho cảnh báo và hành động nguy hiểm. Giữ dark mode và system font.
- Dùng khung trang tối đa `88rem` (~1408px), gutter responsive; trang danh sách/giới thiệu dùng cột đọc khoảng `52rem`, còn admin và bài chi tiết dùng layout rộng.
- Trang bài viết desktop dùng grid gồm cột bài tối đa `48rem`, khoảng cách 3–4rem và mục lục 14–16rem bên phải. Mục lục sticky, thụt cấp `h3`, cho phép tiêu đề dài xuống dòng; dùng scrollspy JavaScript tối thiểu không-framework để highlight heading hiện tại mà không đổi URL hoặc focus.
- Dưới breakpoint khoảng `68rem`, bỏ sidebar và hiển thị mục lục dạng `details/summary` đóng mặc định phía trên bài viết. Dùng chung một component dữ liệu mục lục để tránh lệch nội dung giữa hai chế độ.
- Hoàn thiện typography Markdown: kiểm soát độ dài dòng khoảng 65–75 ký tự, nhịp heading/đoạn văn, blockquote, bảng, inline code, code block, ảnh và URL dài; không để nội dung gây tràn ngang trên mobile.
- Chuẩn hóa header, footer, tag và phân trang: active state rõ, focus ring, vùng bấm phù hợp, phân trang không xô lệch khi thiếu nút trước/sau và thêm skip link tới nội dung chính.
- Sửa theme toggle thành nút tối thiểu 44px với SVG đơn sắc, accessible label/state động; xử lý đúng theme hệ thống khi chưa có lựa chọn lưu và giữ persistence hiện tại.
- Mở rộng admin lên khung `88rem`: bảng có vùng cuộn ngang an toàn trên màn hình nhỏ, bộ lọc có trạng thái hiện tại, và theme toggle nhất quán với public.
- Tổ chức editor thành workspace responsive: các trường ngắn có thể chia cột trên desktop; Markdown và preview đặt cạnh nhau khi đủ rộng, xếp dọc trên tablet/mobile. Bổ sung trạng thái loading/disabled/`aria-busy`, thông báo lỗi rõ và Việt hóa các nhãn đang trộn tiếng Anh.

## Interface và tương thích

- Không thay đổi backend, API contract, OpenAPI hoặc frontend data types.
- `BaseLayout` nhận biến thể độ rộng nội bộ, mặc định là cột đọc; trang bài viết chọn biến thể rộng. `AdminLayout` luôn dùng khung rộng.
- Thêm component mục lục responsive dùng `PublicArticle.table_of_contents` hiện có.
- Không thay đổi SSR, routing, SEO metadata, HTML Markdown từ backend hoặc phạm vi tính năng V1.

## Kiểm thử và nghiệm thu

- Thêm Playwright kiểm tra tại 375, 768, 1024 và 1440px: không tràn ngang; desktop có mục lục bên phải; mobile chỉ có mục lục thu gọn; cột chữ không kéo dài quá mức.
- Kiểm tra computed style của light mode là nền trắng tuyệt đối; dark mode, system preference và lựa chọn lưu đều hoạt động sau reload.
- Kiểm tra bàn phím: skip link, focus indicator, theme toggle, mục lục, tag và phân trang; bảo đảm sticky TOC không che phần tử focus.
- Kiểm tra admin responsive: bảng không làm tràn viewport, editor/preview chuyển đúng giữa hai cột và một cột, nút async có feedback.
- Chạy `npm test`, `npm run check`, `npm run build` và E2E lifecycle hiện có bằng Node 24.
- Baseline ngày 2026-09-01 với Node 24.20.0 và npm 11.19.0: Astro check đạt 0 lỗi/cảnh báo, 3 unit test pass và production build thành công.
- Không commit hoặc push nếu chưa được người dùng yêu cầu.

## Giả định đã chốt

- Áp dụng cho cả public và admin.
- Giữ dark mode; yêu cầu nền trắng tuyệt đối chỉ áp dụng cho light mode.
- Ưu tiên khung rộng nhưng không mở rộng dòng văn bản đến mức giảm khả năng đọc.
- Không thêm scroll progress, hiệu ứng trang trí, animation nội dung hoặc icon package; ngoại lệ duy nhất là active-heading tracking tối thiểu cho mục lục.
