<template>
    <div class="shadow-box mb-3" :class="{ 'sticky-shadow-box': embedded }" :style="boxStyle">
        <div class="list-header">
            <div class="d-flex align-items-center">
                <!-- TODO -->
                <button
                    v-if="false" class="btn btn-outline-normal ms-2" :class="{ 'active': selectMode }" type="button"
                    @click="selectMode = !selectMode"
                >
                    {{ $t("Select") }}
                </button>

                <div class="d-flex flex-grow-1">
                    <a v-if="searchText == ''" class="search-icon">
                        <font-awesome-icon icon="search" />
                    </a>
                    <a v-if="searchText != ''" class="search-icon" style="cursor: pointer" @click="clearSearchText">
                        <font-awesome-icon icon="times" />
                    </a>
                    <input v-model="searchText" class="form-control w-100" autocomplete="off" />
                </div>

                <button
                    class="btn btn-link ms-1 p-1"
                    data-toggle="tooltip" :title="$t('checkForUpdates')"
                    :disabled="checkingForUpdates"
                    @click="checkForUpdates"
                >
                    <font-awesome-icon :icon="checkingForUpdates ? 'spinner' : 'arrows-rotate'" :spin="checkingForUpdates" />
                </button>

                <!-- Dropdown for filter -->
                <BDropdown variant="link" placement="bottom-end" menu-class="filter-dropdown" toggle-class="filter-icon-container" no-caret>
                    <template #button-content>
                        <font-awesome-icon class="filter-icon" :class="{ 'filter-icon-active': stackFilter.isFilterSelected() }" icon="filter" />
                    </template>

                    <BDropdownItemButton :disabled="!stackFilter.isFilterSelected()" button-class="filter-dropdown-clear" @click="stackFilter.clear()">
                        <font-awesome-icon class="ms-1 me-2" icon="times" />{{ $t("clearFilter") }}
                    </BDropdownItemButton>

                    <BDropdownDivider></BDropdownDivider>

                    <template v-for="category in stackFilter.categories" :key="category">
                        <BDropdownGroup v-if="category.hasOptions()" :header="$t(category.label, 2)">
                            <BDropdownForm v-for="(value, key) in category.options" :key="value" form-class="filter-option" @change="category.toggleSelected(value)" @click.stop>
                                <BFormCheckbox :checked="category.selected.has(value)">{{ $t(key) }}</BFormCheckbox>
                            </BDropdownForm>
                        </BDropdownGroup>
                    </template>
                </BDropdown>
            </div>

            <!-- TODO: Selection Controls -->
            <div v-if="selectMode && false" class="selection-controls px-2 pt-2">
                <input v-model="selectAll" class="form-check-input select-input" type="checkbox" />

                <button class="btn-outline-normal" @click="pauseDialog">
                    <font-awesome-icon icon="pause" size="sm" /> {{
                        $t("Pause") }}
                </button>
                <button class="btn-outline-normal" @click="resumeSelected">
                    <font-awesome-icon icon="play" size="sm" />
                    {{ $t("Resume") }}
                </button>

                <span v-if="selectedStackCount > 0">
                    {{ $t("selectedStackCount", [selectedStackCount]) }}
                </span>
            </div>
        </div>
        <div ref="stackList" class="stack-list" :class="{ scrollbar: embedded }" :style="stackListStyle">
            <div v-if="agentStackList[0] && agentStackList[0].stacks.length === 0" class="text-center mt-3">
                <router-link to="/compose">{{ $t("addFirstStackMsg") }}</router-link>
            </div>
            <div v-for="(agent, index) in agentStackList" :key="index" class="stack-list-inner">
                <div
                    v-if="agentCount > 1" class="p-2 agent-select"
                    @click="closedAgents.set(agent.endpoint, !closedAgents.get(agent.endpoint))"
                >
                    <span class="me-1">
                        <font-awesome-icon v-show="closedAgents.get(agent.endpoint)" icon="chevron-circle-right" />
                        <font-awesome-icon v-show="!closedAgents.get(agent.endpoint)" icon="chevron-circle-down" />
                    </span>
                    <span>{{ getAgentName(agent.endpoint) }}</span>
                </div>
                <StackListItem
                    v-for="(item, stackIndex) in agent.stacks"
                    v-show="agentCount === 1 || !closedAgents.get(agent.endpoint)"
                    :key="stackIndex" :stack="item" :isSelectMode="selectMode"
                    :isSelected="isSelected" :select="select" :deselect="deselect"
                />
            </div>
        </div>
    </div>

    <Confirm ref="confirmPause" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="pauseSelected">
        {{ $t("pauseStackMsg") }}
    </Confirm>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Confirm from "./Confirm.vue";
import StackListItem from "./StackListItem.vue";
import { CREATED_FILE, CREATED_STACK, EXITED, RUNNING, RUNNING_AND_EXITED, StackFilter, StackStatusInfo, UNHEALTHY, UNKNOWN } from "../../../common/util-common";
import { SimpleStackData } from "../../../common/types";
import type { SocketRes } from "../vue-augmentation";

export default defineComponent({
    components: {
        Confirm,
        StackListItem,
    },
    props: {
        /** Is the stack list embedded in a sidebar? */
        embedded: {
            type: Boolean,
        },
    },
    data() {
        return {
            searchText: "",
            selectMode: false,
            selectAll: false,
            filterDropdownOpen: false,
            disableSelectAllWatcher: false,
            selectedStacks: {},
            windowTop: 0,
            closedAgents: new Map(),
            checkingForUpdates: false,
        };
    },
    computed: {
        /**
         * Improve the sticky appearance of the list by increasing its
         * height as user scrolls down.
         * Not used on mobile.
         * @returns {object} Style for stack list
         */
        boxStyle() {
            if (this.embedded) {
                if (window.innerWidth > 550) {
                    return {
                        height: `calc(100vh - 160px + ${this.windowTop}px)`,
                    };
                } else {
                    return {
                        height: "calc(100vh - 160px)",
                    };
                }
            } else {
                return "";
            }
        },

        stackFilter(): StackFilter {
            return this.$root.stackFilter;
        },

        agentCount() {
            return this.$root.agentCount;
        },

        /**
         * Returns a sorted list of stacks based on the applied filters and search text.
         * @returns {Array} The sorted list of stacks.
         */
        agentStackList(): {endpoint: string, stacks: SimpleStackData[]}[] {
            let result: SimpleStackData[] = Object.values(this.$root.completeStackList);

            result = result.filter(stack => {
                // filter by search text
                // finds stack name, tag name or tag value
                let searchTextMatch = true;
                if (this.searchText !== "") {
                    const loweredSearchText = this.searchText.toLowerCase();
                    searchTextMatch =
                        stack.name.toLowerCase().includes(loweredSearchText);
                    /* TODO
                        || stack.tags.find(tag => tag.name.toLowerCase().includes(loweredSearchText)
                            || tag.value?.toLowerCase().includes(loweredSearchText));
                    */
                }

                // filter by agent
                let agentMatch = true;
                if (this.stackFilter.agents.isFilterSelected()) {
                    agentMatch = this.stackFilter.agents.selected.has(stack.endpoint);
                }

                // filter by status
                let statusMatch = true;
                if (this.stackFilter.status.isFilterSelected()) {
                    statusMatch = this.stackFilter.status.selected.has(StackStatusInfo.get(stack.status).label);
                }

                let attributeMatch = true;
                if (this.stackFilter.attributes.isFilterSelected()) {
                    attributeMatch = false;
                    for (const attribute of this.stackFilter.attributes.selected) {
                        if ( stack[attribute as keyof SimpleStackData] === true) {
                            attributeMatch = true;
                        }
                    }
                }

                // filter by tags TODO
                let tagsMatch = true;
                /**
                if (this.stackFilter.tags != null && this.stackFilter.tags.length > 0) {
                    tagsMatch = stack.tags.map(tag => tag.tag_id) // convert to array of tag IDs
                        .filter(stackTagId => this.stackFilter.tags.includes(stackTagId)) // perform Array Intersaction between filter and stack's tags
                        .length > 0;
                }*/

                return searchTextMatch && agentMatch && statusMatch && attributeMatch && tagsMatch;
            });

            result.sort((m1, m2) => {

                // sort by managed by arbour
                if (m1.isManagedByArbour && !m2.isManagedByArbour) {
                    return -1;
                } else if (!m1.isManagedByArbour && m2.isManagedByArbour) {
                    return 1;
                }

                // treat RUNNING and RUNNING_AND_EXITED the same
                const status1 = m1.status !== RUNNING_AND_EXITED ? m1.status : RUNNING ;
                const status2 = m2.status !== RUNNING_AND_EXITED ? m2.status : RUNNING ;

                // sort by status
                if (status1 !== status2) {
                    if (status2 === UNHEALTHY) {
                        return 1;
                    } else if (status1 === UNHEALTHY) {
                        return -1;
                    } else if (status2 === RUNNING) {
                        return 1;
                    } else if (status1 === RUNNING) {
                        return -1;
                    } else if (status2 === EXITED) {
                        return 1;
                    } else if (status1 === EXITED) {
                        return -1;
                    } else if (status2 === CREATED_STACK) {
                        return 1;
                    } else if (status1 === CREATED_STACK) {
                        return -1;
                    } else if (status2 === CREATED_FILE) {
                        return 1;
                    } else if (status1 === CREATED_FILE) {
                        return -1;
                    } else if (status2 === UNKNOWN) {
                        return 1;
                    } else if (status1 === UNKNOWN) {
                        return -1;
                    }
                }
                return m1.name.localeCompare(m2.name);
            });

            // Group stacks by endpoint, sorting them so the local endpoint is first
            // and the rest are sorted alphabetically
            const resultByEndpoint: {endpoint: string, stacks: SimpleStackData[]}[] = [
                ...result.reduce((acc, stack) => {
                    const endpoint = stack.endpoint;
                    let stacks = acc.get(endpoint);
                    if (!stacks) {
                        stacks = [];
                        acc.set(endpoint, stacks);
                    }
                    stacks.push(stack);
                    return acc;
                }, new Map<string, SimpleStackData[]>()).entries()
            ].map(([ endpoint, stacks ]) => ({
                endpoint,
                stacks
            })).sort((a, b) => {
                if (a.endpoint === "" && b.endpoint !== "") {
                    return -1;
                } else if (a.endpoint !== "" && b.endpoint === "") {
                    return 1;
                }
                return a.endpoint.localeCompare(b.endpoint);
            });

            return resultByEndpoint;
        },

        stackListStyle() {
            //let listHeaderHeight = 107;
            let listHeaderHeight = 60;

            if (this.selectMode) {
                listHeaderHeight += 42;
            }

            return {
                "height": `calc(100% - ${listHeaderHeight}px)`
            };
        },

        selectedStackCount() {
            return Object.keys(this.selectedStacks).length;
        },

        /**
         * Determines if any filters are active.
         * @returns {boolean} True if any filter is active, false otherwise.
         */
        filtersActive() {
            return this.stackFilter.isFilterSelected() || this.searchText !== "";
        }
    },
    watch: {
        $route() {
            console.log("route changed");
        },

        searchText() {
            for (let stack of this.agentStackList) {
                if (!(this.selectedStacks as Record<string, boolean>)[(stack as unknown as { id: string }).id]) {
                    if (this.selectAll) {
                        this.disableSelectAllWatcher = true;
                        this.selectAll = false;
                    }
                    break;
                }
            }
        },
        selectAll() {
            if (!this.disableSelectAllWatcher) {
                this.selectedStacks = {};

                if (this.selectAll) {
                    this.agentStackList.forEach((item) => {
                        (this.selectedStacks as Record<string, boolean>)[(item as unknown as { id: string }).id] = true;
                    });
                }
            } else {
                this.disableSelectAllWatcher = false;
            }
        },
        selectMode() {
            if (!this.selectMode) {
                this.selectAll = false;
                this.selectedStacks = {};
            }
        },
    },
    mounted() {
        if (this.embedded) {
            window.addEventListener("scroll", this.onScroll);
        }
    },
    beforeUnmount() {
        if (this.embedded) {
            window.removeEventListener("scroll", this.onScroll);
        }
    },
    methods: {
        /**
         * Handle user scroll
         * @returns {void}
         */
        onScroll() {
            if (window.top!.scrollY <= 133) {
                this.windowTop = window.top!.scrollY;
            } else {
                this.windowTop = 133;
            }
        },

        /**
         * Clear the search bar
         * @returns {void}
         */
        clearSearchText() {
            this.searchText = "";
        },

        checkForUpdates() {
            this.checkingForUpdates = true;
            this.$root.emitAgent("", "checkForUpdates", (res: SocketRes) => {
                this.checkingForUpdates = false;
                this.$root.toastRes(res);
            });
        },
        /**
         * Deselect a stack
         * @param {number} id ID of stack
         * @returns {void}
         */
        deselect(id: string) {
            delete (this.selectedStacks as Record<string, boolean>)[id];
        },
        /**
         * Select a stack
         * @param {number} id ID of stack
         * @returns {void}
         */
        select(id: string) {
            (this.selectedStacks as Record<string, boolean>)[id] = true;
        },
        /**
         * Determine if stack is selected
         * @param {number} id ID of stack
         * @returns {bool} Is the stack selected?
         */
        isSelected(id: string) {
            return id in this.selectedStacks;
        },
        /**
         * Disable select mode and reset selection
         * @returns {void}
         */
        cancelSelectMode() {
            this.selectMode = false;
            this.selectedStacks = {};
        },
        /**
         * Show dialog to confirm pause
         * @returns {void}
         */
        pauseDialog() {
            (this.$refs.confirmPause as { show(): void }).show();
        },
        /**
         * Pause each selected stack
         * @returns {void}
         */
        pauseSelected() {
            Object.keys(this.selectedStacks)
                .filter(id => (this.$root.stackList[id] as unknown as Record<string, unknown>)["active"])
                .forEach(id => this.$root.getSocket().emit("pauseStack", id, () => { }));

            this.cancelSelectMode();
        },
        /**
         * Resume each selected stack
         * @returns {void}
         */
        resumeSelected() {
            Object.keys(this.selectedStacks)
                .filter(id => !(this.$root.stackList[id] as unknown as Record<string, unknown>)["active"])
                .forEach(id => this.$root.getSocket().emit("resumeStack", id, () => { }));

            this.cancelSelectMode();
        },

        getAgentName(endpoint: string) {
            return this.$root.getAgentName(endpoint);
        }
    },
});
</script>

<style scoped>
.sticky-shadow-box {
    height: calc(100vh - 150px);
    position: sticky;
    top: 10px;
}

.small-padding {
    padding-left: 5px !important;
    padding-right: 5px !important;
}

.list-header {
    border-radius: var(--arbour-radius) var(--arbour-radius) 0 0;
    margin: -10px;
    margin-bottom: 10px;
    padding: 5px;
    background-color: var(--arbour-bg-header);
}

.btn-link {
    color: var(--arbour-text-on-header);

    &:hover {
        color: var(--arbour-text-on-header);
        opacity: 0.7;
    }

    &:disabled {
        color: var(--arbour-text-on-header);
        opacity: 0.4;
    }
}

.search-icon {
    width: 40px;
    padding: 10px;
    color: var(--arbour-text-on-header);

    svg[data-icon="times"] {
        cursor: pointer;
        transition: all ease-in-out 0.1s;

        &:hover {
            opacity: 0.5;
        }
    }
}

:deep(.filter-icon-container) {
    text-decoration: none;
    padding-right: 0px;
}

.filter-icon {
    padding: 10px;
    color: var(--arbour-text-on-header) !important;
    cursor: pointer;
    border: 1px solid transparent;
}

.filter-icon-active {
    color: var(--arbour-info) !important;
    border: 1px solid var(--arbour-info);
    border-radius: 5px;
}

:deep(.filter-dropdown) {
    background-color: var(--arbour-bg);
    border-color: var(--arbour-text-muted);
    color: var(--arbour-text);

    .dropdown-header {
        color: var(--arbour-text);
        font-weight: bolder;
    }

    .form-check-input {
        border-color: var(--arbour-text-muted);
    }
}

:deep(.filter-dropdown-clear) {
    color: var(--arbour-text);

    &:disabled {
        color: var(--arbour-text-muted);
    }

    &:hover {
        background-color: var(--arbour-bg-header-active);
        color: var(--arbour-text);
    }
}

:deep(.filter-option) {
    padding-top: 0.25rem !important;
    padding-bottom: 0.25rem !important;
}

.stack-item {
    width: 100%;
}

.tags {
    margin-top: 4px;
    padding-left: 67px;
    display: flex;
    flex-wrap: wrap;
    gap: 0;
}

.bottom-style {
    padding-left: 67px;
    margin-top: 5px;
}

.selection-controls {
    margin-top: 5px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.agent-select {
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: var(--arbour-text-muted);
    padding-left: 10px;
    padding-right: 10px;
    display: flex;
    align-items: center;
    user-select: none;
}
</style>
