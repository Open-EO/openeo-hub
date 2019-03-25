<template>
	<Process :processData="processData" :initiallyCollapsed="initiallyCollapsed" :provideDownload="provideDownload">
		<template slot="process-after-summary">
			<BackendName :data="processData"></BackendName>
			<UnsuccessfulCrawlNotice :unsuccessfulCrawls="processData.unsuccessfulCrawls"></UnsuccessfulCrawlNotice>
		</template>
		<template slot="process-after-details">
			<DataRetrievedNotice :timestamp="processData.retrieved"></DataRetrievedNotice>
		</template>
	</Process>
</template>

<script>
import BackendName from './BackendName.vue';
import DataRetrievedNotice from './DataRetrievedNotice.vue';
import UnsuccessfulCrawlNotice from './UnsuccessfulCrawlNotice.vue';
import { Process } from '@openeo/vue-components';

export default {
	name: 'ProcessWrapper',
	props: ['processData', 'initiallyCollapsed', 'provideDownload'],
	components: {
		BackendName,
		Process,
		DataRetrievedNotice,
		UnsuccessfulCrawlNotice
    }
}
</script>

<style>
</style>