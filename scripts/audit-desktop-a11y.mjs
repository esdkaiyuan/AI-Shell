/**
 * Accessibility audit for the desktop renderer.
 *
 * Parses the JSX source and asserts that every interactive element carries a
 * name a screen reader can read, plus the role and state semantics the UI
 * actually relies on. Runs without a browser so it can gate every commit.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RENDERER = 'packages/desktop/src/renderer';

const issues = [];
const stats = { buttons: 0, labelledButtons: 0, textButtons: 0, fields: 0, labelledFields: 0, liveRegions: 0 };

const walk = (dir) =>
  readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith('.tsx') ? [full] : [];
  });

/** Reads the opening tag that starts at `index`. */
const openingTag = (src, index) => {
  let depth = 0;
  for (let i = index; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '>' && depth === 0) return src.slice(index, i + 1);
  }
  return src.slice(index, index + 200);
};

/** Visible text of an element, ignoring nested markup. */
const visibleText = (src, start) => {
  const close = src.indexOf('</', start);
  const inner = src.slice(start, close === -1 ? start + 400 : close);
  return inner.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

/**
 * Strips comments so a `role="button"` mentioned in prose is not mistaken for
 * a real attribute. Line numbers are preserved by replacing comment bodies
 * with newlines.
 */
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, block => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead) => lead + ' '.repeat(m.length - lead.length));

for (const file of walk(RENDERER)) {
  const raw = readFileSync(file, 'utf8');
  const src = stripComments(raw);
  const rel = file.replace(/\\/g, '/');

  // Buttons: need an accessible name. Visible text is a valid name; an
  // icon-only button must carry aria-label (title alone is not announced).
  for (const m of src.matchAll(/<button\b/g)) {
    const tag = openingTag(src, m.index);
    const line = src.slice(0, m.index).split('\n').length;
    stats.buttons += 1;
    const hasAria = /aria-label\s*=/.test(tag);
    const text = visibleText(src, m.index);
    if (hasAria) {
      stats.labelledButtons += 1;
    } else if (!text) {
      issues.push({
        file: rel,
        line,
        kind: 'button-without-name',
        detail: '图标按钮没有 aria-label，读屏器无法识别',
      });
    } else {
      stats.textButtons += 1;
    }
  }

  // Form fields: always need an explicit name.
  for (const tag of ['input', 'textarea', 'select']) {
    for (const m of src.matchAll(new RegExp(`<${tag}\\b`, 'g'))) {
      const open = openingTag(src, m.index);
      const line = src.slice(0, m.index).split('\n').length;
      stats.fields += 1;
      if (/aria-label\s*=/.test(open)) {
        stats.labelledFields += 1;
      } else {
        issues.push({
          file: rel,
          line,
          kind: 'field-without-name',
          detail: `${tag} 缺少 aria-label（placeholder 不算标签）`,
        });
      }
    }
  }

  // Live regions: content that changes without user action must announce.
  for (const m of src.matchAll(/aria-live\s*=\s*"([^"]+)"/g)) {
    stats.liveRegions += 1;
    const line = src.slice(0, m.index).split('\n').length;
    if (!['polite', 'assertive'].includes(m[1])) {
      issues.push({ file: rel, line, kind: 'invalid-live-region', detail: `aria-live="${m[1]}"` });
    }
  }

  // A div standing in for a button must be keyboard reachable.
  for (const m of src.matchAll(/role="button"/g)) {
    const start = src.lastIndexOf('<', m.index);
    const tag = openingTag(src, start);
    const line = src.slice(0, m.index).split('\n').length;
    if (!/tabIndex/.test(tag)) {
      issues.push({
        file: rel,
        line,
        kind: 'unreachable-button',
        detail: 'role="button" 的元素缺少 tabIndex，键盘用户无法聚焦',
      });
    }
    if (!/aria-label\s*=/.test(tag) && !visibleText(src, start)) {
      issues.push({
        file: rel,
        line,
        kind: 'button-without-name',
        detail: 'role="button" 的元素没有可访问名称',
      });
    }
  }
}

console.log(
  '按钮 %d 个：aria-label %d，可见文字 %d',
  stats.buttons,
  stats.labelledButtons,
  stats.textButtons,
);
console.log('表单控件 %d 个，其中带 aria-label %d', stats.fields, stats.labelledFields);
console.log('aria-live 区域 %d 个', stats.liveRegions);

if (issues.length) {
  console.log('\n发现问题 %d 项：', issues.length);
  for (const i of issues) console.log(`  ${i.file}:${i.line}  [${i.kind}] ${i.detail}`);
  process.exit(1);
}
console.log('\n无障碍检查通过');
