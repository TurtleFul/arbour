<script lang="ts">
import { t } from "svelte-i18n";
import type { StatsData } from "../../../../common/types";

const { stats } = $props<{ stats: StatsData }>();
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
    container-type: inline-size;
}

.stats {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.25rem;
    font-size: 0.8rem;
    color: var(--arbour-text-muted);
    container-type: inline-size;
}

.stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.stat-label {
    font-weight: bold;
}

@container (width < 420px) {
    .stats {
        flex-direction: column;
    }

    .stat {
        flex-direction: row;
    }

    .stat-label::after {
        content: ':';
    }
}
</style>
