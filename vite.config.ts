import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import vue from '@vitejs/plugin-vue'

const isTauri = process.env.TAURI_ENV === 'true'

export default defineConfig({
  plugins: [
    vue(),
    !isTauri && electron({
      main: {
        entry: 'electron/main.ts',
        onstart(args) {
          if (args.reload) {
            args.reload()
          } else {
            args.startup()
          }
        },
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            rollupOptions: {
              external: ['better-sqlite3', 'bindings'],
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
        vite: {
          build: {
            sourcemap: true,
          },
        },
      },
      renderer: process.env.NODE_ENV === 'test'
        ? undefined
        : {
            nodeIntegration: false,
            contextIsolation: true,
          },
    }),
  ].filter(Boolean),
})
