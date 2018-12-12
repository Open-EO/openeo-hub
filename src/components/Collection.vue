<template>
	<div class="collection">
		<a class="anchor" :name="collection.name"></a><!-- ToDo: Replace name with id -->
		<h2>{{collection.name}}</h2>

		<div class="summary" v-if="collection.title">
            {{collection.title}}
		</div>

		<div class="backendname">
			<em>{{collection.backend}}</em>
		</div>

		<button v-if="initiallyCollapsed" class="show-more-button" @click="collapsed = !collapsed">Show {{collapsed ? 'more' : 'less'}}</button>

		<div v-show="!collapsed">

		<div class="description" v-if="collection.description">
			<h3>Description</h3>
			<Description :description="collection.description"></Description>
		</div>

		<div class="extent">
			<h3>Spatial Extent</h3>
			Bounding Box: North: {{collection.extent.spatial[3]}}, South: {{collection.extent.spatial[1]}}, East: {{collection.extent.spatial[2]}}, West: {{collection.extent.spatial[0]}}
			<l-map style="height:400px" :zoom="1" :options="{scrollWheelZoom:false}" v-if="!collapsed /*otherwise the map size is not initiated correctly!*/">
				<l-tile-layer
					url="http://{s}.tile.osm.org/{z}/{x}/{y}.png"
					attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
					:options="{noWrap:true}">
				</l-tile-layer>
				<l-rectangle :bounds="[[collection.extent.spatial[3], collection.extent.spatial[0]], [collection.extent.spatial[1], collection.extent.spatial[2]]]"></l-rectangle>
			</l-map>

			<h3>Temporal Extent</h3>
			<div v-if="collection.extent.temporal[0] == collection.extent.temporal[1]">
				<FormattedTimestamp :timestamp="collection.extent.temporal[0]"></FormattedTimestamp>
			</div>
			<div v-else-if="collection.extent.temporal[0] == null">
				Until <FormattedTimestamp :timestamp="collection.extent.temporal[1]"></FormattedTimestamp>
			</div>
			<div v-else-if="collection.extent.temporal[1] == null">
				<FormattedTimestamp :timestamp="collection.extent.temporal[0]"></FormattedTimestamp> until present
			</div>
			<div v-else>
				<FormattedTimestamp :timestamp="collection.extent.temporal[0]"></FormattedTimestamp>
				&ndash;
				<FormattedTimestamp :timestamp="collection.extent.temporal[1]"></FormattedTimestamp>
			</div>
		</div>

		<div class="metadata">
			<h3>Metadata</h3>
            <dl v-if="getNonTrivialMetadataKeys(collection).length > 0">
                <div v-for="key in getNonTrivialMetadataKeys(collection)" :key="key">
                    <dt>{{key}}</dt>
                    <dd>{{collection[key]}}</dd>
                </div>
			</dl>
            <p v-if="getNonTrivialMetadataKeys(collection).length === 0">This collection has no further metadata.</p>
		</div>

		<div class="links" v-if="filteredLinks.length > 0">
			<h3>See Also</h3>
			<LinkList :links="filteredLinks"></LinkList>
		</div>

		<div class="retrieved">
			<DataRetrievedNotice :timestamp="collection.retrieved"></DataRetrievedNotice>
		</div>
			
		</div>

	</div>
</template>

<script>
import { Description, LinkList } from '@openeo/processes-docgen';
import { LMap, LTileLayer, LRectangle } from 'vue2-leaflet';
import "leaflet/dist/leaflet.css";
import * as moment from 'moment';
import DataRetrievedNotice from './DataRetrievedNotice.vue';
import FormattedTimestamp from './FormattedTimestamp.vue';

export default {
	name: 'Collection',
	props: ['collection', 'initiallyCollapsed'],
	components: {
		Description,
		LinkList,
		LMap,
		LTileLayer,
		LRectangle,
		DataRetrievedNotice,
		FormattedTimestamp
	},
	data() {
		return {
			collapsed: this.initiallyCollapsed || false,
			filteredLinks: this.collection.links.filter(l => l.rel === undefined || ['self', 'parent', 'root'].indexOf(l.rel) == -1)
		};
	},
    methods: {
        getNonTrivialMetadataKeys(collection) {
            return Object.keys(collection).filter(k => ['name', 'title', 'description', 'links', 'backend', 'retrieved', 'extent'].indexOf(k) == -1)
		}
    }
}
</script>

<style>
</style>