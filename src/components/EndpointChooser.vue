<template>
	<div id="endpointchooser">
		<ul>
			<li v-for="(endpoint, index) in endpoints" :key="endpoint">
				<input type="checkbox" :value="endpoint" v-model="selectedEndpoints" @change="returnState()" :id="'endpoint'+index">
				<label :for="'endpoint'+index">{{endpoint}}</label>
			</li>
		</ul>
	</div>
</template>

<script>
export default {
	name: 'EndpointChooser',
	props: ['endpoints', 'calledOnChange'],
	data() {
		return {
			selectedEndpoints: []
		}
	},
	methods: {
		returnState() {
			this.calledOnChange(this.selectedEndpoints);
		}
	}
}
</script>

<style scoped>
	ul {
		padding: 0;
	}
	li {
		list-style: none;
	}
</style>
