<template>
    <transition name="slide-fade" appear>
        <div>
            <div v-show="!expanded" class="log-header mb-3">
                <h1>{{ $t("log") }} - {{ serviceName }} ({{ stackName }})</h1>
                <div class="timestamp-toggle btn-group btn-group-sm" role="group">
                    <button
                        v-for="opt in timestampOptions"
                        :key="opt.value"
                        type="button"
                        class="btn"
                        :class="timestampMode === opt.value ? 'btn-primary' : 'btn-normal'"
                        :title="opt.label"
                        @click="setTimestampMode(opt.value)"
                    >
                        {{ opt.label }}
                    </button>
                    <button type="button" class="btn btn-normal" :title="$t('expand')" @click="expand">
                        <font-awesome-icon icon="expand" />
                    </button>
                </div>
            </div>

            <div class="log-terminal-wrap" :class="{ 'log-expanded': expanded }">
                <div v-if="expanded" class="log-expanded-header">
                    <span class="log-expanded-title">{{ $t("log") }} - {{ serviceName }}</span>
                    <div class="d-flex align-items-center gap-3">
                        <div class="btn-group btn-group-sm" role="group">
                            <button
                                v-for="opt in timestampOptions"
                                :key="opt.value"
                                type="button"
                                class="btn"
                                :class="timestampMode === opt.value ? 'btn-primary' : 'btn-normal'"
                                @click="setTimestampMode(opt.value)"
                            >
                                {{ opt.label }}
                            </button>
                        </div>
                        <button class="log-compress-button" :title="$t('Exit fullscreen')" @click="collapse">
                            <font-awesome-icon icon="compress" />
                        </button>
                    </div>
                </div>
                <Terminal
                    ref="terminal"
                    class="terminal"
                    :rows="20"
                    mode="displayOnly"
                    :name="terminalName"
                    :stack-name="stackName"
                    :service-name="serviceName"
                    :endpoint="endpoint"
                    :timestamp-mode="timestampMode"
                    :style="expanded ? '' : 'height: 410px;'"
                ></Terminal>
            </div>
        </div>
    </transition>
</template>

<script>
import { getContainerLogName } from "../../../common/util-common";
import Terminal from "../components/Terminal.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const LS_KEY = "logTimestampMode";

export default {
    components: {
        Terminal,
        FontAwesomeIcon,
    },
    data() {
        return {
            expanded: false,
            timestampMode: localStorage.getItem(LS_KEY) ?? "full",
            timestampOptions: [
                { value: "full",
                    label: "Full" },
                { value: "short",
                    label: "Short" },
                { value: "none",
                    label: "None" },
            ],
        };
    },
    computed: {
        stackName() {
            return this.$route.params.stackName;
        },
        endpoint() {
            return this.$route.params.endpoint || "";
        },
        serviceName() {
            return this.$route.params.serviceName;
        },
        terminalName() {
            return getContainerLogName(this.endpoint, this.stackName, this.serviceName, 0);
        },
    },
    mounted() {
        this.$root.emitAgent(this.endpoint, "joinContainerLog", this.stackName, this.serviceName, (res) => {});
    },
    methods: {
        setTimestampMode(mode) {
            this.timestampMode = mode;
            localStorage.setItem(LS_KEY, mode);
        },
        expand() {
            this.expanded = true;
            document.body.style.overflow = "hidden";
            requestAnimationFrame(() => requestAnimationFrame(() => {
                this.$refs.terminal?.updateTerminalSize();
            }));
        },
        collapse() {
            this.expanded = false;
            document.body.style.overflow = "";
            requestAnimationFrame(() => requestAnimationFrame(() => {
                this.$refs.terminal?.updateTerminalSize();
            }));
        },
    }
};
</script>

<style scoped lang="scss">
.log-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;

    h1 {
        margin: 0;
    }
}

.log-terminal-wrap {
    position: relative;
}

.log-terminal-wrap.log-expanded {
    position: fixed;
    inset: 0;
    z-index: 1050;
    padding: 1rem;
    background: var(--arbour-bg-body);
    display: flex;
    flex-direction: column;
}

.log-terminal-wrap.log-expanded :deep(.shadow-box) {
    overflow: hidden;
    flex: 1;
    min-height: 0;
}

.log-expanded-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    flex-shrink: 0;
}

.log-expanded-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--arbour-text);
}

.log-compress-button {
    all: unset;
    cursor: pointer;
    color: var(--arbour-text-muted);
    transition: color 0.15s;

    &:hover {
        color: var(--arbour-text);
    }

    svg {
        width: 20px;
        height: 20px;
    }
}

</style>
