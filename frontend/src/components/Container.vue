<template>
    <div class="shadow-box big-padding mb-3 container">
        <div class="row">
            <div class="col-12 col-xxl-7">
                <h4>{{ name }}</h4>
            </div>
            <div class="col-12 col-xxl-5 mb-2 d-flex justify-content-xxl-end align-items-start">
                <button
                    v-if="!isEditMode && service.recreateNecessary"
                    class="btn btn-sm btn-info me-2"
                    data-toggle="tooltip" :title="$t('tooltipServiceRecreate')"
                    :disabled="processing"
                    @click="recreateService"
                >
                    <font-awesome-icon icon="rocket" />
                </button>

                <button
                    v-if="!isEditMode && service.imageUpdateAvailable"
                    v-b-modal="updateModalId"
                    data-toggle="tooltip" :title="$t('tooltipServiceUpdate')"
                    class="btn btn-sm btn-info me-2"
                    :disabled="processing"
                >
                    <font-awesome-icon icon="arrow-up" />
                </button>

                <!-- Image update modal -->
                <BModal :id="updateModalId" :ref="updateModalId" :title="$t('imageUpdate', 1)">
                    <div>
                        <h5>{{ $t("image") }}</h5>
                        <span>{{ composeService.image }}</span>
                    </div>
                    <div v-if="changelogLink" class="mt-3">
                        <h5>{{ $t("changelog") }}</h5>
                        <a :href="changelogLink" target="_blank">{{ changelogLink }}</a>
                    </div>

                    <BForm class="mt-3">
                        <BFormCheckbox v-model="updateDialogData.pruneAfterUpdate" switch><span v-html="$t('pruneAfterUpdate')"></span></BFormCheckbox>
                        <div style="margin-left: 2.5rem;">
                            <BFormCheckbox v-model="updateDialogData.pruneAllAfterUpdate" :checked="updateDialogData.pruneAfterUpdate && updateDialogData.pruneAllAfterUpdate" :disabled="!updateDialogData.pruneAfterUpdate"><span v-html="$t('pruneAllAfterUpdate')"></span></BFormCheckbox>
                        </div>
                    </BForm>

                    <template #footer>
                        <button class="btn btn-normal" data-toggle="tooltip" :title="$t('tooltipServiceUpdateIgnore')" @click="skipCurrentUpdate">
                            <font-awesome-icon icon="ban" class="me-1" />{{ $t("ignoreUpdate") }}
                        </button>
                        <button class="btn btn-primary" data-toggle="tooltip" :title="$t('tooltipDoServiceUpdate')" @click="updateService">
                            <font-awesome-icon icon="cloud-arrow-down" class="me-1" />{{ $t("updateStack") }}
                        </button>
                    </template>
                </BModal>

                <button
                    v-if="!isEditMode"
                    v-b-modal="eventLogModalId"
                    class="btn btn-sm btn-normal me-2"
                    data-toggle="tooltip" :title="$t('serviceEventLog')"
                    @click="fetchEventLog"
                >
                    <font-awesome-icon icon="clipboard-list" />
                </button>

                <!-- Service event log modal -->
                <BModal :id="eventLogModalId" :ref="eventLogModalId" :title="$t('serviceEventLog')" size="lg">
                    <div v-if="eventLogLoading" class="text-center py-3">
                        <span class="spinner-border spinner-border-sm me-2"></span>{{ $t('loading') }}
                    </div>
                    <div v-else-if="eventLogEntries.length === 0" class="text-muted text-center py-3">
                        {{ $t('noEventsYet') }}
                    </div>
                    <div v-else>
                        <div class="d-flex gap-4 mb-3">
                            <div v-if="lastRestart">
                                <div class="text-muted small">{{ $t('lastRestart') }}</div>
                                <div>{{ formatRelativeTime(lastRestart.timestamp) }}</div>
                            </div>
                            <div v-if="lastUpdate">
                                <div class="text-muted small">{{ $t('lastUpdate') }}</div>
                                <div>{{ formatRelativeTime(lastUpdate.timestamp) }}</div>
                            </div>
                        </div>
                        <table class="table table-sm table-striped">
                            <thead>
                                <tr>
                                    <th>{{ $t('time') }}</th>
                                    <th>{{ $t('service') }}</th>
                                    <th>{{ $t('event') }}</th>
                                    <th>{{ $t('trigger') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="entry in eventLogEntries" :key="entry.id">
                                    <td class="text-nowrap" :title="formatAbsoluteTime(entry.timestamp)">{{ formatRelativeTime(entry.timestamp) }}</td>
                                    <td class="text-muted small">{{ entry.serviceName || $t('wholeStack') }}</td>
                                    <td>
                                        <span class="badge" :class="eventTypeBadge(entry.eventType)">{{ entry.eventType }}</span>
                                    </td>
                                    <td>
                                        <span class="badge" :class="triggerBadge(entry.trigger)">{{ entry.trigger }}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <template #footer>
                        <button class="btn btn-normal" @click="$refs[eventLogModalId].hide()">{{ $t('close') }}</button>
                    </template>
                </BModal>

                <div v-if="!isEditMode" class="btn-group me-2" role="group">
                    <router-link v-if="started" class="btn btn-sm btn-normal me-1" data-toggle="tooltip" :title="$t('tooltipServiceLog')" :to="logRouteLink" :disabled="processing"><font-awesome-icon icon="file-text" /></router-link>
                    <router-link v-if="started" class="btn btn-sm btn-normal me-1" data-toggle="tooltip" :title="$t('tooltipServiceInspect')" :to="inspectRouteLink" :disabled="processing"><font-awesome-icon icon="info-circle" /></router-link>
                    <router-link v-if="started" class="btn btn-sm btn-normal me-1" data-toggle="tooltip" :title="$t('tooltipServiceTerminal')" :to="terminalRouteLink" :disabled="processing"><font-awesome-icon icon="terminal" /></router-link>
                </div>

                <div v-if="!isEditMode" class="btn-group" role="group">
                    <button v-if="!started && !inactive" type="button" class="btn btn-sm btn-success" data-toggle="tooltip" :title="$t('tooltipServiceStart')" :disabled="processing" @click="startService"><font-awesome-icon icon="play" /></button>
                    <button v-if="started" type="button" class="btn btn-sm btn-danger me-1" data-toggle="tooltip" :title="$t('tooltipServiceStop')" :disabled="processing" @click="stopService"><font-awesome-icon icon="stop" /></button>
                    <button v-if="started" type="button" class="btn btn-sm btn-warning" data-toggle="tooltip" :title="$t('tooltipServiceRestart')" :disabled="processing" @click="restartService"><font-awesome-icon icon="rotate" /></button>
                </div>
            </div>
        </div>
        <div v-if="!isEditMode" class="row">
            <div v-if="service.recreateNecessary" class="notification mb-2">{{ $t("recreateNecessary") }}</div>
            <div class="d-flex flex-wrap justify-content-between gap-3 mb-2">
                <div class="image">
                    <span class="me-1">{{ composeService.imageName }}:</span><span class="tag">{{ composeService.imageTag }}</span>
                </div>
                <div v-if="started" class="status">
                    {{ service.status }}
                </div>
            </div>
        </div>

        <div v-if="!isEditMode" class="row">
            <div class="col">
                <span class="badge me-1" :class="bgStyle">{{ status }}</span>

                <a v-for="port in composeService.get('ports', [], true)" :key="port" :href="parsePort(port).url" target="_blank">
                    <span v-if="started" class="badge me-1 bg-secondary">{{ parsePort(port).display }}</span>
                </a>
            </div>
        </div>
        <div v-if="!isEditMode && stats" class="mt-2">
            <div class="d-flex align-items-start gap-3">
                <span class="stats-select" @click="expandedStats = !expandedStats">
                    <font-awesome-icon :icon="expandedStats ? 'chevron-circle-down' : 'chevron-circle-right'" />
                </span>
                <template v-if="!expandedStats">
                    <div class="stats">
                        {{ $t('CPU') }}: {{ stats.cpuPerc }}
                    </div>
                    <div class="stats">
                        {{ $t('memoryAbbreviated') }}: {{ stats.memUsage }}
                    </div>
                </template>
            </div>
            <transition name="slide-fade" appear>
                <div v-if="expandedStats" class="d-flex flex-column gap-3 mt-2">
                    <DockerStats :stats="stats" />
                </div>
            </transition>
        </div>

        <div v-if="isEditMode" class="mt-2">
            <button class="btn btn-normal me-2" @click="showConfig = !showConfig">
                <font-awesome-icon icon="edit" />
                {{ $t("Edit") }}
            </button>
            <button v-if="false" class="btn btn-normal me-2">Rename</button>
            <button class="btn btn-danger me-2" @click="remove">
                <font-awesome-icon icon="trash" />
                {{ $t("deleteContainer") }}
            </button>
        </div>

        <transition name="slide-fade" appear>
            <div v-if="isEditMode && showConfig" class="config mt-3">
                <!-- Image -->
                <div class="mb-4">
                    <h5>{{ $t("dockerImage") }}</h5>
                    <div class="input-group mt-3 mb-3">
                        <input
                            v-model="composeService.image"
                            class="form-control"
                            list="image-datalist"
                        />
                    </div>

                    <!-- TODO: Search online: https://hub.docker.com/api/content/v1/products/search?q=louislam%2Fuptime&source=community&page=1&page_size=4 -->
                    <datalist id="image-datalist">
                        <option value="louislam/uptime-kuma:1" />
                    </datalist>
                    <div class="form-text"></div>
                </div>

                <!-- Ports -->
                <div class="mb-4">
                    <h5>{{ $t("port", 2) }}</h5>
                    <ArrayInput :composeArray="composeService.ports" :display-name="$t('port')" placeholder="HOST:CONTAINER" />
                </div>

                <!-- Volumes -->
                <div class="mb-4">
                    <h5>{{ $t("volume", 2) }}</h5>
                    <ArrayInput :composeArray="composeService.volumes" :display-name="$t('volume')" placeholder="HOST:CONTAINER" />
                </div>

                <!-- Restart Policy -->
                <div class="mb-4">
                    <h5>{{ $t("restartPolicy") }}</h5>
                    <select v-model="composeService.restart" class="form-select mt-3">
                        <option value="always">{{ $t("restartPolicyAlways") }}</option>
                        <option value="unless-stopped">{{ $t("restartPolicyUnlessStopped") }}</option>
                        <option value="on-failure">{{ $t("restartPolicyOnFailure") }}</option>
                        <option value="no">{{ $t("restartPolicyNo") }}</option>
                    </select>
                </div>

                <!-- Environment Variables -->
                <div class="mb-4">
                    <h5>{{ $t("environmentVariable", 2) }}</h5>
                    <!-- TODO environmap kann auch Map sein -->
                    <ArrayInput :composeArray="composeService.environment" :display-name="$t('environmentVariable')" placeholder="KEY=VALUE" />
                </div>

                <!-- Container Name -->
                <div v-if="false" class="mb-4">
                    <h5>{{ $t("containerName") }}</h5>
                    <div class="input-group mb-3">
                        <input
                            v-model="composeService.containerName"
                            class="form-control"
                        />
                    </div>
                    <div class="form-text"></div>
                </div>

                <!-- Network -->
                <div class="mb-4">
                    <h5>{{ $t("network", 2) }}</h5>

                    <div v-if="composeDocument.networks.isEmpty() && !composeService.networks.isEmpty()" class="text-warning mb-3">
                        {{ $t("NoNetworksAvailable") }}
                    </div>

                    <ArraySelect :composeArray="composeService.networks" :display-name="$t('network')" placeholder="Network Name" :options="composeDocument.networks.names" />
                </div>

                <!-- Depends on -->
                <div class="mb-4">
                    <h5>{{ $t("dependsOn") }}</h5>
                    <ArrayInput :composeArray="composeService.dependsOn" :display-name="$t('dependsOn')" :placeholder="$t(`containerName`)" />
                </div>

                <!-- Arbour specific settings -->
                <div class="mb-4">
                    <h5>Arbour</h5>
                    <div class="form-check form-switch ms-2 mt-3">
                        <input
                            id="ignoreStatus"
                            class="form-check-input"
                            type="checkbox"
                            :checked="ignoreStatus"
                            @input="updateIgnoreStatus((($event.target) as any)?.checked)"
                        />
                        <label class="form-check-label" for="ignoreStatus">
                            {{ $t("ignoreStatus") }}
                        </label>
                    </div>
                    <div class="form-check form-switch ms-2 mt-3">
                        <input
                            id="checkImageUpdates"
                            class="form-check-input"
                            type="checkbox"
                            :checked="checkImageUpdates"
                            @input="updateCheckImageUpdates((($event.target) as any)?.checked)"
                        />
                        <label class="form-check-label" for="checkImageUpdates">
                            {{ $t("checkImageUpdates") }}
                        </label>
                    </div>
                    <div class="input-group mt-3">
                        <input
                            :value="changelogLink"
                            class="form-control"
                            @input="updateChangelogLink(($event.target as any)?.value)"
                        />
                    </div>
                    <div class="form-text ms-3">{{ $t("changelogLink") }}</div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { parseDockerPort } from "../../../common/util-common";
import { ServiceData, StatsData, StackData, ServiceEventEntry } from "../../../common/types";
import { ComposeDocument, ComposeService } from "../../../common/compose-document";
import { LABEL_STATUS_IGNORE, LABEL_IMAGEUPDATES_CHECK, LABEL_IMAGEUPDATES_IGNORE, LABEL_IMAGEUPDATES_CHANGELOG } from "../../../common/compose-labels";

export default defineComponent({
    components: {
        FontAwesomeIcon,
    },

    props: {
        name: {
            type: String,
            required: true,
        },
        isEditMode: {
            type: Boolean,
            default: false,
        },
        service: {
            type: Object as PropType<ServiceData>,
            default: {} as ServiceData,
        },
        stats: {
            type: Object as PropType<StatsData>,
            default: undefined,
        }
    },

    emits: [
    ],

    data() {
        return {
            showConfig: false,
            expandedStats: false,
            updateDialogData: {
                pruneAfterUpdate: false,
                pruneAllAfterUpdate: false
            },
            eventLogEntries: [] as ServiceEventEntry[],
            eventLogLoading: false,
        };
    },

    computed: {

        status(): string {
            const healthStatus = this.service.health;
            return !!healthStatus ? healthStatus : (this.inactive ? "inactive" : this.service.state);
        },

        bgStyle(): string {
            if (this.status === "running" || this.status === "healthy") {
                return "bg-primary";
            } else if (this.status === "unhealthy") {
                return "bg-danger";
            } else if (this.status === "inactive") {
                return "bg-dark";
            } else {
                return "bg-secondary";
            }
        },

        started(): boolean {
            return this.status === "starting" || this.status === "running" || this.status === "healthy" || this.status === "unhealthy" || this.status === "stopping";
        },

        inactive(): boolean {
            return Object.keys(this.service).length === 0;
        },

        logRouteLink() {
            if (this.endpoint) {
                return {
                    name: "containerLogEndpoint",
                    params: {
                        endpoint: this.endpoint,
                        stackName: this.stackName,
                        serviceName: this.name,
                    },
                };
            } else {
                return {
                    name: "containerLog",
                    params: {
                        stackName: this.stackName,
                        serviceName: this.name,
                    },
                };
            }
        },

        inspectRouteLink() {
            if (this.endpoint) {
                return {
                    name: "containerInspectEndpoint",
                    params: {
                        endpoint: this.endpoint,
                        containerName: this.service.containerName,
                    },
                };
            } else {
                return {
                    name: "containerInspect",
                    params: {
                        containerName: this.service.containerName,
                    },
                };
            }
        },

        terminalRouteLink() {
            if (this.endpoint) {
                return {
                    name: "containerTerminalEndpoint",
                    params: {
                        endpoint: this.endpoint,
                        stackName: this.stackName,
                        serviceName: this.name,
                        type: "bash",
                    },
                };
            } else {
                return {
                    name: "containerTerminal",
                    params: {
                        stackName: this.stackName,
                        serviceName: this.name,
                        type: "bash",
                    },
                };
            }
        },

        endpoint(): string {
            return this.$parent.$parent.endpoint;
        },

        stack(): StackData {
            return this.$parent.$parent.stack;
        },

        stackName(): string {
            return this.stack.name;
        },

        composeDocument(): ComposeDocument {
            return this.$parent.$parent.composeDocument;
        },

        composeService(this: { composeDocument: ComposeDocument, name: string }): ComposeService {
            return this.composeDocument.services.getService(this.name);
        },

        updateModalId(): string {
            return "image-update-modal-" + this.name;
        },

        eventLogModalId(): string {
            return "event-log-modal-" + this.name;
        },

        lastRestart(): ServiceEventEntry | null {
            return this.eventLogEntries.find(e => e.eventType === "restart" || e.eventType === "start") ?? null;
        },

        lastUpdate(): ServiceEventEntry | null {
            return this.eventLogEntries.find(e => e.eventType === "update") ?? null;
        },

        ignoreStatus(this: { composeService: ComposeService }): boolean {
            return this.composeService.labels.isTrue(LABEL_STATUS_IGNORE);
        },

        checkImageUpdates(this: {composeService: ComposeService}): boolean {
            return !this.composeService.labels.isFalse(LABEL_IMAGEUPDATES_CHECK);
        },

        changelogLink(this: {composeService: ComposeService}): string {
            return this.composeService.labels.get(LABEL_IMAGEUPDATES_CHANGELOG, "");
        },

        processing(): boolean {
            return this.$parent.$parent.processing;
        }
    },
    mounted() {
    },
    methods: {
        resetUpdateDialog() {
            this.updateDialogData = {
                pruneAfterUpdate: false,
                pruneAllAfterUpdate: false
            };
        },

        fetchEventLog() {
            this.eventLogLoading = true;
            this.$root.emitAgent(this.endpoint, "getServiceEventLog", this.stackName, this.name, (res) => {
                this.eventLogLoading = false;
                if (res.ok) {
                    this.eventLogEntries = res.events;
                }
            });
        },

        formatRelativeTime(timestamp: number): string {
            const diff = Date.now() - timestamp;
            const seconds = Math.floor(diff / 1000);
            if (seconds < 60) return `${seconds}s ago`;
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m ago`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;
            const days = Math.floor(hours / 24);
            return `${days}d ago`;
        },

        formatAbsoluteTime(timestamp: number): string {
            return new Date(timestamp).toLocaleString();
        },

        eventTypeBadge(eventType: string): string {
            const map: Record<string, string> = {
                update: "bg-primary",
                deploy: "bg-success",
                restart: "bg-warning text-dark",
                recreate: "bg-info text-dark",
                start: "bg-success",
                stop: "bg-secondary",
                down: "bg-dark",
            };
            return map[eventType] ?? "bg-secondary";
        },

        triggerBadge(trigger: string): string {
            const map: Record<string, string> = {
                manual: "bg-secondary",
                scheduled: "bg-info text-dark",
                immediate: "bg-warning text-dark",
            };
            return map[trigger] ?? "bg-secondary";
        },

        startComposeAction() {
            this.$parent.$parent.startComposeAction();
        },

        stopComposeAction() {
            this.$parent.$parent.stopComposeAction();
        },

        parsePort(port: string) {
            if (this.stack.endpoint) {
                return parseDockerPort(port, this.stack.primaryHostname);
            } else {
                let hostname = this.$root.info.primaryHostname || location.hostname;
                return parseDockerPort(port, hostname);
            }
        },
        remove() {
            this.composeDocument.services.delete(this.name);
        },
        stopService() {
            this.startComposeAction();
            this.$root.emitAgent(this.endpoint, "stopService", this.stack.name, this.name, (res) => {
                this.stopComposeAction();
                this.$root.toastRes(res);
            });
        },
        startService() {
            this.startComposeAction();
            this.$root.emitAgent(this.endpoint, "startService", this.stack.name, this.name, (res) => {
                this.stopComposeAction();
                this.$root.toastRes(res);
            });
        },
        restartService() {
            this.startComposeAction();
            this.$root.emitAgent(this.endpoint, "restartService", this.stack.name, this.name, (res) => {
                this.stopComposeAction();
                this.$root.toastRes(res);
            });
        },
        recreateService() {
            this.startComposeAction();
            this.$root.emitAgent(this.endpoint, "recreateService", this.stack.name, this.name, (res) => {
                this.stopComposeAction();
                this.$root.toastRes(res);
            });
        },
        updateService() {
            this.$refs[this.updateModalId].hide();

            this.startComposeAction();
            this.$root.emitAgent(this.endpoint, "updateService", this.stack.name, this.name, this.updateDialogData.pruneAfterUpdate, this.updateDialogData.pruneAllAfterUpdate, (res) => {
                this.stopComposeAction();
                this.$root.toastRes(res);
            });
        },
        skipCurrentUpdate() {
            this.$refs[this.updateModalId].hide();

            this.composeService.labels.set(LABEL_IMAGEUPDATES_IGNORE, this.service.remoteImageDigest);

            this.$nextTick(() => {
                // Wait for the adaptation of the Yaml
                this.$parent.$parent.saveStack();
            });
        },
        updateIgnoreStatus(checked: boolean) {
            const labels = this.composeService.labels;
            if (checked) {
                labels.set(LABEL_STATUS_IGNORE, true);
            } else {
                labels.delete(LABEL_STATUS_IGNORE);
                labels.removeIfEmpty();
            }
        },
        updateChangelogLink(link: string) {
            const labels = this.composeService.labels;
            if (link) {
                labels.set(LABEL_IMAGEUPDATES_CHANGELOG, link);
            } else {
                labels.delete(LABEL_IMAGEUPDATES_CHANGELOG);
                labels.removeIfEmpty();
            }
        },
        updateCheckImageUpdates(checked: boolean) {
            const labels = this.composeService.labels;
            if (checked) {
                labels.delete(LABEL_IMAGEUPDATES_CHECK);
                labels.removeIfEmpty();
            } else {
                labels.set(LABEL_IMAGEUPDATES_CHECK, false);
            }
        }
    }
});
</script>

<style scoped lang="scss">
@import "../styles/vars";

.container {
    max-width: 100%;

    .image {
        font-size: 0.8rem;
        color: #6c757d;
        .tag {
            color: #33383b;
        }
    }

    .status {
        font-size: 0.8rem;
        color: #6c757d;
    }

    .notification {
        font-size: 1rem;
        color: $danger;
    }

    .function {
        align-content: center;
        display: flex;
        height: 100%;
        width: 100%;
        align-items: center;
        justify-content: end;
    }

    .stats-select {
        cursor: pointer;
        font-size: 1rem;
        color: #6c757d;
    }

    .stats {
        font-size: 0.8rem;
        color: #6c757d;
    }
}
</style>
