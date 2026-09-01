# Sửa mục lục bám theo khi cuộn bài viết

## Tóm tắt

- Nguyên nhân hiện tại: `position: sticky` nằm trên `.toc--desktop`, nhưng phần tử cha `<aside>` chỉ cao bằng mục lục nên không tạo đủ vùng di chuyển.
- Chuyển hành vi sticky sang `<aside>` để mục lục bám theo viewport trong phạm vi bài viết và tự dừng trước footer.
- Không thay đổi giao diện mục lục mobile, API, component props hoặc bổ sung JavaScript.

## Thay đổi triển khai

- Tại breakpoint desktop `68rem` trở lên, đặt `.article-layout__toc` thành `position: sticky`, `top: 2rem` và `align-self: start`.
- Giữ `.article-layout` làm containing block để mục lục chỉ bám trong chiều cao bài viết, không chồng lên footer.
- Bỏ `position: sticky` khỏi `.toc--desktop`; đặt lại margin để chiều cao sidebar không bị tăng ngoài ý muốn.
- Giới hạn mục lục desktop bằng `max-height: calc(100vh - 4rem)` và ưu tiên `100dvh` khi trình duyệt hỗ trợ.
- Khi danh sách dài hơn viewport, cho `.toc--desktop` cuộn dọc với `overflow-y: auto`, `overscroll-behavior: contain` và `scrollbar-gutter: stable`.
- Giữ nguyên thứ tự DOM, liên kết anchor, focus state và mục lục thu gọn trên tablet/mobile.
- Không thêm smooth-scroll, scroll-spy, active-heading tracking hoặc animation.
- Không cần sửa `PLAN.md` vì đặc tả hiện tại đã yêu cầu mục lục sticky bên phải.

## Interface và tương thích

- Không thay đổi backend, API contract, OpenAPI hoặc frontend types.
- Không thay đổi interface của `ArticleTOC.astro` hay markup trang bài viết.
- Thay đổi chỉ thuộc CSS desktop; màn hình dưới `68rem` tiếp tục dùng `details/summary`.

## Kiểm thử

- Bổ sung Playwright với bài viết đủ dài: cuộn giữa bài và xác nhận sidebar vẫn hiện ở offset khoảng `2rem` từ đỉnh viewport.
- Cuộn tới cuối bài và xác nhận mục lục dừng theo article container, không đè footer.
- Dùng bài có nhiều heading để xác nhận mục lục phát sinh thanh cuộn riêng, mục cuối vẫn focus/click được bằng bàn phím.
- Kiểm tra tại 375, 768 và 1024px rằng mục lục compact không đổi; tại 1440px mục lục desktop sticky hoạt động.
- Kiểm tra bài ngắn, bài không có mục lục và trang có mục lục dài không gây tràn ngang.
- Chạy `npm run check`, `npm test`, `npm run build` và Playwright E2E liên quan bằng Node 24.
