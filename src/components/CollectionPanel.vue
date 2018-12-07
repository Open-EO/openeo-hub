<template>
	<div class="collectionPanel">
		<a class="anchor" :name="collection.name"></a><!-- ToDo: Replace name with id -->
		<h2>{{collection.name}}</h2>

		<div class="summary" v-if="collection.title">
            {{collection.title}}
		</div>

		<div class="backendname">
			<em>{{collection.backend}}</em>
		</div>

		<button v-if="initiallyCollapsed" class="showMoreButton" @click="collapsed = !collapsed">Show {{collapsed ? 'more' : 'less'}}</button>

		<div v-show="!collapsed">

		<div class="description" v-if="collection.description">
			<h3>Description</h3>
			<DescriptionElement :description="collection.description"></DescriptionElement>
		</div>

		<div class="extent">
			<h3>Spatial Extent</h3>
			Bounding Box: North: {{collection.extent.spatial[3]}}, South: {{collection.extent.spatial[1]}}, East: {{collection.extent.spatial[2]}}, West: {{collection.extent.spatial[0]}}
			<l-map style="height:400px" zoom="1" :options="{scrollWheelZoom:false}" v-if="!collapsed /*otherwise the map size is not initiated correctly!*/">
				<l-tile-layer
					url="http://{s}.tile.osm.org/{z}/{x}/{y}.png"
					attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
					:options="{noWrap:true}">
				</l-tile-layer>
				<l-rectangle :bounds="[[collection.extent.spatial[3], collection.extent.spatial[0]], [collection.extent.spatial[1], collection.extent.spatial[2]]]"></l-rectangle>
			</l-map>

			<h3>Temporal Extent</h3>
			{{collection.extent.temporal[0] || 'open'}} &ndash; {{collection.extent.temporal[1] || 'open'}}
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

		<div class="links" v-if="collection.links">
			<h3>See Also</h3>
			<LinkList :links="collection.links"></LinkList>
		</div>

		<div class="retrieved">
			<em>This data was retrieved from the backend server at {{collection.retrieved}}.</em>
		</div>
			
		</div>

	</div>
</template>

<script>
import { DescriptionElement, LinkList } from '@openeo/processes-docgen';
import { LMap, LTileLayer, LRectangle } from 'vue2-leaflet';
import "leaflet/dist/leaflet.css";

export default {
	name: 'CollectionPanel',
	props: ['collection', 'initiallyCollapsed'],
	components: {
		DescriptionElement,
		LinkList,
		LMap,
		LTileLayer,
		LRectangle
	},
	data() {
		return {
			collapsed: this.initiallyCollapsed || false
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