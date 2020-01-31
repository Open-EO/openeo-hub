<template>
	<Collection :collectionData="collectionData" :version="version" :initiallyCollapsed="initiallyCollapsed">
		<template slot="collection-before-details">
			<UnsuccessfulCrawlNotice :unsuccessfulCrawls="collectionData.unsuccessfulCrawls"></UnsuccessfulCrawlNotice>
			<DataRetrievedNotice :timestamp="collectionData.retrieved"></DataRetrievedNotice>
		</template>

		<template slot="collection-spatial-extent" slot-scope="props">
			Bounding Box: North: {{props.extent[3]}}, South: {{props.extent[1]}}, East: {{props.extent[2]}}, West: {{props.extent[0]}}
			<l-map style="height:400px" :zoom="1" :options="{scrollWheelZoom:false}">
				<l-tile-layer
					url="http://{s}.tile.osm.org/{z}/{x}/{y}.png"
					attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
					:options="{noWrap:true}">
				</l-tile-layer>
				<l-rectangle :bounds="[[props.extent[3], props.extent[0]], [props.extent[1], props.extent[2]]]"></l-rectangle>
			</l-map>
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
import { LMap, LTileLayer, LRectangle } from 'vue2-leaflet';
import "leaflet/dist/leaflet.css";
import DataRetrievedNotice from './DataRetrievedNotice.vue';
import FormattedTimestamp from './FormattedTimestamp.vue';
import UnsuccessfulCrawlNotice from './UnsuccessfulCrawlNotice.vue';

export default {
	name: 'CollectionWrapper',
	props: ['collectionData', 'version', 'initiallyCollapsed'],
	components: {
		Collection,
		UnsuccessfulCrawlNotice,
		LMap,
		LTileLayer,
		LRectangle,
		DataRetrievedNotice,
		FormattedTimestamp
    }
}
</script>

<style>
</style>