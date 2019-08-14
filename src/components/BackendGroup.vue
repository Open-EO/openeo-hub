<template>
	<div class="backendGroup">
        <h3 @click="collapsed = !collapsed">
            {{collapsed ? '▶' : '▼'}}
            {{groupName}}
        </h3>

        <div v-show="!collapsed">
            <Tabs :id="groupName"> <!-- TODO: use pills instead of tabs -->
                <Tab v-for="(backend, index) in backends" :key="backend.backendUrl" :id="'version-'+backend.backendUrl" :name="'v'+(backend.version || backend.api_version)" :selected="index == 0">
                    <Backend :backendData="backend" :initiallyCollapsed="false"></Backend>
                </Tab>
            </Tabs>
        </div>
    </div>
</template>

<script>
import Backend from './Backend.vue';
import { Tab, Tabs } from '@openeo/vue-components';

export default {
    name: 'BackendGroup',
    components: {
        Backend,
        Tab,
        Tabs
    },
	props: ['groupName', 'backends'],
	data() {
		return {
            collapsed: true
		};
    }
}
</script>

<style scoped>
h3 {
    cursor: pointer;
}

.backendGroup div {   /* TODO: check styling */
    padding-left: 20px;
}
</style>
