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

export const quickCommands = [
  'apk update',
  'apk add htop',
  'uname -a',
  'df -h',
  'free -h',
  'ps aux | head -20',
  'ip addr',
  'ssh -V',
  'git status',
];
