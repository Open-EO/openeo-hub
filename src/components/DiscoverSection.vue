<template>
    <section id="discover">
		<section id="discover-list">
			<p>This is a list of all available openEO backends:</p>
			<ul>
				<li v-for="group in allBackendGroups" :key="group.name">
					<BackendGroup :groupName="group.name" :backends="group.backends"></BackendGroup>
				</li>
			</ul>
		</section>

		<section id="discover-filter">
			<p>Filter here:</p>
		</section>
    </section>
</template>

<script>
import axios from 'axios';
import BackendGroup from './BackendGroup.vue';

export default {
	name: 'discover-section',
	components: {
		BackendGroup
	},
	data() {
		return {
			allBackendGroups: [],
		};
	},
	mounted() {
		axios.get('/backends?details=grouped')
			.then(response => {
				this.allBackendGroups = response.data;
				this.allBackendGroups.sort((a, b) => {
					return a.name > b.name;  // ascending by name
				}).map(e => e.backends.sort((a, b) => {
					var aVersion = (a.api_version || a.version || "0.0.0").split('.');
					var bVersion = (b.api_version || b.version || "0.0.0").split('.');
					if (aVersion[0] > bVersion[0]) {  // descending by version, first look at major part
						return -1;
					}
					else if (aVersion[0] < bVersion[0]) {
						return 1;
					}
					else if (aVersion[1] > bVersion[1]) {  // if equal: by minor part
						return -1;
					}
					else if (aVersion[1] < bVersion[1]) {
						return 1;
					}
					else if (aVersion[2] > bVersion[2]) {  // if still equal: by patch part
						return -1;
					}
					else {
						return 1;
					}
				}));
			})
			.catch(error => {
				console.log(error);
			});
	}
}
</script>

<style scoped>
</style>
