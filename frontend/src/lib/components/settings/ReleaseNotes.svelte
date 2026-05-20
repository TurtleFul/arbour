<script lang="ts">
import { t } from "svelte-i18n";
import { releaseNotes } from "../../../release-notes";
</script>

<div class="release-notes">
    {#if !releaseNotes.length}
        <div class="text-muted">{$t("No release notes yet.")}</div>
    {/if}

    {#each releaseNotes as note (note.version)}
        <article class="release">
            <header class="release-header">
                <h2 class="release-version">
                    v{note.version}
                    {#if note.title}
                        <span class="release-title">— {note.title}</span>
                    {/if}
                </h2>
                <div class="release-date">{note.date}</div>
            </header>

            {#if note.summary}
                <p class="release-summary">{note.summary}</p>
            {/if}

            {#each note.sections as section (section.title)}
                <section class="release-section">
                    <h3 class="section-title">{section.title}</h3>
                    <ul class="section-items">
                        {#each section.items as item, idx (idx)}
                            <li>{item}</li>
                        {/each}
                    </ul>
                </section>
            {/each}
        </article>
    {/each}
</div>

<style>
.release-notes {
    padding: 0.5rem 0 2rem;
}

.release + .release {
    margin-top: 2.5rem;
    padding-top: 2rem;
    border-top: 1px solid var(--arbour-border);
}

.release-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
}

.release-version {
    font-size: 1.6rem;
    font-weight: 600;
    margin: 0;
}

.release-title {
    font-weight: 400;
    font-size: 1.1rem;
    color: var(--arbour-text-subtle);
}

.release-date {
    font-size: 0.9rem;
    color: var(--arbour-text-muted);
}

.release-summary {
    margin: 0 0 1.25rem;
    color: var(--arbour-text);
}

.release-section {
    margin-top: 1.25rem;
}

.section-title {
    font-size: 1.05rem;
    font-weight: 600;
    margin: 0 0 0.35rem;
}

.section-items {
    margin: 0;
    padding-left: 1.25rem;
    line-height: 1.55;
}

.section-items li {
    margin-bottom: 0.2rem;
}

.text-muted {
    color: var(--arbour-text-muted);
}
</style>
