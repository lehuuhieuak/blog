import Link from "next/link"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TOCItem } from "@/features/article/types"

interface Props { items: TOCItem[]; collapsible?: boolean }

function TOCItems({ items }: Pick<Props, "items">) {
  return <ol className="m-0 list-none p-0">{items.map((item) => <li className={item.level === 3 ? "ml-4" : undefined} key={item.id}><Link className="my-1 block border-l-[3px] border-transparent py-1 pl-3 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[active=true]:border-foreground data-[active=true]:font-semibold data-[active=true]:text-foreground" data-toc-link data-toc-target={item.id} href={`#${item.id}`}>{item.text}</Link></li>)}</ol>
}

export default function ArticleTOC({ items, collapsible = false }: Props) {
  if (collapsible) return <Accordion className="border-y" data-toc-mobile><AccordionItem value="table-of-contents"><AccordionTrigger>Mục lục</AccordionTrigger><AccordionContent><nav aria-label="Mục lục bài viết"><TOCItems items={items} /></nav></AccordionContent></AccordionItem></Accordion>
  return <nav aria-label="Mục lục bài viết"><p className="mb-3 text-sm font-semibold">Mục lục</p><ScrollArea data-toc-desktop className="h-[calc(100dvh-4rem)] pr-3"><TOCItems items={items} /></ScrollArea></nav>
}
