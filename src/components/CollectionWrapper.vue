<template>
	<Collection :collectionData="collectionData" :version="version" :initiallyCollapsed="initiallyCollapsed" :mapOptions="{scrollWheelZoom: false, wrapAroundAntimeridian: false}">
		<template slot="collection-before-details">
			<UnsuccessfulCrawlNotice :unsuccessfulCrawls="collectionData.unsuccessfulCrawls"></UnsuccessfulCrawlNotice>
			<DataRetrievedNotice :timestamp="collectionData.retrieved"></DataRetrievedNotice>
		</template>

		<template slot="collection-temporal-extent" slot-scope="props">
			<div v-if="props.extent[0] == props.extent[1]">
				<FormattedTimestamp :timestamp="props.extent[0]"></FormattedTimestamp>
			</div>
			<div v-else-if="props.extent[0] == null">
				Until <FormattedTimestamp :timestamp="props.extent[1]"></FormattedTimestamp>
			</div>
			<div v-else-if="props.extent[1] == null">
				<FormattedTimestamp :timestamp="props.extent[0]"></FormattedTimestamp> until present
			</div>
			<div v-else>
				<FormattedTimestamp :timestamp="props.extent[0]"></FormattedTimestamp>
				&ndash;
				<FormattedTimestamp :timestamp="props.extent[1]"></FormattedTimestamp>
			</div>
		</template>

	</Collection>
</template>

<script>
import { Collection } from '@openeo/vue-components';
import "leaflet/dist/leaflet.css";
// The notices can still be of use in CollectionWrapper because `/collections/{id}` is a separate openEO API endpoint that has to be crawled separately (this is not the case for the ProcessWrapper)
import DataRetrievedNotice from './DataRetrievedNotice.vue';
import FormattedTimestamp from './FormattedTimestamp.vue';
import UnsuccessfulCrawlNotice from './UnsuccessfulCrawlNotice.vue';

export default {
	name: 'CollectionWrapper',
	props: ['collectionData', 'version', 'initiallyCollapsed'],
	components: {
		Collection,
		UnsuccessfulCrawlNotice,
		DataRetrievedNotice,
		FormattedTimestamp
    }
}
</script>

<style>
</style>