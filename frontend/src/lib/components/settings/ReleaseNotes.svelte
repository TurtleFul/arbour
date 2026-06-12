<script lang="ts">
import { marked } from "marked";
import changelog from "../../../../../CHANGELOG.md?raw";

const htmlContent = marked.parse(changelog) as string;
</script>

<div class="release-notes markdown-body">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html htmlContent}
</div>

<style>
.release-notes {
    padding: 0.5rem 0 2rem;
    color: var(--arbour-text);
}

.release-notes :global(h1) {
    display: none; /* Hide the main 'Changelog' title since the page already has a header */
}

.release-notes :global(h1 + p) {
    display: none; /* Hide the 'All notable changes...' intro */
}

.release-notes :global(h2) {
    font-size: 1.6rem;
    font-weight: 600;
    margin: 2.5rem 0 0.5rem;
    padding-top: 2rem;
    border-top: 1px solid var(--arbour-border);
}

.release-notes :global(h2:first-of-type) {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
}

.release-notes :global(h3) {
    font-size: 1.05rem;
    font-weight: 600;
    margin: 1.25rem 0 0.35rem;
}

.release-notes :global(ul) {
    margin: 0;
    padding-left: 1.25rem;
    line-height: 1.55;
}

.release-notes :global(li) {
    margin-bottom: 0.2rem;
}

.release-notes :global(a) {
    color: var(--arbour-primary);
    text-decoration: none;
}
.release-notes :global(a:hover) {
    text-decoration: underline;
}

.release-notes :global(code) {
    background: var(--arbour-bg-deep);
    padding: 0.1em 0.3em;
    border-radius: var(--arbour-radius-sm);
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9em;
}
</style>
