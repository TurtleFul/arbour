<template>
    <transition name="slide-fade" appear>
        <div>
            <h1 class="mb-3">{{ $t("inspect") }} - {{ containerName }}</h1>

            <div class="shadow-box mb-3 editor-box">
                <CodeEditor
                    v-model="inspectData"
                    class="json-viewer"
                    lang="json"
                    :readonly="true"
                />
            </div>
        </div>
    </transition>
</template>

<script>
import { defineAsyncComponent } from "vue";

const CodeEditor = defineAsyncComponent(() => import("../components/CodeEditor.vue"));

export default {
    components: {
        CodeEditor,
    },
    data() {
        return {
            inspectData: "fetching ...",
        };
    },
    computed: {
        stackName() {
            return this.$route.params.stackName;
        },
        endpoint() {
            return this.$route.params.endpoint || "";
        },
        containerName() {
            return this.$route.params.containerName;
        },
    },
    mounted() {
        this.$root.emitAgent(this.endpoint, "containerInspect", this.containerName, (res) => {
            if (res.ok) {
                const inspectObj = JSON.parse(res.inspectData);
                if (inspectObj) {
                    this.inspectData = JSON.stringify(inspectObj, undefined, 2);
                }
            }
        });
    },
};
</script>

<style scoped lang="scss">

.editor-box {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    height: calc(100vh - 200px);
    min-height: 300px;
}

</style>
