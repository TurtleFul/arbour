<script lang="ts">
import { onMount, onDestroy } from "svelte";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap } from "@codemirror/language";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { tags } from "@lezer/highlight";
import { yaml } from "@codemirror/lang-yaml";
import { json } from "@codemirror/lang-json";

let {
    value = $bindable(""),
    lang = "yaml" as "yaml" | "json" | "env",
    isReadonly = false,
    onfocus = undefined,
    onblur = undefined,
} : {
    value?: string;
    lang?: "yaml" | "json" | "env";
    isReadonly?: boolean;
    onfocus?: () => void;
    onblur?: () => void;
} = $props();

let editorEl: HTMLDivElement;
let view: EditorView;
let lastEditorValue = "";

const langComp = new Compartment();
const editableComp = new Compartment();
const readOnlyComp = new Compartment();

const arbourHighlight = HighlightStyle.define([
    { tag: tags.keyword,
        color: "var(--arbour-primary)" },
    { tag: tags.bool,
        color: "var(--arbour-primary)" },
    { tag: tags.tagName,
        color: "var(--arbour-primary)" },
    { tag: tags.string,
        color: "var(--arbour-warning)" },
    { tag: tags.number,
        color: "var(--arbour-danger)" },
    { tag: tags.propertyName,
        color: "var(--arbour-info)" },
    { tag: tags.attributeName,
        color: "var(--arbour-info)" },
    { tag: tags.labelName,
        color: "var(--arbour-info)" },
    { tag: tags.typeName,
        color: "var(--arbour-maintenance)" },
    { tag: tags.variableName,
        color: "var(--arbour-text)" },
    { tag: tags.null,
        color: "var(--arbour-text-muted)" },
    { tag: tags.comment,
        color: "var(--arbour-text-muted)",
        fontStyle: "italic" },
    { tag: tags.meta,
        color: "var(--arbour-text-muted)" },
    { tag: tags.operator,
        color: "var(--arbour-text-subtle)" },
    { tag: tags.punctuation,
        color: "var(--arbour-text-subtle)" },
    { tag: tags.link,
        color: "var(--arbour-info)",
        textDecoration: "underline" },
]);

const baseTheme = EditorView.theme({
    "&": { height: "100%" },
    ".cm-content": { fontFamily: "'JetBrains Mono', monospace",
        fontSize: "14px" },
    ".cm-gutterElement": { fontFamily: "'JetBrains Mono', monospace",
        fontSize: "14px" },
});

const selectionTheme = EditorView.theme({
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
        backgroundColor: "var(--arbour-selection-bg)",
    },
    ".cm-content ::selection": {
        backgroundColor: "var(--arbour-selection-bg)",
        color: "var(--arbour-selection-color)",
    },
});

const editorTheme = EditorView.theme({
    "&": { backgroundColor: "var(--arbour-bg-deep)",
        color: "var(--arbour-text)" },
    ".cm-content": { caretColor: "var(--arbour-primary)" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--arbour-primary)" },
    ".cm-gutters": {
        backgroundColor: "var(--arbour-bg)",
        color: "var(--arbour-text-muted)",
        borderRight: "1px solid var(--arbour-border)",
    },
    ".cm-lineNumbers .cm-gutterElement": { color: "var(--arbour-text-muted)" },
    ".cm-activeLineGutter": { backgroundColor: "var(--arbour-bg-header)" },
    ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--arbour-primary) 5%, transparent)" },
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

function getLangExtension(l: string) {
    if (l === "yaml" || l === "env") {
        return yaml();
    }
    if (l === "json") {
        return json();
    }
    return [];
}

$effect(() => {
    if (!view) {
        return;
    }
    const l = lang;
    view.dispatch({ effects: langComp.reconfigure(getLangExtension(l)) });
});

$effect(() => {
    if (!view) {
        return;
    }
    const ro = isReadonly;
    view.dispatch({ effects: [
        editableComp.reconfigure(EditorView.editable.of(!ro)),
        readOnlyComp.reconfigure(EditorState.readOnly.of(ro)),
    ] });
});

$effect(() => {
    if (!view) {
        return;
    }
    if (value === lastEditorValue) {
        return;
    }
    const current = view.state.doc.toString();
    if (current !== value) {
        view.dispatch({ changes: { from: 0,
            to: current.length,
            insert: value } });
    }
    lastEditorValue = value;
});

onMount(() => {
    view = new EditorView({
        state: EditorState.create({
            doc: value,
            extensions: [
                baseTheme,
                selectionTheme,
                editorTheme,
                lineNumbers(),
                highlightActiveLine(),
                highlightActiveLineGutter(),
                foldGutter(),
                drawSelection(),
                history(),
                indentOnInput(),
                bracketMatching(),
                closeBrackets(),
                autocompletion(),
                highlightSelectionMatches(),
                EditorView.lineWrapping,
                syntaxHighlighting(arbourHighlight),
                langComp.of(getLangExtension(lang)),
                editableComp.of(EditorView.editable.of(!isReadonly)),
                readOnlyComp.of(EditorState.readOnly.of(isReadonly)),
                keymap.of([
                    ...closeBracketsKeymap,
                    ...defaultKeymap,
                    ...searchKeymap,
                    ...historyKeymap,
                    ...foldKeymap,
                    ...completionKeymap,
                    indentWithTab,
                ]),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        lastEditorValue = update.state.doc.toString();
                        value = lastEditorValue;
                    }
                    if (update.focusChanged) {
                        if (update.view.hasFocus) {
                            onfocus?.();
                        } else {
                            onblur?.();
                        }
                    }
                }),
            ],
        }),
        parent: editorEl,
    });
    lastEditorValue = value;
});

onDestroy(() => view?.destroy());
</script>

<div
    class="code-editor"
    class:code-editor-readonly={isReadonly}
    bind:this={editorEl}
></div>

<style>
.code-editor {
    height: 100%;
    overflow: auto;
    border-radius: var(--arbour-radius);
}

:global(.code-editor .cm-editor) {
    height: 100%;
    border-radius: var(--arbour-radius);
}

:global(.code-editor .cm-editor .cm-scroller) {
    border-radius: var(--arbour-radius);
}

.code-editor-readonly :global(.cm-editor) {
    background-color: transparent;
    color: var(--arbour-text);
}

.code-editor-readonly :global(.cm-gutters) {
    display: none;
}

.code-editor-readonly :global(.cm-activeLine) {
    background-color: transparent;
}

.code-editor-readonly :global(.cm-cursor) {
    display: none;
}
</style>
