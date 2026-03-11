import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const base = env.VITE_APP_BASE_PATH || (mode === "production" ? "/admin/" : "/");

    return {
        base,
        server: {
            host: "::",
            port: 18080,
            hmr: {
                overlay: false,
            },
            proxy: {
                "/admin/api": {
                    target: "http://localhost:18081",
                    changeOrigin: true,
                },
                "/product-images": {
                    target: "http://localhost:18081",
                    changeOrigin: true,
                },
                "/api": {
                    target: "http://localhost:18081",
                    changeOrigin: true,
                },
            },
        },
        plugins: [react()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
    };
});
