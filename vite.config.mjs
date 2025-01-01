import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
    plugins: [react()],
    clearScreen: false,
    css: {
        postcss: {
            plugins: [tailwindcss, autoprefixer],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@tauri-apps/api': path.resolve('./node_modules/@tauri-apps/api'),
        }
    },
    build: {
        target: 'esnext',
    },
    server: {
        fs: {
            allow: [".."]
        },
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: "ws",
                host,
                port: 1421,
            }
            : undefined,
        watch: {
            ignored: ["**/src-tauri/**"],
        },
    },
}));
