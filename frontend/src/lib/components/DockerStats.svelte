<script lang="ts">
import { t } from "svelte-i18n";
import type { StatsData } from "../../../../common/types";

const { stats } : { stats: StatsData } = $props();
</script>

<div class="stats-container">
    <div class="stats">
        <div class="stat">
            <div class="stat-label">{$t("cpu")}</div>
            <div>{stats.cpuPerc}</div>
        </div>
        <div class="stat">
            <div class="stat-label">{$t("memory")}</div>
            <div>{stats.memUsage} ({stats.memPerc})</div>
        </div>
        <div class="stat">
            <div class="stat-label">{$t("networkIO")}</div>
            <div>{stats.netIO}</div>
        </div>
        <div class="stat">
            <div class="stat-label">{$t("blockIO")}</div>
            <div>{stats.blockIO}</div>
        </div>
    </div>
</div>

<style>
.stats-container {
    width: 100%;
    container-type: inline-size;
}

.stats {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: var(--arbour-text-subtle);
}

.stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.stat-label {
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--arbour-text-muted);
}

@container (width < 450px) {
    .stats {
        flex-direction: column;
        gap: 0.5rem;
    }

    .stat {
        flex-direction: row;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
        border-bottom: 1px solid var(--arbour-border);
        padding-bottom: 0.25rem;
    }

    .stat:last-child {
        border-bottom: none;
        padding-bottom: 0;
    }
}
</style>
