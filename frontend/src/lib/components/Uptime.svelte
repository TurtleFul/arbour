<script lang="ts">
import { t } from "svelte-i18n";
import { StackStatusInfo } from "../../../../common/util-common";
import type { SimpleStackData } from "../../../../common/types";

const { stack, fixedWidth = false, pill = false } = $props<{
    stack: SimpleStackData | null;
    fixedWidth?: boolean;
    pill?: boolean;
}>();

const statusColorMap: Record<string, string> = {
    primary: "var(--arbour-primary)",
    danger: "var(--arbour-danger)",
    info: "var(--arbour-info)",
    warning: "var(--arbour-warning)",
    secondary: "var(--arbour-secondary)",
    dark: "var(--arbour-bg-deep)",
};

const info = $derived(StackStatusInfo.get(stack?.status));
const color = $derived(statusColorMap[info.badgeColor] ?? "var(--arbour-secondary)");
</script>

<span
    class="badge"
    class:fixed-width={fixedWidth}
    style="background-color: {color}; color: var(--arbour-text-on-primary)"
>
    {$t(info.label)}
</span>

<style>
.badge {
    display: inline-block;
    padding: 0.3em 0.65em;
    font-size: 0.85em;
    font-weight: 600;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
    vertical-align: baseline;
    border-radius: var(--arbour-radius-pill);
    min-width: 62px;
}

.fixed-width {
    width: 62px;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
