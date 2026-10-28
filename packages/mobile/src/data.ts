export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'directory' | 'file';
  parentPath?: string;
  size?: string;
  modified?: string;
  hidden?: boolean;
}
