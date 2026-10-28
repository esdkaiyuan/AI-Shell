import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  MAX_PRIVATE_KEY_BYTES,
  PRIVATE_KEY_TOO_LARGE,
  parsePrivateKey,
  privateKeyByteLength,
  type ParsedPrivateKey,
} from './sshKeys';

export interface PickedPrivateKey extends ParsedPrivateKey {
  name: string;
}

export const pickPrivateKeyFile = async (): Promise<PickedPrivateKey | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  try {
    if (typeof asset.size === 'number' && asset.size > MAX_PRIVATE_KEY_BYTES) {
      throw new Error(PRIVATE_KEY_TOO_LARGE);
    }

    const content = asset.file
      ? await asset.file.text()
      : await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
    if (privateKeyByteLength(content) > MAX_PRIVATE_KEY_BYTES) {
      throw new Error(PRIVATE_KEY_TOO_LARGE);
    }

    return {
      name: asset.name,
      ...parsePrivateKey(content),
    };
  } finally {
    if (FileSystem.cacheDirectory && asset.uri.startsWith(FileSystem.cacheDirectory)) {
      await FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(() => undefined);
    }
  }
};
