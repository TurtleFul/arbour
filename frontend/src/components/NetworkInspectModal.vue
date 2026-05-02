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
        <div v-if="loading" class="text-center py-4">
            <span class="spinner-border spinner-border-sm me-2"></span>{{ $t('loading') }}
        </div>

        <div v-else-if="error" class="text-danger py-3">{{ error }}</div>

        <div v-else-if="data">
            <!-- Header: name + badges -->
            <div class="d-flex align-items-center flex-wrap gap-2 mb-3">
                <h5 class="mb-0 me-2">{{ data.name }}</h5>
                <span class="badge bg-secondary">{{ data.driver }}</span>
                <span class="badge bg-secondary">{{ data.scope }}</span>
                <span v-if="data.internal" class="badge bg-warning text-dark">{{ $t('networkInternal') }}</span>
                <span v-if="data.ipv6" class="badge bg-info text-dark">IPv6</span>
            </div>

            <!-- IPAM / Subnets -->
            <div v-if="data.subnets.length > 0" class="mb-3">
                <div class="text-muted small mb-1">{{ $t('networkSubnets') }}</div>
                <table class="table table-sm mb-0">
                    <thead>
                        <tr>
                            <th>{{ $t('networkSubnet') }}</th>
                            <th>{{ $t('networkGateway') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(s, i) in data.subnets" :key="i">
                            <td class="font-monospace">{{ s.subnet || '—' }}</td>
                            <td class="font-monospace">{{ s.gateway || '—' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Connected containers -->
            <div>
                <div class="text-muted small mb-1">
                    {{ $t('networkContainers') }}
                    <span class="badge bg-secondary ms-1">{{ data.containers.length }}</span>
                </div>
                <div v-if="data.containers.length === 0" class="text-muted fst-italic small py-2">
                    {{ $t('networkNoContainers') }}
                </div>
                <table v-else class="table table-sm mb-0">
                    <thead>
                        <tr>
                            <th>{{ $t('name') }}</th>
                            <th>IPv4</th>
                            <th>IPv6</th>
                            <th>MAC</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(c, i) in data.containers" :key="i">
                            <td>{{ c.name }}</td>
                            <td class="font-monospace">{{ c.ipv4 || '—' }}</td>
                            <td class="font-monospace">{{ c.ipv6 || '—' }}</td>
                            <td class="font-monospace text-muted small">{{ c.mac || '—' }}</td>
                        </tr>
                    </tbody>
                </table>
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
