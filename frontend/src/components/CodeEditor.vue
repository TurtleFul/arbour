<template>
    <div class="code-editor" :class="{ 'code-editor-readonly': readonly }">
        <Codemirror
            :model-value="modelValue"
            :extensions="extensions"
            :disabled="readonly"
            @update:model-value="$emit('update:modelValue', $event)"
            @focus="$emit('focus')"
            @blur="$emit('blur')"
        />
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { Codemirror } from "vue-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "codemirror";

const props = defineProps<{
    modelValue: string;
    lang?: "yaml" | "json" | "env";
    readonly?: boolean;
}>();

defineEmits<{
    "update:modelValue": [value: string];
    "focus": [];
    "blur": [];
}>();

const baseTheme = EditorView.theme({
    "&": {
        backgroundColor: "transparent",
        height: "100%",
    },
    ".cm-gutters": {
        backgroundColor: "transparent",
        border: "none",
    },
    ".cm-content": {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "14px",
    },
    ".cm-gutterElement": {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "14px",
    },
});

const extensions = computed(() => {
    const ext = [ oneDark, baseTheme, EditorView.lineWrapping ];

    if (props.lang === "yaml" || props.lang === "env") {
        ext.push(yaml());
    } else if (props.lang === "json") {
        ext.push(json());
    }

    if (props.readonly) {
        ext.push(EditorView.editable.of(false));
    }

    return ext;
});
</script>

<style lang="scss" scoped>
@import "../styles/vars.scss";

.code-editor {
    height: 100%;
    overflow: auto;
    border-radius: 5px;
}

:deep(.cm-editor) {
    height: 100%;
    border-radius: 5px;

    .cm-scroller {
        border-radius: 5px;
    }
}

.code-editor-readonly {
    :deep(.cm-editor) {
        background-color: transparent;

        .cm-gutters {
            display: none;
        }

        .cm-activeLine {
            background-color: transparent;
        }

        .cm-cursor {
            display: none;
        }
    }
}
</style>
