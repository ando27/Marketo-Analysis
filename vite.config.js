import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import packageJson from './package.json'

// GitHub Pages serves the app from https://ando27.github.io/Marketo-Analysis/,
// so that build needs a subpath. The workflow sets GITHUB_PAGES=true.
// Everywhere else (Vercel, local dev) the app is served from the root.
const base = process.env.GITHUB_PAGES === 'true' ? '/Marketo-Analysis/' : '/'

// https://vitejs.dev/config/
export default defineConfig({
    base,
    plugins: [react()],
    define: {
        'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version)
    }
})
