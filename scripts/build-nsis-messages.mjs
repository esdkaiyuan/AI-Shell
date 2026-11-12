#!/usr/bin/env node
/**
 * 生成 NSIS 简体中文文案覆盖脚本。
 *
 * 背景（两个独立的乱码源）：
 *
 * 1. NSIS 3.0.4.1 自带的 SimpChinese.nlf 头部声明 `Codepage 936`（GBK），
 *    但文件内容存的是 UTF-8 字节。NSIS 按 GBK 解码后，安装向导的页面标题、
 *    按钮文字会出现「检閱協议」这类简繁混杂的乱码。
 *
 * 2. 协议正文若用纯文本（MUI_PAGE_LICENSE），同样按 ANSI 码页读取，
 *    中文必然乱码 —— 这部分改用 HTML 协议页解决，见 build-license-html.mjs。
 *
 * 解决办法：
 *   在 NSIS 加载语言文件（!insertmacro MUI_LANGUAGE）之前，用
 *   `LangString <key> 2052 "<text>"` 预先定义简体中文（LCID 2052）下的全部
 *   字符串。NSIS 采用「先定义者优先」，因此这些定义会覆盖 .nlf 里的乱码值，
 *   且不会触发 "set multiple times" 警告。
 *
 *   LangString 按 LCID 定向，不影响英文等其他语言。
 *
 * 文案原文取自 NSIS 自带的 SimpChinese.nlf 与 SimpChinese.nsh
 * （这两个源文件本身是正确的 UTF-8），已固化到 build/nsis/*.json。
 *
 * 用法：
 *   node scripts/build-nsis-messages.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const buildDir = join(here, '..', 'packages', 'desktop', 'build');
const nsisDir = join(buildDir, 'nsis');

// 只有 .nlf 里的字符串表需要覆盖：它声明 Codepage 936 却存 UTF-8 字节。
// .nsh 里的 MUI 文案由 makensis 按 -INPUTCHARSET UTF8 正确读取，本身不乱码，
// 重复定义反而会触发 "set multiple times" 警告（electron-builder 传了 -WX，
// 警告会被升级为错误），因此不覆盖。
const stringTable = JSON.parse(readFileSync(join(nsisDir, 'zh-CN-strings.json'), 'utf8'));

const header = `; AI Shell —— NSIS 简体中文文案覆盖
;
; 由 scripts/build-nsis-messages.mjs 生成，请勿手工编辑。
;
; NSIS 3.0.4.1 自带的 SimpChinese.nlf 声明 Codepage 936（GBK），内容却是 UTF-8
; 字节 —— NSIS 按 GBK 解码后，安装向导的页面标题与按钮文字会出现「检閱協议」
; 这类简繁混杂的乱码。
;
; 这里在 NSIS 加载语言文件之前，用 LangString 预先定义简体中文（LCID 2052）
; 的全部字符串。NSIS 采用「先定义者优先」，因此这些定义会覆盖 .nlf 里的乱码值，
; 且不会触发 "set multiple times" 警告。按 LCID 定向，不影响其他语言。
;
; 协议正文另由 HTML 协议页承载（EmbedHTML 渲染），见 build-license-html.mjs。

!ifndef AI_SHELL_NSIS_MESSAGES
  !define AI_SHELL_NSIS_MESSAGES
`;

/**
 * NSIS 字符串值的转义：
 *   - 源文件里的引号已写成 \"，但那是 C 风格转义，NSIS 不认 —— NSIS 的
 *     字符串里双引号必须写成 $\"。直接透传会导致
 *     "LangString expects 3 parameters" 报错（引号提前闭合外层引号）。
 *   - 未转义的双引号同样要转成 $\"。
 *   - 反斜杠不是 NSIS 的转义字符，$\\r$\\n 这类换行记法需原样保留。
 */
const escapeValue = (value) =>
  value
    .replace(/\\"/g, '$\\"')
    .replace(/(?<!\\)"/g, '$\\"');

const lines = stringTable.map(
  ([key, value]) => `  LangString ^${key} 2052 "${escapeValue(value)}"`,
);

writeFileSync(
  join(buildDir, 'installer.nsh'),
  `${header}\n${lines.join('\n')}\n\n!endif\n`,
  'utf8',
);

console.log('installer.nsh 已生成：字符串表 %d 条', lines.length);
