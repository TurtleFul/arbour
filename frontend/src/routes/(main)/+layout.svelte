<script lang="ts">
import type { Snippet } from "svelte";
import { t } from "svelte-i18n";
import { socketStore } from "$lib/stores/socket.svelte";
import StackList from "$lib/components/StackList.svelte";
import Icon from "$lib/components/Icon.svelte";

const { children } = $props<{ children: Snippet }>();
</script>

<div class="container-fluid">
    <div class="row">
        {#if !socketStore.isMobile}
            <div class="col-12 col-md-4 col-xl-3">
                <div>
                    <a href="/compose" class="btn btn-primary mb-3">
                        <Icon name="plus" /> {$t("compose")}
                    </a>
                </div>
                <StackList embedded={true} />
            </div>
        {/if}

        <div class="col-12 col-md-8 col-xl-9 mb-3">
            {@render children()}
        </div>
    </div>
</div>

<style>
.container-fluid { width: 98%; }
</style>
