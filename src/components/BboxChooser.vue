<template>
	<div class="bboxchooser">
		<input @change="returnState()" v-model="north" />
		<input @change="returnState()" v-model="west" />
		<input @change="returnState()" v-model="east" />
		<input @change="returnState()" v-model="south" />
	</div>
</template>

<script>
export default {
	name: 'BboxChooser',
	props: ['calledOnChange'],
	data() {
		return {
			north: '',
			south: '',
			east: '',
			west: ''
		}
	},
	methods: {
		returnState() {
			this.calledOnChange([this.west, this.south, this.east, this.north]);
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
