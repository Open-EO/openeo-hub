<template>
    <div>
        <h2>Search for collections across all backends <button @click="queryCollections()" class="submitbutton">Submit</button></h2>

        <h3>Name</h3>
        <input v-model="collectionSearch.name" @keyup.enter="queryCollections()"/>
        <em>case-insensitive, regular expression possible</em>

        <h3>Title</h3>
        <input v-model="collectionSearch.title" @keyup.enter="queryCollections()"/>
        <em>case-insensitive, regular expression possible</em>

        <h3>Description</h3>
        <input v-model="collectionSearch.description" @keyup.enter="queryCollections()"/>
        <em>case-insensitive, regular expression possible</em>

		<h3>Full-text search</h3>
        <input v-model="collectionSearch.fulltext" @keyup.enter="queryCollections()"/>
        <em>in name, title and description</em>
		<p><em>Supports word stemming, phrases (in quotes) and negation (prepend a hyphen), but no regular expressions. The search is case- and diacritic-insensitive. By default, search terms are connected with a logical OR &ndash; put terms that MUST appear into quotes.</em></p>

        <h3>Extent</h3>
        <h4>Spatial</h4>
        <em>Specify a bounding box in decimal WGS84 coordinates (e.g. 12.345) or click on the map below.</em>
        <BboxChooser :calledOnChange="setSpatialExtent"></BboxChooser>
        <h4>Temporal</h4>
		<DateRangeChooser v-model="collectionSearch.daterange"></DateRangeChooser>
		<input type="checkbox" v-model="collectionSearch.openEndOnly" id="openEndOnly"><label for="openEndOnly">Only show "open end" collections</label>

        <h3>Actions</h3>
        <button @click="queryCollections()">Submit</button>
    </div>
</template>

<script>
import { OPENEO_V0_3_1_ENDPOINTS } from './../const.js'
import BboxChooser from './BboxChooser.vue';
import DateRangeChooser from './DateRangeChooser.vue';

export default {
	name: 'CollectionSearch',
	components: {
		BboxChooser,
		DateRangeChooser
	},
	data() {
		return {
			collectionSearch: {
				name: '',
				title: '',
				description: '',
				fulltext: '',
				bbox: ['', '', '', ''],
				daterange: [null, null],
				openEndOnly: false
			}
		};
	},
	methods: {
		setSpatialExtent(input) {
			this.collectionSearch.bbox = input;
		},

		queryCollections() {
			var params = {};
			
			// Build `params` object (can't use it directly because empty fields must be removed)
			Object.keys(this.collectionSearch).forEach(key => {
				if(this.collectionSearch[key] != '' && typeof this.collectionSearch[key] != 'object' && key != 'openEndOnly') { // arrays are typeof object too
					params[key] = this.collectionSearch[key];
				}
			});
			if(this.collectionSearch.bbox[0] != '') {
				params.bbox = this.collectionSearch.bbox.map(parseFloat);
			}
			if(this.collectionSearch.daterange[0] != null) {
				params.startdate = this.collectionSearch.daterange[0];
			}
			if(this.collectionSearch.daterange[1] != null) {
				params.enddate = this.collectionSearch.daterange[1];
			}
			if(this.collectionSearch.openEndOnly) {
				// convention in API spec: open date range = end date must be `null`
				// (we can safely overwrite whatever may have already been stored in `enddate` because setting an end date + requesting open end doesn't make sense.
				params.enddate = null;
			}
            
            this.$emit('search-collections', params);
		}
	}
}
</script>

<style>
</style>