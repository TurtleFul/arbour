<template>
    <BModal
        :model-value="modelValue"
        :title="$t('linkGitSource')"
        no-footer
        @hidden="emit('update:modelValue', false)"
        @show="onShow"
    >
        <form @submit.prevent="submit">
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
                <input id="link-import-now" v-model="form.importNow" type="checkbox" class="form-check-input" />
                <label class="form-check-label" for="link-import-now">{{ $t("importNow") }}</label>
            </div>
            <div v-if="form.importNow" class="mb-3 form-check">
                <input id="link-deploy" v-model="form.deploy" type="checkbox" class="form-check-input" />
                <label class="form-check-label" for="link-deploy">{{ $t("deployAfterImport") }}</label>
            </div>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-normal" @click="emit('update:modelValue', false)">{{ $t("Cancel") }}</button>
                <button type="submit" class="btn btn-primary" :disabled="saving">
                    <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                    {{ $t("Save") }}
                </button>
            </div>
        </form>
    </BModal>
</template>

<script setup lang="ts">
import { ref, onMounted, getCurrentInstance } from "vue";

const props = defineProps({
    modelValue: Boolean,
    stackName: { type: String,
        required: true },
    endpoint: { type: String,
        required: true },
    existingSource: { type: Object,
        default: null },
});

const emit = defineEmits([ "update:modelValue", "saved" ]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const root = getCurrentInstance()?.proxy?.$root as any;

const credentials = ref([]);
const saving = ref(false);
const error = ref("");

const form = ref({
    repoUrl: "",
    branch: "main",
    subdir: "",
    credentialId: null,
    importNow: true,
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
    if (props.existingSource) {
        form.value = {
            repoUrl: props.existingSource.repoUrl,
            branch: props.existingSource.branch,
            subdir: props.existingSource.subdir,
            credentialId: props.existingSource.credentialId,
            importNow: false,
            deploy: false,
        };
    } else {
        form.value = { repoUrl: "",
            branch: "main",
            subdir: "",
            credentialId: null,
            importNow: true,
            deploy: false };
    }
}

function submit() {
    error.value = "";
    saving.value = true;

    if (form.value.importNow) {
        root.emitAgent(props.endpoint, "importStackFromGit", {
            stackName: props.stackName,
            repoUrl: form.value.repoUrl,
            branch: form.value.branch || "main",
            subdir: form.value.subdir,
            credentialId: form.value.credentialId,
            deploy: form.value.deploy,
        }, (res) => {
            saving.value = false;
            if (res.ok) {
                emit("update:modelValue", false);
                emit("saved", res);
            } else {
                error.value = res.msg || "Error";
            }
        });
    } else {
        root.emitAgent(props.endpoint, "linkStackGitSource", {
            stackName: props.stackName,
            repoUrl: form.value.repoUrl,
            branch: form.value.branch || "main",
            subdir: form.value.subdir,
            credentialId: form.value.credentialId,
        }, (res) => {
            saving.value = false;
            if (res.ok) {
                emit("update:modelValue", false);
                emit("saved", res);
            } else {
                error.value = res.msg || "Error";
            }
        });
    }
}
</script>
