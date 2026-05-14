import { createRoot } from 'react-dom/client';
import { act } from 'react';
import type { ReactElement } from 'react';

export function render(ui: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    getByPlaceholderText(re: RegExp): Element {
      const el = [...container.querySelectorAll('input,textarea')].find((e) =>
        re.test((e as HTMLInputElement).placeholder),
      );
      if (!el) throw new Error(`no element with placeholder ${re}`);
      return el;
    },
    getAllByRole(role: string): HTMLElement[] {
      if (role === 'button') return [...container.querySelectorAll('button')];
      return [...container.querySelectorAll<HTMLElement>(`[role="${role}"]`)];
    },
  };
}
