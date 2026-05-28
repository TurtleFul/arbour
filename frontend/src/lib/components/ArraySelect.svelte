<script lang="ts">
import { t } from "svelte-i18n";
import Icon from "./Icon.svelte";
import type { ComposeArray } from "../../../../common/compose-document";

const { composeArray, displayName, options } : {
    composeArray: ComposeArray;
    displayName: string;
    options: string[];
} = $props();

const array = $derived(composeArray.composeData.data as string[]);
</script>

<div>
    {#if composeArray.isValid() && !composeArray.containsObjects()}
        <ul class="list-group">
            {#each array as value, index (index)}
                <li class="list-group-item">
                    <select bind:value={array[index]} class="domain-input">
                        <option value="">{$t("Select a network...")}</option>
                        {#each options as opt (opt)}
                            <option value={opt}>{opt}</option>
                        {/each}
                    </select>
                    <button type="button" class="remove-btn" onclick={() => composeArray.delete(index)}>
                        <Icon name="times" class="text-danger" />
                    </button>
                </li>
            {/each}
        </ul>
        <button class="btn btn-sm mt-3" type="button" onclick={() => composeArray.add("")}>
            {$t("addListItem", { values: { 0: displayName } })}
        </button>
    {:else}
        <span>{$t("LongSyntaxNotSupported")}</span>
    {/if}
</div>

<style>
.list-group {
    list-style: none;
    margin: 0;
    padding: 0;
    background-color: var(--arbour-bg-deep);
    border-radius: var(--arbour-radius);
    overflow: hidden;
}

.list-group-item {
    display: flex;
    align-items: center;
    padding: 10px 0 10px 10px;
    border-bottom: 1px solid var(--arbour-border);
}

.list-group-item:last-child {
    border-bottom: none;
}

.domain-input {
    flex-grow: 1;
    background-color: var(--arbour-bg-deep);
    border: none;
    color: var(--arbour-text);
    outline: none;
    font-size: inherit;
}

.remove-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 0.75rem;
    line-height: 1;
}

.mt-3 { margin-top: 1rem; }
</style>
