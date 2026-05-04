<template>
    <BModal
        :model-value="modelValue"
        :title="$t('networkInspect')"
        size="lg"
        :ok-only="true"
        :ok-title="$t('close')"
        @show="fetchData"
        @hidden="emit('update:modelValue', false); reset()"
    >
        <div v-if="loading" class="loading-state">
            <span class="spinner-border spinner-border-sm me-2 text-primary"></span>
            <span class="text-muted">{{ $t('loading') }}</span>
        </div>

        <div v-else-if="error" class="error-state">
            <font-awesome-icon icon="exclamation-circle" class="me-2" />{{ error }}
        </div>

        <div v-else-if="data" class="network-panel">

            <!-- Header card -->
            <div class="net-header mb-4">
                <div class="net-header-icon">
                    <font-awesome-icon icon="link" />
                </div>
                <div class="flex-grow-1 min-w-0">
                    <div class="net-name">{{ data.name }}</div>
                    <div class="d-flex flex-wrap gap-2 mt-2">
                        <span class="net-badge net-badge-info">{{ data.driver }}</span>
                        <span class="net-badge net-badge-muted">{{ data.scope }}</span>
                        <span v-if="data.internal" class="net-badge net-badge-warning">
                            <font-awesome-icon icon="ban" class="me-1" style="font-size:9px;" />{{ $t('networkInternal') }}
                        </span>
                        <span v-if="data.ipv6" class="net-badge net-badge-primary">IPv6</span>
                    </div>
                </div>
            </div>

            <!-- Subnets -->
            <div v-if="data.subnets.length > 0" class="mb-4">
                <div class="section-label">{{ $t('networkSubnets') }}</div>
                <div class="data-rows">
                    <div class="data-row-header">
                        <span>{{ $t('networkSubnet') }}</span>
                        <span>{{ $t('networkGateway') }}</span>
                    </div>
                    <div v-for="(s, i) in data.subnets" :key="i" class="data-row">
                        <span class="mono-chip">{{ s.subnet || '—' }}</span>
                        <span class="mono-chip">{{ s.gateway || '—' }}</span>
                    </div>
                </div>
            </div>

            <!-- Containers -->
            <div>
                <div class="section-label">
                    {{ $t('networkContainers') }}
                    <span class="count-pip">{{ data.containers.length }}</span>
                </div>

                <div v-if="data.containers.length === 0" class="empty-state">
                    <font-awesome-icon icon="unlink" class="empty-icon" />
                    <span>{{ $t('networkNoContainers') }}</span>
                </div>

                <div v-else class="data-rows">
                    <div class="data-row-header container-row">
                        <span>{{ $t('name') }}</span>
                        <span>IPv4</span>
                        <span>IPv6</span>
                        <span>MAC</span>
                    </div>
                    <div v-for="(c, i) in data.containers" :key="i" class="data-row container-row">
                        <span class="container-name">{{ c.name }}</span>
                        <span class="mono-chip">{{ c.ipv4 || '—' }}</span>
                        <span class="mono-chip">{{ c.ipv6 || '—' }}</span>
                        <span class="mono-chip mono-chip-muted">{{ c.mac || '—' }}</span>
                    </div>
                </div>
            </div>
        </div>
    </BModal>
</template>

<script lang="ts" setup>
import { ref, getCurrentInstance } from "vue";
import { NetworkInspectData } from "../../../common/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const root = getCurrentInstance()?.proxy?.$root as any;

const props = defineProps<{
    endpoint: string;
    networkId: string;
    modelValue: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [boolean] }>();

const loading = ref(false);
const error = ref<string | null>(null);
const data = ref<NetworkInspectData | null>(null);

function fetchData() {
    loading.value = true;
    error.value = null;
    data.value = null;

    root.emitAgent(props.endpoint, "getNetworkInspect", props.networkId, (res: { ok: boolean; data: NetworkInspectData; msg?: string }) => {
        loading.value = false;
        if (res.ok) {
            data.value = res.data;
        } else {
            error.value = res.msg ?? "Failed to load network details";
        }
    });
}

function reset() {
    data.value = null;
    error.value = null;
}
</script>

<style scoped lang="scss">
.loading-state,
.error-state {
    padding: 24px;
    text-align: center;
    font-size: 14px;
}

.error-state {
    color: var(--arbour-danger);
}

// ── Header ────────────────────────────────────────────────────────────────────

.net-header {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px;
    background-color: var(--arbour-bg-deep);
    border: 1px solid var(--arbour-border);
    border-left: 3px solid var(--arbour-primary);
    border-radius: var(--arbour-radius);
}

.net-header-icon {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: color-mix(in srgb, var(--arbour-primary) 12%, transparent);
    color: var(--arbour-primary);
    border-radius: var(--arbour-radius-sm);
    font-size: 15px;
}

.net-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--arbour-text);
    line-height: 1.3;
    word-break: break-all;
}

// ── Badges ────────────────────────────────────────────────────────────────────

.net-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: var(--arbour-radius-pill);
    font-size: 11px;
    font-weight: 600;

    &.net-badge-info {
        color: var(--arbour-text-on-primary);
        background-color: var(--arbour-info);
    }

    &.net-badge-muted {
        color: var(--arbour-text-subtle);
        background-color: var(--arbour-bg-header-active);
    }

    &.net-badge-warning {
        color: var(--arbour-text-on-warning);
        background-color: var(--arbour-warning);
    }

    &.net-badge-primary {
        color: var(--arbour-text-on-primary);
        background-color: var(--arbour-primary);
    }
}

// ── Section label ─────────────────────────────────────────────────────────────

.section-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--arbour-text-muted);
    margin-bottom: 10px;

    &::before {
        content: '';
        display: block;
        width: 3px;
        height: 13px;
        background-color: var(--arbour-primary);
        border-radius: 2px;
        flex-shrink: 0;
    }
}

.count-pip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background-color: var(--arbour-bg-header-active);
    color: var(--arbour-text-subtle);
    border-radius: var(--arbour-radius-pill);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
}

// ── Data rows ─────────────────────────────────────────────────────────────────

.data-rows {
    border: 1px solid var(--arbour-border);
    border-radius: var(--arbour-radius);
    overflow: hidden;
}

.data-row-header {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 8px 16px;
    background-color: var(--arbour-bg-header);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--arbour-text-muted);

    &.container-row {
        grid-template-columns: 2fr 1.2fr 1.2fr 1.6fr;
    }
}

.data-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 13px 16px;
    align-items: center;
    gap: 8px;
    border-top: 1px solid var(--arbour-border);
    background-color: var(--arbour-bg-deep);
    transition: background-color 0.12s ease;

    &:hover {
        background-color: var(--arbour-bg-header);
    }

    &.container-row {
        grid-template-columns: 2fr 1.2fr 1.2fr 1.6fr;
    }
}

// ── Data chips ────────────────────────────────────────────────────────────────

.container-name {
    font-size: 13px;
    color: var(--arbour-text);
    font-weight: 500;
    word-break: break-all;
}

.mono-chip {
    display: inline-block;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 12px;
    color: var(--arbour-info);
    background-color: color-mix(in srgb, var(--arbour-info) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--arbour-info) 20%, transparent);
    border-radius: var(--arbour-radius-sm);
    padding: 2px 7px;

    &.mono-chip-muted {
        color: var(--arbour-text-muted);
        background-color: color-mix(in srgb, var(--arbour-text) 5%, transparent);
        border-color: var(--arbour-border);
    }
}

// ── Empty state ───────────────────────────────────────────────────────────────

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 28px;
    border: 1px dashed var(--arbour-border);
    border-radius: var(--arbour-radius);
    color: var(--arbour-text-muted);
    font-size: 13px;
    font-style: italic;
}

.empty-icon {
    font-size: 22px;
    opacity: 0.4;
}
</style>
