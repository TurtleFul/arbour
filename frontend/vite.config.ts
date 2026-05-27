import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import viteCompression from "vite-plugin-compression";

const viteCompressionFilter = /\.(js|mjs|json|css|html|svg)$/i;

export default defineConfig({
    server: {
        port: 5000,
        fs: {
            // SvelteKit hardcodes path.resolve('src') in its allow list, but this
            // project keeps source under frontend/src/ — so lang/ and other dirs
            // outside lib/ and routes/ are blocked without this explicit entry.
            allow: [ "frontend/src" ],
        },
    },
    define: {
        FRONTEND_VERSION: JSON.stringify(process.env.npm_package_version),
    },
    plugins: [
        sveltekit(),
        viteCompression({
            algorithm: "gzip",
            filter: viteCompressionFilter,
        }),
        viteCompression({
            algorithm: "brotliCompress",
            filter: viteCompressionFilter,
        }),
    ],
});
