import { cp, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'esm');
const dest = join(__dirname, '..', 'public', 'ffmpeg');

try {
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true });
  console.log('✓ ffmpeg core files copied to public/ffmpeg/');
} catch (err) {
  console.warn('⚠ Could not copy ffmpeg core (will use CDN fallback):', err.message);
}
