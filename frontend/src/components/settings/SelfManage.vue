<template>
    <div class="my-4">
        <!-- Not in Docker -->
        <div v-if="!inDocker" class="alert alert-secondary">
            Self-management is only available when Arbour runs inside Docker.
        </div>

        <!-- In Docker, not enabled -->
        <template v-else-if="!enabled">
            <p>
                Allow Arbour to manage its own stack. Once enabled, Arbour appears in your stack list
                and can update itself — pulling a new image and recreating its container.
            </p>

            <button class="btn btn-primary" :disabled="loading" @click="showEnableModal">
                Enable self-management
            </button>
        </template>

        <!-- In Docker, enabled -->
        <template v-else>
            <div class="alert alert-success mb-3">
                Self-management is <strong>enabled</strong>. Arbour appears in your stack list as
                <code>arbour</code>.
            </div>

            <button class="btn btn-danger" :disabled="loading" @click="showDisableModal">
                Disable self-management
            </button>
        </template>

        <!-- Enable confirm modal -->
        <div ref="enableModal" class="modal fade" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Enable self-management?</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>
                    <div class="modal-body">
                        <p>
                            Arbour will generate a <code>compose.yaml</code> based on its current running
                            configuration and place it in your stacks directory as <code>arbour/</code>.
                            It will then appear in your stack list like any other stack.
                        </p>
                        <p class="fw-semibold mb-1">Before you continue, understand the risks:</p>
                        <ul>
                            <li>
                                <strong>Updating Arbour</strong> — pulls a new image and recreates the container.
                                Expect ~10–30 seconds of downtime. Your browser will reconnect automatically.
                            </li>
                            <li>
                                <strong>Stopping Arbour</strong> — takes down this UI. Docker will restart it
                                automatically if <code>restart: unless-stopped</code> is set. Refresh when it's back.
                            </li>
                            <li>
                                <strong>Deploying a broken image</strong> — if an update fails or a bad image is
                                pulled, Arbour goes offline. Recovery requires SSH access and
                                <code>docker compose up -d</code> on the host.
                            </li>
                            <li>
                                <strong><code>docker compose down</code></strong> — permanently stops Arbour until
                                you manually restart it via CLI. There is no undo from the UI.
                            </li>
                        </ul>
                        <div class="alert alert-warning mb-0">
                            Do not stop or remove the Arbour stack unless you have CLI access to recover.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal" @click="doEnable">
                            I understand, enable self-management
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Disable confirm modal -->
        <div ref="disableModal" class="modal fade" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Disable self-management?</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>
                    <div class="modal-body">
                        <p>
                            This will remove the <code>arbour/</code> stack directory from your stacks
                            folder. Arbour will no longer appear in your stack list.
                        </p>
                        <div class="alert alert-warning mb-0">
                            Make sure Arbour is running before disabling — removing the stack directory
                            does not stop the container.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" data-bs-dismiss="modal" @click="doDisable">
                            Disable
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { Modal } from "bootstrap";

export default {
    data() {
        return {
            inDocker: false,
            enabled: false,
            loading: false,
            enableModal: null,
            disableModal: null,
        };
    },

    mounted() {
        this.enableModal = new Modal(this.$refs.enableModal);
        this.disableModal = new Modal(this.$refs.disableModal);
        this.loadStatus();
    },

    methods: {
        loadStatus() {
            this.$root.getSocket().emit("getSelfManageStatus", (res) => {
                if (res.ok) {
                    this.inDocker = res.data.inDocker;
                    this.enabled = res.data.enabled;
                }
            });
        },

        showEnableModal() {
            this.enableModal.show();
        },

        showDisableModal() {
            this.disableModal.show();
        },

        doEnable() {
            this.loading = true;
            this.$root.getSocket().emit("enableSelfManage", (res) => {
                this.loading = false;
                this.$root.toastRes(res);
                if (res.ok) {
                    this.enabled = true;
                }
            });
        },

        doDisable() {
            this.loading = true;
            this.$root.getSocket().emit("disableSelfManage", (res) => {
                this.loading = false;
                this.$root.toastRes(res);
                if (res.ok) {
                    this.enabled = false;
                }
            });
        },
    },
};
</script>
