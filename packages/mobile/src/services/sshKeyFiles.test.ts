import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { pickPrivateKeyFile } from './sshKeyFiles';
import { MAX_PRIVATE_KEY_BYTES } from './sshKeys';

vi.mock('expo-document-picker', () => ({
  getDocumentAsync: vi.fn(),
}));

vi.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8' },
  readAsStringAsync: vi.fn(),
  deleteAsync: vi.fn(),
}));

const key =
  '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmU=\n-----END OPENSSH PRIVATE KEY-----\n';

beforeEach(() => {
  vi.mocked(FileSystem.deleteAsync).mockReset().mockResolvedValue(undefined);
  vi.mocked(FileSystem.readAsStringAsync).mockReset().mockResolvedValue(key);
  vi.mocked(DocumentPicker.getDocumentAsync).mockReset().mockResolvedValue({
    canceled: false,
    assets: [{ name: 'id_ed25519', uri: 'file:///cache/id_ed25519', size: key.length }],
  });
});

describe('private key file picker', () => {
  it('removes the temporary cache copy after reading the key', async () => {
    const picked = await pickPrivateKeyFile();

    expect(picked?.kind).toBe('OpenSSH');
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/id_ed25519', {
      idempotent: true,
    });
  });

  it('removes the temporary cache copy when the file is not a private key', async () => {
    vi.mocked(FileSystem.readAsStringAsync).mockResolvedValue(
      '-----BEGIN CERTIFICATE-----\nTUlJQ3R6Q0NBWitnQXdJQkFnSUJBVA==\n-----END CERTIFICATE-----'
    );

    await expect(pickPrivateKeyFile()).rejects.toThrow('证书');
    expect(FileSystem.deleteAsync).toHaveBeenCalledOnce();
  });

  it('rejects oversized files and still removes the cache copy', async () => {
    vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [
        {
          name: 'large.pem',
          uri: 'file:///cache/large.pem',
          size: MAX_PRIVATE_KEY_BYTES + 1,
        },
      ],
    });

    await expect(pickPrivateKeyFile()).rejects.toThrow('64 KB');
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalledOnce();
  });

  it('does not delete non-cache or web file selections', async () => {
    vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [{ name: 'id_ed25519', uri: 'content://picked/id', size: key.length }],
    });

    await pickPrivateKeyFile();

    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });
});
