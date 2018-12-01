<template>
    <div>
        <h2>Search for processes across all backends</h2>

        <h3>Name</h3>
        <input v-model="processSearch.name" />
        <em>case-insensitive, regular expression possible</em>

        <h3>Summary</h3>
        <input v-model="processSearch.summary" />
        <em>case-insensitive, regular expression possible</em>

        <h3>Description</h3>
        <input v-model="processSearch.description" />
        <em>case-insensitive, regular expression possible</em>

        <h3>Deprecation</h3>
        <input type="checkbox" v-model="processSearch.excludeDeprecated" id="excludeDeprecated">
        <label for="excludeDeprecated">Exclude processes that are deprecated</label>
        
        <h3>Parameters</h3>
        <h4>Names</h4>
        <textarea v-model="processSearch.parameterNames" placeholder="Specify parameter names (case-insensitive, regular expression possible), each on a new line"></textarea>
        <h4>Descriptions</h4>
        <textarea v-model="processSearch.parameterDescriptions" placeholder="Specify parameter description search terms (case-insensitive, regular expression possible), each on a new line"></textarea>

        <h3>Actions</h3>
        <button @click="queryProcesses()">Submit</button>
    </div>
</template>

<script>
export default {
	name: 'ProcessSearch',
	data() {
		return {
			processSearch: {
				name: '',
				summary: '',
				description: '',
				excludeDeprecated: true,
				parameterNames: '',
				parameterDescriptions: ''
			}
		};
	},
	methods: {
		queryProcesses() {
			var params = {};
			
			// Build `params` object (can't use it directly because empty fields must be removed)
			Object.keys(this.processSearch).forEach(key => {
				if(this.processSearch[key] != '' || this.processSearch[key] != false) {
					if(key.indexOf('parameter') == 0) {
						params[key] = this.processSearch[key].split("\n");
					} else {
						params[key] = this.processSearch[key];
					}
				}
			});
            
            this.$emit('search-processes', params);
		}
	}
}
</script>

<style>
</style>