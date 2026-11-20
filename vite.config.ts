import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdir, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'

export default defineConfig({
  base: './',
  plugins: [react(), {
    name: 'exclude-unapproved-client-media',
    apply: 'build',
    async closeBundle() {
      const media = resolve('dist/media')
      for (const file of await readdir(media)) {
        if (file.startsWith('gallery-')) await unlink(resolve(media, file))
      }
    },
  }],
})
