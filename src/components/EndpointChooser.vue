<template>
	<div class="endpointchooser">
		<ul v-if="categorizedEndpoints">
			<li v-for="(endpointObject, category, index) in categorizedEndpoints" :key="category">
				<input type="checkbox" @change="toggleEndpoints(endpointObject)" :id="'category'+index">
				<label :for="'category'+index">{{category}}</label>
			</li>
		</ul>
		<ul v-if="endpoints && !categorizedEndpoints"> <!-- display either categorized XOR uncategorized list (if both props are given, `categorized` has priority) -->
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
	props: ['endpoints', 'categorizedEndpoints'],
	data() {
		return {
			selectedEndpoints: []
		}
	},
	methods: {
		toggleEndpoints(endpointObject) {
			var endpointArray = Object.keys(endpointObject);
			endpointArray.forEach(endpoint => {
				const index = this.selectedEndpoints.indexOf(endpoint);
				if(index == -1) {
					this.selectedEndpoints.push(endpoint);
				} else {
					this.selectedEndpoints.splice(index, 1);
				}
			});
			this.returnState();
		},
		returnState() {
			this.$emit('input', this.selectedEndpoints);
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
