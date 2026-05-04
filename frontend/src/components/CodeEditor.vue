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
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
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

// Syntax token colors — CSS vars resolve at render time, so theme switches work automatically
const arbourHighlight = HighlightStyle.define([
    { tag: tags.keyword,       color: "var(--arbour-primary)" },
    { tag: tags.bool,          color: "var(--arbour-primary)" },
    { tag: tags.tagName,       color: "var(--arbour-primary)" },
    { tag: tags.string,        color: "var(--arbour-warning)" },
    { tag: tags.number,        color: "var(--arbour-danger)" },
    { tag: tags.propertyName,  color: "var(--arbour-info)" },
    { tag: tags.attributeName, color: "var(--arbour-info)" },
    { tag: tags.labelName,     color: "var(--arbour-info)" },
    { tag: tags.typeName,      color: "var(--arbour-maintenance)" },
    { tag: tags.variableName,  color: "var(--arbour-text)" },
    { tag: tags.null,          color: "var(--arbour-text-muted)" },
    { tag: tags.comment,       color: "var(--arbour-text-muted)", fontStyle: "italic" },
    { tag: tags.meta,          color: "var(--arbour-text-muted)" },
    { tag: tags.operator,      color: "var(--arbour-text-subtle)" },
    { tag: tags.punctuation,   color: "var(--arbour-text-subtle)" },
    { tag: tags.link,          color: "var(--arbour-info)", textDecoration: "underline" },
]);

// Editor chrome for edit mode — themed background, gutter, cursor, selection
const arbourEditorTheme = EditorView.theme({
    "&": {
        backgroundColor: "var(--arbour-bg-deep)",
        color: "var(--arbour-text)",
    },
    ".cm-content": {
        caretColor: "var(--arbour-primary)",
    },
    ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: "var(--arbour-primary)",
    },
    ".cm-gutters": {
        backgroundColor: "var(--arbour-bg)",
        color: "var(--arbour-text-muted)",
        borderRight: "1px solid var(--arbour-border)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
        color: "var(--arbour-text-muted)",
    },
    ".cm-activeLineGutter": {
        backgroundColor: "var(--arbour-bg-header)",
    },
    ".cm-activeLine": {
        backgroundColor: "color-mix(in srgb, var(--arbour-primary) 5%, transparent)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: "color-mix(in srgb, var(--arbour-primary) 20%, transparent)",
    },
    ".cm-matchingBracket": {
        color: "var(--arbour-primary) !important",
        backgroundColor: "color-mix(in srgb, var(--arbour-primary) 15%, transparent)",
    },
    ".cm-tooltip": {
        backgroundColor: "var(--arbour-bg)",
        border: "1px solid var(--arbour-border)",
        color: "var(--arbour-text)",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: "var(--arbour-bg-header-active)",
    },
});

// Base layout — font, height, transparent bg (used in both modes)
const baseTheme = EditorView.theme({
    "&": {
        height: "100%",
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
    const ext = [ baseTheme, EditorView.lineWrapping ];

    if (!props.readonly) {
        ext.push(arbourEditorTheme);
    }

    ext.push(syntaxHighlighting(arbourHighlight));

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
        color: var(--arbour-text);

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
