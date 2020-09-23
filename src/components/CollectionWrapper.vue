<template>
	<Collection :collectionData="collectionData" :version="version" :initiallyCollapsed="initiallyCollapsed" :mapOptions="{scrollWheelZoom: false, wrapAroundAntimeridian: false}">
		<template slot="collection-before-details">
			<UnsuccessfulCrawlNotice :unsuccessfulCrawls="collectionData.unsuccessfulCrawls"></UnsuccessfulCrawlNotice>
			<DataRetrievedNotice :timestamp="collectionData.retrieved"></DataRetrievedNotice>
		</template>

		<template slot="collection-temporal-extents" slot-scope="props">
			<div v-for="extent in props.extents">
				<div v-if="extent[0] == extent[1]">
					<FormattedTimestamp :timestamp="extent[0]"></FormattedTimestamp>
				</div>
				<div v-else-if="extent[0] == null">
					Until <FormattedTimestamp :timestamp="extent[1]"></FormattedTimestamp>
				</div>
				<div v-else-if="extent[1] == null">
					<FormattedTimestamp :timestamp="extent[0]"></FormattedTimestamp> until present
				</div>
				<div v-else>
					<FormattedTimestamp :timestamp="extent[0]"></FormattedTimestamp>
					&ndash;
					<FormattedTimestamp :timestamp="extent[1]"></FormattedTimestamp>
				</div>
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