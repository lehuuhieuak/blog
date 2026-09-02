import type { TOCItem } from "@/features/article/types"

interface Props { items: TOCItem[]; collapsible?: boolean }

function TOCItems({ items }: Pick<Props, "items">) {
  return <ol>{items.map((item) => <li className={`toc-level-${item.level}`} key={item.id}><a href={`#${item.id}`} data-toc-link data-toc-target={item.id}>{item.text}</a></li>)}</ol>
}

export default function ArticleTOC({ items, collapsible = false }: Props) {
  if (collapsible) return <details className="toc toc--compact"><summary>Mục lục</summary><nav aria-label="Mục lục bài viết"><TOCItems items={items} /></nav></details>
  return <nav className="toc toc--desktop" aria-label="Mục lục bài viết"><p className="toc__title">Mục lục</p><TOCItems items={items} /></nav>
}
