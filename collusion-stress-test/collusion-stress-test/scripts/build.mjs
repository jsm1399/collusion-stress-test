// Zero-dependency static build: copies the site into dist/ for Cloudflare Pages.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
cpSync('index.html', 'dist/index.html');
cpSync('ui', 'dist/ui', { recursive: true });
cpSync('src', 'dist/src', { recursive: true });
console.log('Built dist/');
