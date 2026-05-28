import type { ComposeDocument } from "../../../common/compose-document";
import type { StackData } from "../../../common/types";

export const COMPOSE_CONTEXT = Symbol("compose");
export const AGENT_CONTEXT = Symbol("agent");

export interface ComposeContext {
    readonly endpoint: string;
    readonly stack: StackData;
    readonly composeDocument: ComposeDocument;
    readonly processing: boolean;
    readonly editorFocus: boolean;
    startComposeAction(): void;
    stopComposeAction(): void;
    saveStack(): void;
    /** Notify that a GUI editor mutated composeDocument in place, so the page
     *  re-serializes it to YAML. The document model uses in-place mutation that
     *  Svelte's deep reactivity doesn't reliably observe, hence the explicit signal. */
    notifyDocChanged(): void;
}

export interface AgentContext {
    readonly processing: boolean;
    startAction(): void;
    stopAction(): void;
}
