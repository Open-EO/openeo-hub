<template>
	<div id="endpointchooser">
		<ul v-if="categorizedEndpoints">
			<li v-for="(endpoints, category, index) in categorizedEndpoints" :key="category">
				<input type="checkbox" @change="toggleEndpoints(endpoints)" :id="'category'+index">
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
	props: ['endpoints', 'categorizedEndpoints', 'calledOnChange'],
	data() {
		return {
			selectedEndpoints: []
		}
	},
	methods: {
		toggleEndpoints(endpoints) {
			endpoints.forEach(endpoint => {
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
