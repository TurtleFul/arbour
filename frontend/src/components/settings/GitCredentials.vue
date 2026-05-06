<template>
    <div class="my-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="settings-subheading mb-0">{{ $t("gitCredentials") }}</h5>
            <button class="btn btn-primary btn-sm" @click="openAdd">
                <font-awesome-icon icon="plus" />
                {{ $t("addCredential") }}
            </button>
        </div>

        <p v-if="credentials.length === 0" class="text-muted">
            {{ $t("noCredential") }}
        </p>

        <div v-for="cred in credentials" :key="cred.id" class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
                <strong>{{ cred.name }}</strong>
                <span v-if="cred.username" class="text-muted ms-2">{{ cred.username }}</span>
            </div>
            <div class="btn-group btn-group-sm">
                <button class="btn btn-normal" @click="openEdit(cred)">
                    <font-awesome-icon icon="edit" />
                </button>
                <button class="btn btn-danger" @click="confirmDelete(cred)">
                    <font-awesome-icon icon="trash" />
                </button>
            </div>
        </div>

        <BModal v-model="showModal" :title="editId ? $t('editCredential') : $t('addCredential')" no-footer>
            <form @submit.prevent="save">
                <div class="mb-3">
                    <label class="form-label">{{ $t("credentialName") }}</label>
                    <input v-model="form.name" type="text" class="form-control" required />
                </div>
                <div class="mb-3">
                    <label class="form-label">{{ $t("Username") }} ({{ $t("optional") }})</label>
                    <input v-model="form.username" type="text" class="form-control" autocomplete="off" />
                </div>
                <div class="mb-3">
                    <label class="form-label">{{ $t("gitPersonalAccessToken") }}</label>
                    <input
                        v-model="form.token"
                        type="password"
                        class="form-control"
                        :placeholder="editId ? $t('tokenPlaceholderEdit') : ''"
                        :required="!editId"
                        autocomplete="new-password"
                    />
                </div>
                <div class="d-flex justify-content-end gap-2">
                    <button type="button" class="btn btn-normal" @click="showModal = false">{{ $t("Cancel") }}</button>
                    <button type="submit" class="btn btn-primary">{{ $t("Save") }}</button>
                </div>
            </form>
        </BModal>
    </div>
</template>

<script>
export default {
    data() {
        return {
            credentials: [],
            showModal: false,
            editId: null,
            form: {
                name: "",
                username: "",
                token: "",
            },
        };
    },

    mounted() {
        this.load();
    },

    methods: {
        load() {
            this.$root.getSocket().emit("getGitCredentials", (res) => {
                if (res.ok) {
                    this.credentials = res.credentials;
                }
            });
        },

        openAdd() {
            this.editId = null;
            this.form = { name: "",
                username: "",
                token: "" };
            this.showModal = true;
        },

        openEdit(cred) {
            this.editId = cred.id;
            this.form = { name: cred.name,
                username: cred.username,
                token: "" };
            this.showModal = true;
        },

        save() {
            if (this.editId) {
                const payload = { id: this.editId,
                    name: this.form.name,
                    username: this.form.username };
                if (this.form.token) {
                    payload.token = this.form.token;
                }
                this.$root.getSocket().emit("updateGitCredential", payload, (res) => {
                    this.$root.toastRes(res);
                    if (res.ok) {
                        this.showModal = false;
                        this.load();
                    }
                });
            } else {
                this.$root.getSocket().emit("addGitCredential", this.form, (res) => {
                    this.$root.toastRes(res);
                    if (res.ok) {
                        this.showModal = false;
                        this.load();
                    }
                });
            }
        },

        confirmDelete(cred) {
            if (confirm(`Delete credential "${cred.name}"?`)) {
                this.$root.getSocket().emit("deleteGitCredential", { id: cred.id }, (res) => {
                    this.$root.toastRes(res);
                    if (res.ok) {
                        this.load();
                    }
                });
            }
        },
    },
};
</script>
