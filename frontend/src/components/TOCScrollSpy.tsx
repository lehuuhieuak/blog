const script = `(function () {
  const tocLinks = Array.from(document.querySelectorAll('[data-toc-link]'));
  const headings = Array.from(document.querySelectorAll('.article-content h2[id], .article-content h3[id]'))
    .filter((heading) => tocLinks.some((link) => link.dataset.tocTarget === heading.id));
  if (tocLinks.length === 0 || headings.length === 0) return;
  const readingMarker = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) * 6;
  let activeID;
  let animationFrame;
  const syncActiveTOC = () => {
    let currentHeading;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= readingMarker) currentHeading = heading;
      else break;
    }
    const nextActiveID = currentHeading && currentHeading.id;
    if (nextActiveID === activeID) return;
    activeID = nextActiveID;
    for (const link of tocLinks) {
      const isActive = link.dataset.tocTarget === activeID;
      link.toggleAttribute('data-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };
  const scheduleTOCSync = () => {
    if (animationFrame !== undefined) return;
    animationFrame = requestAnimationFrame(() => { animationFrame = undefined; syncActiveTOC(); });
  };
  const observer = new IntersectionObserver(scheduleTOCSync, { rootMargin: '-' + readingMarker + 'px 0px 0px', threshold: 0 });
  headings.forEach((heading) => observer.observe(heading));
  scheduleTOCSync();
  window.addEventListener('scroll', scheduleTOCSync, { passive: true });
  window.addEventListener('hashchange', scheduleTOCSync);
})();`

export default function TOCScrollSpy() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
