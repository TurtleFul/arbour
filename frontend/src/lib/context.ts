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
}

export interface AgentContext {
    readonly processing: boolean;
    startAction(): void;
    stopAction(): void;
}
