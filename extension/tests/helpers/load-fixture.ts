import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Load an HTML fixture file (path relative to the tests/ directory) and
 * install its <body> content into the global test document. Uses DOMParser
 * (no script execution) + importNode — never innerHTML.
 */
export function loadFixture(relativePathFromTests: string): void {
  const testsDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  const html = readFileSync(join(testsDir, relativePathFromTests), 'utf8');
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const imported = Array.from(parsed.body.childNodes).map((n) =>
    document.importNode(n, true),
  );
  document.body.replaceChildren(...imported);
}
