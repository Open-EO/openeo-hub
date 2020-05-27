<template>
	<div class="backendGroup">
        <h3 @click="toggleCollapsed">
            {{collapsed ? '▶' : '▼'}}
            {{groupName}}
        </h3>

        <div v-show="!collapsed">
            <p><small>URL: <code>{{backends[0].service}}</code></small></p>
            <Tabs :id="groupName" :pills="true" ref="tabsComponent">
                <Tab v-for="(backend, index) in backends" :key="backend.backendUrl" :id="'version-'+backend.backendUrl" :name="tabTitle(backend)" :selected="index == 0">
                    <Backend :backendData="backend" :collapsible="false" :showVersion="false"></Backend>
                </Tab>
            </Tabs>
        </div>
    </div>
</template>

<script>
import Backend from './Backend.vue';
import { Tab, Tabs } from '@openeo/vue-components';
import {default as config} from './../../config.json';

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
    },
    methods: {
        toggleCollapsed() {
            this.collapsed = !this.collapsed;
            if (typeof this.$refs.tabsComponent.adjustSizes === 'function') {
                this.$nextTick(this.$refs.tabsComponent.adjustSizes);
            }
        },
        tabTitle(backend) {
            return 'v'+backend.api_version + (this.needsWarningSign(backend) ? ' ⚠':'');
        },
        recentlyUnavailable(backend) {
            return backend.unsuccessfulCrawls >= config.unsuccessfulCrawls.flagAfter;
        },
        oldData(backend) {
            return (new Date() - new Date(backend.retrieved)) >= config.flagWhenOlderThanXHours * 60 * 60 * 1000;
        },
        needsWarningSign(backend) {
            return this.recentlyUnavailable(backend) || this.oldData(backend);
        }
    }
}
</script>

<style scoped>
h3 {
    cursor: pointer;
}

.backendGroup > div {
    padding-left: 40px;
}
</style>

<style>
.tabsHeader {
    margin-bottom: 10px;
}
.tabs .tabsBody {
    overflow: visible;
}
</style>
