/** Tiny element builder so UI code stays readable without a framework. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}

/** A modal sheet built on <dialog>: focus trap, Escape to close, removed when closed. */
export function openSheet(title: string, body: Node[], onClose?: () => void): HTMLDialogElement {
  const dialog = el('dialog', { class: 'sheet', 'aria-label': title }, [
    el('h2', { text: title }),
    ...body,
  ]);
  dialog.addEventListener('close', () => {
    dialog.remove();
    onClose?.();
  });
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}
