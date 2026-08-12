import { defineConfig } from 'vite'

// Tauri expects a fixed dev port and quiet output. fs.allow lets the frontend
// import the canon validity map from the repo root (../canon).
export default defineConfig({
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: ['..'] },
  },
  build: { target: 'es2021', outDir: 'dist', emptyOutDir: true },
})
