export interface ParsedPrivateKey {
  pem: string;
  kind: string;
}

export const MAX_PRIVATE_KEY_BYTES = 64 * 1024;
export const PRIVATE_KEY_TOO_LARGE = '私钥文件超过 64 KB，请确认选择的是密钥而不是其他文件。';

const KEY_LABELS: Array<{ label: string; kind: string }> = [
  { label: 'OPENSSH PRIVATE KEY', kind: 'OpenSSH' },
  { label: 'ENCRYPTED PRIVATE KEY', kind: 'PKCS#8 (加密)' },
  { label: 'RSA PRIVATE KEY', kind: 'RSA (PEM)' },
  { label: 'EC PRIVATE KEY', kind: 'ECDSA (PEM)' },
  { label: 'DSA PRIVATE KEY', kind: 'DSA (PEM)' },
  { label: 'PRIVATE KEY', kind: 'PKCS#8' },
];

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export const privateKeyByteLength = (value: string): number => {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      bytes += 4;
      index += 1;
    } else {
      bytes += 3;
    }
  }
  return bytes;
};

const decodeBase64Prefix = (payload: string, maxBytes: number): number[] => {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of payload) {
    if (char === '=') break;
    const value = BASE64_ALPHABET.indexOf(char);
    if (value < 0) break;
    buffer = ((buffer << 6) | value) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
      if (bytes.length >= maxBytes) break;
    }
  }
  return bytes;
};

const ascii = (bytes: number[]): string => String.fromCharCode(...bytes);

const opensshEncrypted = (bytes: number[]): boolean => {
  if (ascii(bytes.slice(0, 15)) !== 'openssh-key-v1\0') return false;
  if (bytes.length < 19) return false;
  const cipherLength =
    (bytes[15] << 24) | (bytes[16] << 16) | (bytes[17] << 8) | bytes[18];
  if (cipherLength < 1 || cipherLength > 64 || bytes.length < 19 + cipherLength) return false;
  return ascii(bytes.slice(19, 19 + cipherLength)) !== 'none';
};

const findBlock = (source: string, label: string): string | null => {
  const begin = `-----BEGIN ${label}-----`;
  const end = `-----END ${label}-----`;
  const start = source.indexOf(begin);
  if (start < 0) return null;
  const endIndex = source.indexOf(end, start + begin.length);
  return endIndex < 0 ? null : source.slice(start + begin.length, endIndex);
};

export const parsePrivateKey = (raw: string): ParsedPrivateKey => {
  if (privateKeyByteLength(raw) > MAX_PRIVATE_KEY_BYTES) {
    throw new Error(PRIVATE_KEY_TOO_LARGE);
  }
  const source = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (/PuTTY-User-Key-File/i.test(source)) {
    throw new Error('这是 PuTTY .ppk 密钥，请先用 PuTTYgen 导出为 OpenSSH 私钥。');
  }

  for (const entry of KEY_LABELS) {
    const body = findBlock(source, entry.label);
    if (body === null) continue;

    const lines = body
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    const headers = lines.filter(line => /^(Proc-Type|DEK-Info):/i.test(line));
    const encrypted = headers.some(line => /^Proc-Type:\s*4,\s*ENCRYPTED$/i.test(line));
    const payload = lines
      .filter(line => !/^(Proc-Type|DEK-Info):/i.test(line))
      .join('')
      .replace(/\s/g, '');

    if (!payload || payload.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) {
      throw new Error('私钥内容无效，请确认文件完整且没有缺失字符。');
    }

    const prefix = decodeBase64Prefix(payload, 96);
    const isOpenSsh = entry.label === 'OPENSSH PRIVATE KEY';
    const valid = isOpenSsh
      ? prefix.length >= 19 && ascii(prefix.slice(0, 15)) === 'openssh-key-v1\0'
      : prefix[0] === 0x30;
    if (!valid) {
      throw new Error('私钥内容无效，请确认文件是完整的 PEM 私钥。');
    }
    const opensshEncryption = isOpenSsh && opensshEncrypted(prefix);

    const encoded = payload.match(/.{1,64}/g) ?? [];
    const encodedPem = [...headers, ...(headers.length ? [''] : []), ...encoded].join('\n');
    return {
      pem: `-----BEGIN ${entry.label}-----\n${encodedPem}\n-----END ${entry.label}-----\n`,
      kind:
        encrypted || opensshEncryption ? `${entry.kind} · 加密` : entry.kind,
    };
  }

  if (/-----BEGIN CERTIFICATE-----/.test(source)) {
    throw new Error('这是证书文件，不是私钥。请选择不含证书的 PEM 私钥。');
  }
  if (/-----BEGIN (RSA |EC |OPENSSH )?PUBLIC KEY-----/.test(source)) {
    throw new Error('这是公钥文件，私钥才能用于 SSH 登录。');
  }
  throw new Error('未识别到 PEM 私钥，支持 OpenSSH、RSA、ECDSA、PKCS#8 及加密 PEM。');
};
