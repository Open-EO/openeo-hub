<template>
	<div class="bboxchooser">
		<input @change="returnState()" v-model="north" placeholder="North" />
		<input @change="returnState()" v-model="west"  placeholder="West"/>
		<input @change="returnState()" v-model="east"  placeholder="East"/>
		<input @change="returnState()" v-model="south"  placeholder="South"/>
		<l-map style="height:400px" :zoom="4" :center="[50,10]" @click="mapClickToBbox">
			<l-tile-layer
				url="http://{s}.tile.osm.org/{z}/{x}/{y}.png"
				attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'>
			</l-tile-layer>
			<l-rectangle :bounds="[[north, west], [south, east]]"></l-rectangle>
		</l-map>
		<em>First click on the map = set north-west corner of bbox, second click = set south-east corner.</em>
	</div>
</template>

<script>
import { LMap, LTileLayer, LRectangle } from 'vue2-leaflet';
import "leaflet/dist/leaflet.css";

export default {
	name: 'BboxChooser',
	props: ['calledOnChange'],
	components: {
		LMap,
		LTileLayer,
		LRectangle
	},
	data() {
		return {
			north: '',
			south: '',
			east: '',
			west: '',
			lastClickWasNorthWest: false
		}
	},
	methods: {
		returnState() {
			this.calledOnChange([this.west, this.south, this.east, this.north]);
		},
		mapClickToBbox(event) {
			if(this.lastClickWasNorthWest) {
				this.south = event.latlng.lat;
				this.east = event.latlng.lng;
				this.lastClickWasNorthWest = false;
			} else {
				this.north = event.latlng.lat;
				this.west = event.latlng.lng;
				this.lastClickWasNorthWest = true;
			}
			this.returnState();
		}
	}
}
</script>

<style>
	.bboxchooser input {
		display: block;
		margin: 0 auto;
	}
	.bboxchooser input:nth-child(2) {
		float: left;
	}
	.bboxchooser input:nth-child(3) {
		float: right;
	}
	.bboxchooser input:nth-child(4) {
		clear: both;
	}
</style>
