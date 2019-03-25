<template>
	<Process :processData="processData" :initiallyCollapsed="initiallyCollapsed" :provideDownload="provideDownload">
		<template slot="process-after-summary">
			<div class="backendname">
				<em>{{process.backendUrl}}</em>
			</div>
			<UnsuccessfulCrawlNotice :unsuccessfulCrawls="process.unsuccessfulCrawls"></UnsuccessfulCrawlNotice>
		</template>
		<template slot="process-after-details">
			<DataRetrievedNotice :timestamp="process.retrieved"></DataRetrievedNotice>
		</template>
	</Process>
</template>

<script>
import DataRetrievedNotice from './DataRetrievedNotice.vue';
import UnsuccessfulCrawlNotice from './UnsuccessfulCrawlNotice.vue';
import { Process } from '@openeo/vue-components';

export default {
	name: 'ProcessWrapper',
	props: ['processData', 'initiallyCollapsed', 'provideDownload'],
	components: {
		Process,
		DataRetrievedNotice,
		FormattedTimestamp
    }
}
</script>

<style>
</style>