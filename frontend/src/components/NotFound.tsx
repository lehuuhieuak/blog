export default function NotFound() {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <p className="not-found__label">404 — Trang không tìm thấy</p>
      <p className="not-found__code" aria-hidden="true">404</p>
      <h1 id="not-found-title">Không tìm thấy trang</h1>
      <p>Liên kết này không tồn tại hoặc bài viết không còn được xuất bản.</p>
      <div className="not-found__actions">
        <a href="/">← Về trang chủ</a>
        <span aria-hidden="true">•</span>
        <a href="/gioi-thieu">Tìm hiểu về tác giả</a>
      </div>
    </section>
  )
}
