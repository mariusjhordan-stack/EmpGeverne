/** Sube al inicio de la página, también si el scroll suave (Lenis) está animando. */
export function scrollToTop() {
  if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo({ top: 0, behavior: 'instant' });
}
