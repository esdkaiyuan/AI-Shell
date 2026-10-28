import { describe, expect, it } from 'vitest';
import { MAX_PRIVATE_KEY_BYTES, parsePrivateKey } from './sshKeys';

const block = (label: string, body: string) =>
  `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`;

describe('SSH private key files', () => {
  it('normalizes an OpenSSH key with a BOM and CRLF line endings', () => {
    const payload = 'b3BlbnNzaC1rZXktdjEAAAAABG5vbmU=';
    const source = `\uFEFF${block('OPENSSH PRIVATE KEY', payload)}\r\n`;
    const parsed = parsePrivateKey(source);

    expect(parsed.kind).toBe('OpenSSH');
    expect(parsed.pem).toBe(`${block('OPENSSH PRIVATE KEY', payload)}\n`);
  });

  it('extracts a traditional RSA PEM block from surrounding text', () => {
    const payload = 'MIIEpAIBAAKCAQEA';
    const source = `notes for this server\n\n${block('RSA PRIVATE KEY', payload)}\ntrailing text`;
    const parsed = parsePrivateKey(source);

    expect(parsed.kind).toBe('RSA (PEM)');
    expect(parsed.pem).toBe(`${block('RSA PRIVATE KEY', payload)}\n`);
  });

  it('recognizes EC and PKCS#8 PEM keys', () => {
    expect(parsePrivateKey(block('EC PRIVATE KEY', 'MIIEpAIBAAKCAQEA')).kind).toBe('ECDSA (PEM)');
    expect(parsePrivateKey(block('PRIVATE KEY', 'MIGfMA0GCSqGSIb3DQEBAQUA')).kind).toBe('PKCS#8');
  });

  it('tolerates whitespace after markers and single-line pastes', () => {
    const source =
      '-----BEGIN RSA PRIVATE KEY-----   MIIEpAIBAAKCAQEA   -----END RSA PRIVATE KEY-----   ';

    expect(parsePrivateKey(source).kind).toBe('RSA (PEM)');
  });

  it('marks encrypted OpenSSH keys from their embedded cipher', () => {
    const encrypted = block('OPENSSH PRIVATE KEY', 'b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHI=');
    const plain = block('OPENSSH PRIVATE KEY', 'b3BlbnNzaC1rZXktdjEAAAAABG5vbmU=');

    expect(parsePrivateKey(encrypted).kind).toBe('OpenSSH · 加密');
    expect(parsePrivateKey(plain).kind).toBe('OpenSSH');
  });

  it('recognizes encrypted PKCS#8 and traditional encrypted keys', () => {
    expect(parsePrivateKey(block('ENCRYPTED PRIVATE KEY', 'MIGfMA0GCSqGSIb3DQEBAQUA')).kind).toBe(
      'PKCS#8 (加密)'
    );

    const traditional = block(
      'RSA PRIVATE KEY',
      'Proc-Type: 4,ENCRYPTED\nDEK-Info: AES-128-CBC,0123456789ABCDEF\n\nMIIEpAIBAAKCAQEA'
    );
    const parsed = parsePrivateKey(traditional);
    expect(parsed.kind).toBe('RSA (PEM) · 加密');
    expect(parsed.pem).toContain('DEK-Info: AES-128-CBC,0123456789ABCDEF\n\n');
  });

  it('explains that PuTTY PPK files must be converted first', () => {
    expect(() => parsePrivateKey('PuTTY-User-Key-File-3: ssh-rsa')).toThrow('PuTTY');
  });

  it('does not treat a certificate as a private key', () => {
    expect(() => parsePrivateKey(block('CERTIFICATE', 'TUlJQ3R6Q0NBWitnQXdJQkFnSUJBVA=='))).toThrow(
      '证书'
    );
  });

  it('rejects a damaged PEM payload', () => {
    expect(() => parsePrivateKey(block('OPENSSH PRIVATE KEY', 'not base64!'))).toThrow(
      '私钥内容无效'
    );
  });

  it('rejects well-formed base64 that is not a private key', () => {
    expect(() => parsePrivateKey(block('PRIVATE KEY', 'iVBORw0KGgo='))).toThrow('私钥内容无效');
    expect(() => parsePrivateKey(block('OPENSSH PRIVATE KEY', 'iVBORw0KGgo='))).toThrow(
      '私钥内容无效'
    );
  });

  it('rejects keys larger than the configured limit', () => {
    expect(() => parsePrivateKey('x'.repeat(MAX_PRIVATE_KEY_BYTES + 1))).toThrow('64 KB');
  });
});
