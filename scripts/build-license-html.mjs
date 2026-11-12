#!/usr/bin/env node
/**
 * 从协议正文生成安装向导用的 HTML 协议页。
 *
 * 为什么需要这一步：
 *   NSIS 的 MUI_PAGE_LICENSE 在编译期用 makensis 所在机器的 ANSI 码页读取协议
 *   文本（中文 Windows 为 GBK/936），UTF-8 文件会被误解码成乱码；加 UTF-8 BOM
 *   与 UTF-16LE BOM 均无效（NSIS 3.04 的 LoadLicenseFile 走 AnsiCP 分支）。
 *   改用 HTML 协议页后由 EmbedHTML 走系统浏览器控件渲染，页面自带
 *   <meta charset="utf-8">，任何系统语言下都能正确显示。
 *
 * 用法：
 *   node scripts/build-license-html.mjs
 *
 * 输入：packages/desktop/build/agreement_zh_CN.txt、agreement_en.txt
 * 输出：packages/desktop/build/agreement.html（安装向导用）
 *       packages/desktop/build/agreement_zh_CN.html、agreement_en.html（单语言版）
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const buildDir = join(here, '..', 'packages', 'desktop', 'build');

const CSS = `body{font-family:'Microsoft YaHei','Segoe UI',sans-serif;font-size:12px;line-height:1.8;
     margin:0;padding:14px 18px;color:#1a1a1a;background:#fff;}
h1{font-size:15px;margin:0 0 2px;color:#111;font-weight:600;}
.sub{font-size:11.5px;color:#666;margin:0 0 4px;}
.meta{font-size:11px;color:#888;margin:0 0 16px;}
h2{font-size:12.5px;margin:20px 0 8px;padding-left:8px;border-left:3px solid #0a84ff;color:#111;font-weight:600;}
p{margin:0 0 9px;}
hr{border:none;border-top:1px solid #e6e6e6;margin:16px 0;}
#en{display:none;}`;

/**
 * 运行时按系统语言切换。
 * 默认显示中文块 —— 即使脚本被系统策略禁用也不会出现空白页，
 * 只有确认不是中文系统时才切到英文。
 */
const SCRIPT = `<script>
(function(){
  var lang = '';
  try { lang = (navigator.language || navigator.userLanguage || '').toLowerCase(); } catch (e) {}
  if (lang.indexOf('zh') !== 0) {
    var z = document.getElementById('zh'), e2 = document.getElementById('en');
    if (z) { z.style.display = 'none'; }
    if (e2) { e2.style.display = 'block'; }
  }
})();
</script>`;

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const isCjk = (ch) => {
  const o = ch.codePointAt(0);
  return (o >= 0x4e00 && o <= 0x9fff) || (o >= 0x3000 && o <= 0x303f) || (o >= 0xff00 && o <= 0xffef);
};

/** 中文行间直接相连（原文是硬换行），西文行间补一个空格。 */
const joinParagraph = (lines) =>
  lines.reduce((acc, line) => {
    if (!acc.length) return line;
    const needsSpace = !isCjk(acc[acc.length - 1].slice(-1)) && !isCjk(line.slice(0, 1));
    return acc + (needsSpace ? ' ' : '') + line;
  }, '');

const stripBom = (buf) => (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf ? buf.subarray(3) : buf);

const isSectionTitle = (s) =>
  (s.length < 40 && /^[一二三四五六七八九十]+、\S/.test(s)) ||
  (s.length < 70 && /^\d+\.\s+[A-Z]/.test(s));

const toHtml = (text) => {
  const raw = text.split('\n').map((l) => l.replace(/\s+$/, ''));
  while (raw.length && !raw[0].trim()) raw.shift();
  while (raw.length && !raw[raw.length - 1].trim()) raw.pop();

  const out = [
    '<!DOCTYPE html>',
    '<html><head><meta charset="utf-8">',
    '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">',
    `<style>${CSS}</style></head><body>`,
  ];
  let para = [];
  let first = true;

  const flush = () => {
    if (para.length) {
      out.push(`<p>${escapeHtml(joinParagraph(para))}</p>`);
      para = [];
    }
  };

  for (const line of raw) {
    const s = line.trim();
    if (!s) {
      flush();
      continue;
    }
    if (s.length > 10 && [...new Set(s)].every((c) => '─—-'.includes(c))) {
      flush();
      out.push('<hr>');
      continue;
    }
    if (first) {
      flush();
      out.push(`<h1>${escapeHtml(s)}</h1>`);
      first = false;
      continue;
    }
    if (s.startsWith('Software License')) {
      flush();
      out.push(`<p class="sub">${escapeHtml(s)}</p>`);
      continue;
    }
    if (s.startsWith('版本') || s.startsWith('Version ')) {
      flush();
      out.push(`<p class="meta">${escapeHtml(s)}</p>`);
      continue;
    }
    if (isSectionTitle(s)) {
      flush();
      out.push(`<h2>${escapeHtml(s)}</h2>`);
      continue;
    }
    // 编号条款（1.1 / 4.2）：开启新段落，续行并入
    if (/^\d+\.\d+\s/.test(s)) {
      flush();
      para.push(s);
      continue;
    }
    para.push(s);
  }
  flush();
  out.push('</body></html>');
  return out.join('\n');
};

const bodyOf = (html) => html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));

const readSource = (name) => stripBom(readFileSync(join(buildDir, name))).toString('utf8');

const zhHtml = toHtml(readSource('agreement_zh_CN.txt'));
const enHtml = toHtml(readSource('agreement_en.txt'));

// MSHTML（NSIS EmbedHTML 使用的 IE 内核）对无 BOM 的本地文件会先按系统
// ANSI 码页做编码嗅探，<meta charset> 要等嗅探之后才生效，中文因此变成乱码。
// 写入 UTF-8 BOM 让内核无需嗅探即可确定编码。
const BOM = '\ufeff';
const writeHtml = (file, content) =>
  writeFileSync(join(buildDir, file), BOM + content, 'utf8');

writeHtml('agreement_zh_CN.html', zhHtml);
writeHtml('agreement_en.html', enHtml);

const combined = [
  '<!DOCTYPE html>',
  '<html><head><meta charset="utf-8">',
  '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">',
  `<style>${CSS}</style></head><body>`,
  `<div id="zh">${bodyOf(zhHtml)}</div>`,
  `<div id="en">${bodyOf(enHtml)}</div>`,
  SCRIPT,
  '</body></html>',
].join('\n');

writeHtml('agreement.html', combined);

console.log('agreement.html        %d bytes', Buffer.byteLength(combined));
console.log('agreement_zh_CN.html  %d bytes', Buffer.byteLength(zhHtml));
console.log('agreement_en.html     %d bytes', Buffer.byteLength(enHtml));
