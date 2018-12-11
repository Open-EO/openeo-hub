<template>
    <div>
        <h2>Search for processes across all backends <button @click="queryProcesses()" class="submitbutton">Submit</button></h2>

        <h3>Name</h3>
        <input v-model="processSearch.name" @keyup.enter="queryProcesses()"/>
        <em>case-insensitive, regular expression possible</em>

        <h3>Summary</h3>
        <input v-model="processSearch.summary" @keyup.enter="queryProcesses()"/>
        <em>case-insensitive, regular expression possible</em>

        <h3>Description</h3>
        <input v-model="processSearch.description" @keyup.enter="queryProcesses()"/>
        <em>case-insensitive, regular expression possible</em>

		<h3>Full-text search</h3>
        <input v-model="processSearch.fulltext" @keyup.enter="queryProcesses()"/>
        <em>in name, summary, description, param names and descriptions</em>
		<p><em>Supports word stemming, phrases (in quotes) and negation (prepend a hyphen), but no regular expressions. The search is case- and diacritic-insensitive. By default, search terms are connected with a logical OR &ndash; put terms that MUST appear into quotes.</em></p>

        <h3>Deprecation</h3>
        <input type="checkbox" v-model="processSearch.excludeDeprecated" id="excludeDeprecated">
        <label for="excludeDeprecated">Exclude processes that are deprecated</label>
        
        <h3>Parameters</h3>
        <h4>Names</h4>
        <textarea v-model="processSearch.parameterNames" placeholder="Specify parameter names (case-insensitive, regular expression possible), each on a new line"></textarea>
        <h4>Descriptions</h4>
        <textarea v-model="processSearch.parameterDescriptions" placeholder="Specify parameter description search terms (case-insensitive, regular expression possible), each on a new line"></textarea>
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
				fulltext: '',
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