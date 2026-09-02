import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function NotFound() {
  return <section className="not-found mx-auto max-w-xl py-16 text-center"><Alert className="text-left" role="status"><AlertTitle>Không tìm thấy trang</AlertTitle><AlertDescription>Liên kết này không tồn tại hoặc bài viết không còn được xuất bản. <a href="/">Về trang chủ</a></AlertDescription></Alert></section>
}
