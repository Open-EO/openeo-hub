<template>
    <div>
        <h2>Search for collections across all backends</h2>

        <h3>Name</h3>
        <input v-model="collectionSearch.name" />
        <em>case-insensitive, regular expressions possible</em>

        <h3>Title</h3>
        <input v-model="collectionSearch.title" />
        <em>case-insensitive, regular expression possible</em>

        <h3>Description</h3>
        <input v-model="collectionSearch.description" />
        <em>case-insensitive, regular expression possible</em>

        <h3>Extent</h3>
        <h4>Spatial</h4>
        <em>Specify a bounding box in decimal WGS84 coordinates (e.g. 12.345) or click on the map below.</em>
        <BboxChooser :calledOnChange="setSpatialExtent"></BboxChooser>
        <h4>Temporal</h4>
        <em>From</em>
        <input v-model="collectionSearch.extent.temporal[0]" placeholder="YYYY-MM-DDThh:mm:ssZ"/>
        <em>until</em>
        <input v-model="collectionSearch.extent.temporal[1]" placeholder="YYYY-MM-DDThh:mm:ssZ"/>
        <em>(inclusive)</em>
        <p><em>Use <a href="https://www.ietf.org/rfc/rfc3339">RFC 3339</a> date-times (format: YYYY-MM-DDThh:mm:ssZ)</em></p>

        <h3>Actions</h3>
        <button @click="queryCollections()">Submit</button>
    </div>
</template>

<script>
import { OPENEO_V0_3_1_ENDPOINTS } from './../const.js'
import BboxChooser from './BboxChooser.vue';

export default {
	name: 'CollectionSearch',
	components: {
		BboxChooser
	},
	data() {
		return {
			collectionSearch: {
				name: '',
				title: '',
				description: '',
				extent: {
					spatial: ['', '', '', ''],
					temporal: ['', '']
				}
			}
		};
	},
	methods: {
		setSpatialExtent(input) {
			this.collectionSearch.extent.spatial = input;
		},

		queryCollections() {
			var params = {};
			
			// Build `params` object (can't use it directly because empty fields must be removed)
			Object.keys(this.collectionSearch).forEach(key => {
				if(this.collectionSearch[key] != '' && typeof this.collectionSearch[key] != 'object') {
					params[key] = this.collectionSearch[key];
				}
			});
			if(this.collectionSearch.extent.spatial[0] != '') {
				params.extent = {};
				params.extent.spatial = [];
				for(var i=0; i<=3; i++) {
					params.extent.spatial.push(parseFloat(this.collectionSearch.extent.spatial[i]));
				}
			}
			if(this.collectionSearch.extent.temporal[0] != '') {
				params.extent = params.extent || {};
				params.extent.temporal = [this.collectionSearch.extent.temporal[0], this.collectionSearch.extent.temporal[1]];
            }
            
            this.$emit('search-collections', params);
		}
	}
}
</script>

<style>
</style>