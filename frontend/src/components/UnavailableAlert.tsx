import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Props { title?: string; message: string }

export default function UnavailableAlert({ title = "Tạm thời không khả dụng", message }: Props) {
  return <Alert className="empty-state" role="status"><AlertTitle>{title}</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>
}
