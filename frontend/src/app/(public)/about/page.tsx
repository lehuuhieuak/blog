import type { Metadata } from "next"

import PageShell from "@/components/PageShell"
import { routes } from "@/lib/routes"
import { site } from "@/lib/site"

export const metadata: Metadata = { title: "Giới thiệu", alternates: { canonical: routes.about } }

export default function AboutPage() {
  return (
    <PageShell>
      <article className="about-page">
        <header className="page-intro">
          <p className="eyebrow">Giới thiệu</p>
          <h1>Chào bạn, mình là {site.author}.</h1>
          <p>{site.description}</p>
        </header>
        <div className="about-page__body">
          <p>Đây là nơi mình lưu lại những điều đang học, những công cụ hữu ích và vài suy nghĩ chưa kịp hoàn thiện.</p>
          <section className="about-page__note" aria-labelledby="about-purpose">
            <h2 id="about-purpose">Mục đích ra đời</h2>
            <p>{site.name} là một không gian để ghi lại trải nghiệm, những bài học rút ra từ lỗi sai và đôi dòng chiêm nghiệm trong cuộc sống thường ngày.</p>
          </section>
          <p>Mình chọn cho trang viết này một nhịp độ chậm rãi, với nội dung rõ ràng, dễ đọc và đủ khoảng lặng để mỗi ý tưởng được trình bày trọn vẹn.</p>
          <blockquote>
            <strong>Nguyên tắc viết</strong>
            <p>Chỉ chia sẻ những gì mình thực sự trải nghiệm và tìm hiểu kỹ.</p>
          </blockquote>
          <p>Dù bạn ghé qua từ một liên kết tìm kiếm hay đã đọc blog từ lâu, hy vọng những ghi chép ở đây mang lại một góc nhìn hữu ích cho công việc và cuộc sống.</p>
          <footer className="about-page__closing">
            <div><h2>Chúc bạn một ngày bình yên.</h2><p>Cảm ơn bạn đã dành thời gian đọc đến đây.</p></div>
            {site.socialURL && <a href={site.socialURL} rel="me">Kết nối với {site.author}</a>}
          </footer>
        </div>
      </article>
    </PageShell>
  )
}
