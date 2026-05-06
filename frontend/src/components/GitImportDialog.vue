<template>
    <BModal
        :model-value="modelValue"
        :title="$t('importFromGit')"
        no-footer
        @hidden="emit('update:modelValue', false)"
        @show="onShow"
    >
        <form @submit.prevent="submit">
            <div class="mb-3">
                <label class="form-label">{{ $t("stackName") }}</label>
                <input v-model="form.stackName" type="text" class="form-control" required pattern="[a-zA-Z0-9_-]+" title="Letters, numbers, hyphens, underscores only — no spaces" />
                <div class="form-text">{{ $t("Lowercase only") }}</div>
            </div>
            <div class="mb-3">
                <label class="form-label">{{ $t("gitRepoUrl") }}</label>
                <input v-model="form.repoUrl" type="url" class="form-control" placeholder="https://github.com/user/repo" required />
            </div>
            <div class="mb-3">
                <label class="form-label">{{ $t("gitBranch") }}</label>
                <input v-model="form.branch" type="text" class="form-control" placeholder="main" />
            </div>
            <div class="mb-3">
                <label class="form-label">{{ $t("gitSubdir") }}</label>
                <input v-model="form.subdir" type="text" class="form-control" placeholder="path/to/stack" />
            </div>
            <div class="mb-3">
                <label class="form-label">{{ $t("gitCredential") }}</label>
                <select v-model="form.credentialId" class="form-select">
                    <option :value="null">{{ $t("noCredential") }}</option>
                    <option v-for="cred in credentials" :key="cred.id" :value="cred.id">{{ cred.name }}</option>
                </select>
            </div>
            <div class="mb-3 form-check">
                <input id="git-import-deploy" v-model="form.deploy" type="checkbox" class="form-check-input" />
                <label class="form-check-label" for="git-import-deploy">{{ $t("deployAfterImport") }}</label>
            </div>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-normal" @click="emit('update:modelValue', false)">{{ $t("Cancel") }}</button>
                <button type="submit" class="btn btn-primary" :disabled="saving">
                    <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                    {{ $t("importFromGit") }}
                </button>
            </div>
        </form>
    </BModal>
</template>

<script setup lang="ts">
import { ref, onMounted, getCurrentInstance } from "vue";

const props = defineProps({
    modelValue: Boolean,
    endpoint: { type: String,
        default: "" },
});

const emit = defineEmits([ "update:modelValue", "imported" ]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const root = getCurrentInstance()?.proxy?.$root as any;

const credentials = ref([]);
const saving = ref(false);
const error = ref("");

const form = ref({
    stackName: "",
    repoUrl: "",
    branch: "main",
    subdir: "",
    credentialId: null,
    deploy: false,
});

onMounted(() => {
    root.getSocket().emit("getGitCredentials", (res) => {
        if (res.ok) {
            credentials.value = res.credentials;
        }
    });
});

function onShow() {
    error.value = "";
    saving.value = false;
    form.value = { stackName: "",
        repoUrl: "",
        branch: "main",
        subdir: "",
        credentialId: null,
        deploy: false };
}

function submit() {
    error.value = "";
    saving.value = true;

    root.emitAgent(props.endpoint, "importStackFromGit", {
        stackName: form.value.stackName,
        repoUrl: form.value.repoUrl,
        branch: form.value.branch || "main",
        subdir: form.value.subdir,
        credentialId: form.value.credentialId,
        deploy: form.value.deploy,
    }, (res) => {
        saving.value = false;
        if (res.ok) {
            emit("update:modelValue", false);
            emit("imported", { ...res,
                stackName: form.value.stackName });
        } else {
            error.value = res.msg || "Error";
        }
    });
}
</script>
