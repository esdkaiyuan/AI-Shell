import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outdir = path.join(root, 'dist', 'main');

await build({
  entryPoints: [path.join(root, 'src', 'main', 'index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: path.join(outdir, 'index.js'),
  sourcemap: true,
  external: [
    'cpu-features',
    'electron',
    'node-pty',
    'sql.js',
    'sql.js/*',
  ],
  loader: {
    '.node': 'file',
  },
});

await mkdir(path.join(outdir, 'shell'), { recursive: true });
await mkdir(path.join(outdir, 'ssh'), { recursive: true });
await copyFile(path.join(root, 'dist', 'main', 'index.d.ts'), path.join(outdir, 'index.d.ts')).catch(() => {});
await copyFile(path.join(root, 'dist', 'main', 'index.d.ts.map'), path.join(outdir, 'index.d.ts.map')).catch(() => {});
