// The copy buttons: a button marked data-copy="..." copies that text to the clipboard when pressed,
// then shows its "copied" words for a moment (data-copied) and tells screen readers through the
// status line beside it (data-copy-status). Used beside the gpg command on the About page.
// The buttons are hidden by the styles until scripts run (the "js" mark on the page), so without
// scripts the command can still be selected and copied by hand.
import { copied as rule } from './motion.js';

// Copies text with the browser's clipboard, or the older way (select a hidden copy, then the
// browser's own copy command) when the clipboard is missing or refuses. True if it worked.
export async function copyText(text, options = {}) {
  const clipboard = 'clipboard' in options ? options.clipboard : globalThis.navigator?.clipboard;
  const fallback = options.fallback || copyBySelecting;
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      // Refused (an old browser, or a page not served over HTTPS): try the older way.
    }
  }
  try {
    return Boolean(fallback(text));
  } catch {
    return false;
  }
}

function copyBySelecting(text) {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;inset-block-start:0;opacity:0;pointer-events:none';
  document.body.append(field);
  field.select();
  try {
    return document.execCommand('copy');
  } finally {
    field.remove();
  }
}

// One listener for the whole page, so buttons on pages that arrive later work too.
export function startCopyButtons() {
  const timers = new WeakMap();
  document.addEventListener('click', async (event) => {
    const button = event.target.closest?.('[data-copy]');
    if (!button) return;
    if (!(await copyText(button.dataset.copy))) return;
    const words = button.querySelector('[data-copy-words]');
    const status = button.parentElement.querySelector('[data-copy-status]');
    words.dataset.rest ||= words.textContent;
    words.textContent = button.dataset.copied;
    button.classList.add('is-copied');
    if (status) status.textContent = button.dataset.copied;
    clearTimeout(timers.get(button));
    timers.set(
      button,
      setTimeout(() => {
        words.textContent = words.dataset.rest;
        button.classList.remove('is-copied');
        if (status) status.textContent = '';
      }, rule.time * 1000),
    );
  });
}
