<template>
    <div class="release-notes">
        <div v-if="!releaseNotes.length" class="text-muted">
            {{ $t("No release notes yet.") }}
        </div>

        <article v-for="note in releaseNotes" :key="note.version" class="release">
            <header class="release-header">
                <h2 class="release-version">
                    v{{ note.version }}
                    <span v-if="note.title" class="release-title">— {{ note.title }}</span>
                </h2>
                <div class="release-date">{{ note.date }}</div>
            </header>

            <p v-if="note.summary" class="release-summary">{{ note.summary }}</p>

            <section v-for="section in note.sections" :key="section.title" class="release-section">
                <h3 class="section-title">{{ section.title }}</h3>
                <ul class="section-items">
                    <li v-for="(item, idx) in section.items" :key="idx">{{ item }}</li>
                </ul>
            </section>
        </article>
    </div>
</template>

<script>
import { releaseNotes } from "../../release-notes";

export default {
    data() {
        return {
            releaseNotes,
        };
    },
};
</script>

<style scoped>
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

    li {
        margin-bottom: 0.2rem;
    }
}
</style>
