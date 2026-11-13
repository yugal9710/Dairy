import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const CLIENT_DIR = path.join(ROOT_DIR, 'client');
const CLIENT_DIST = path.join(CLIENT_DIR, 'dist');
const BUILD_DIR = path.join(ROOT_DIR, 'build');

console.log('==============================================');
console.log('🚀 Running Production Build for Render / Static');
console.log('==============================================');

try {
  // 1. Install client dependencies if needed
  console.log('>>> [1/3] Installing client dependencies...');
  execSync('npm install --prefix client', {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });

  // 2. Build Vite client
  console.log('>>> [2/3] Building Vite frontend...');
  execSync('npm run build --prefix client', {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });

  // 3. Ensure publish directory 'build' exists and copy client/dist into it
  console.log('>>> [3/3] Syncing dist to publish directory "build"...');
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(BUILD_DIR, { recursive: true });

  if (fs.existsSync(CLIENT_DIST)) {
    fs.cpSync(CLIENT_DIST, BUILD_DIR, { recursive: true });
    console.log(`✓ Copied ${CLIENT_DIST} -> ${BUILD_DIR}`);
  } else {
    throw new Error(`client/dist not found at ${CLIENT_DIST}`);
  }

  // Also create an index.html fallback if needed
  console.log('==============================================');
  console.log('🎉 Production build successfully created in "build" directory!');
  console.log('==============================================');
} catch (err) {
  console.error('❌ Build failed:', err);
  process.exit(1);
}
