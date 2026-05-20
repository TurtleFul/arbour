import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
    preprocess: vitePreprocess({
        scss: {
            silenceDeprecations: [
                'import',
                'global-builtin',
                'color-functions',
                'if-function',
            ],
        },
    }),
    kit: {
        adapter: adapter({
            pages: 'frontend-dist',
            assets: 'frontend-dist',
            fallback: 'index.html',
        }),
        files: {
            appTemplate: 'frontend/src/app.html',
            assets: 'frontend/public',
            lib: 'frontend/src/lib',
            routes: 'frontend/src/routes',
        },
    },
};

export default config;
