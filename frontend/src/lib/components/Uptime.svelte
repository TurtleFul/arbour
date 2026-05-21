<script lang="ts">
import { t } from "svelte-i18n";
import { StackStatusInfo } from "../../../../common/util-common";
import type { SimpleStackData } from "../../../../common/types";

const { stack, fixedWidth = false } = $props<{
    stack: SimpleStackData | null;
    fixedWidth?: boolean;
    pill?: boolean;
}>();

const info = $derived(StackStatusInfo.get(stack?.status));
const className = $derived(
    `badge rounded-pill bg-${info.badgeColor}` + (fixedWidth ? " fixed-width" : "")
);
</script>

<span class={className}>{$t(info.label)}</span>

<style>
.badge {
    min-width: 62px;
    padding: 0.35em 0.65em;
    font-size: 0.75em;
    font-weight: 700;
    line-height: 1;
}

.fixed-width {
    width: 62px;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
