<script lang="ts">
import Icon from "./Icon.svelte";

let {
    value = $bindable(""),
    placeholder = "",
    maxlength = 255,
    autocomplete = "new-password",
    required = false,
    readonly = false,
} = $props<{
    value?: string;
    placeholder?: string;
    maxlength?: number;
    autocomplete?: string;
    required?: boolean;
    readonly?: boolean;
}>();

let visible = $state(false);
</script>

<div class="hidden-input">
    <input
        bind:value
        type={visible ? "text" : "password"}
        {placeholder}
        {maxlength}
        {autocomplete}
        {required}
        {readonly}
    />
    <button type="button" onclick={() => (visible = !visible)}>
        <Icon name={visible ? "eye-slash" : "eye"} />
    </button>
</div>

<style>
.hidden-input {
    display: flex;
    gap: 0;
    margin-bottom: 1rem;
}

.hidden-input input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--arbour-border);
    border-right: none;
    border-radius: var(--arbour-radius) 0 0 var(--arbour-radius);
    background: var(--arbour-bg);
    color: var(--arbour-text);
    font-size: 1rem;
    outline: none;
}

.hidden-input input:focus {
    border-color: var(--arbour-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--arbour-primary) 25%, transparent);
}

.hidden-input button {
    padding: 0.5rem 0.85rem;
    border: 1px solid var(--arbour-border);
    border-left: none;
    border-radius: 0 var(--arbour-radius) var(--arbour-radius) 0;
    background: transparent;
    color: var(--arbour-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
}

.hidden-input button:hover {
    background: color-mix(in srgb, var(--arbour-primary) 10%, transparent);
}
</style>
