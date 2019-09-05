<template>
    <section id="exchange">
        <h2>Process Graph Repository</h2>
        
        <h3>Upload yours</h3>
        <p>Upload your process graphs here to share them with fellow openEO users!</p>
        <input v-model="newProcessGraph.title" placeholder="Title">
        <textarea v-model="newProcessGraph.description" placeholder="Description"></textarea>
        <textarea v-model="newProcessGraph.process_graph" placeholder="Process graph as JSON"></textarea>
        <button @click="uploadProcessGraph">Upload</button>

        <h3>What others have shared</h3>
        <p v-if="allProcessGraphs.length > 0">These process graphs have been publicly shared:</p>
        <p v-else>Nothing yet... :( Be the first and use the form above!</p>
        <ol v-if="allProcessGraphs.length > 0">
            <li v-for="(pg, i) in allProcessGraphs" :key="pg.process_graph_id">
                <h4>{{pg.title || 'Untitled'}}</h4>
                <Description v-if="pg.description" :description="pg.description"></Description>
                <div>
                    <pre :class="{expanded: expanded[i]}">{{pg.process_graph}}</pre>
                    <button @click="$set(expanded, i, !expanded[i])">{{expanded[i] ? '▼' : '◀'}}</button>
                </div>
            </li>
        </ol>
    </section>
</template>

<script>
import axios from 'axios';
import { Description } from '@openeo/vue-components';

export default {
	name: 'exchange-section',
	props: ['active'],
	components: {
		Description
	},
	data() {
		return {
			dataComplete: false,
			allProcessGraphs: [],
			newProcessGraph: {
				title: '',
				description: '',
				process_graph: ''  // with snake_case because the openEO API spec uses it
            },
            expanded: {}
		};
	},
	watch: {
		active: function (newVal, oldVal) {
			if(newVal == true && !this.dataComplete) {
				this.getProcessGraphs();
			}
		}
	},
	methods: {
		getProcessGraphs() {
			axios.get('/api/process_graphs')
				.then(response => {
					this.allProcessGraphs = response.data;
					this.dataComplete = true;
				})
				.catch(error => {
					console.log(error);
				});
		},

		uploadProcessGraph() {
			if(this.newProcessGraph.process_graph == '') {
				alert('Please enter a process graph!');
				return;
			}
			axios.post('/api/process_graphs', this.newProcessGraph)
				.then(response => {
					this.getProcessGraphs();
					this.newProcessGraph = {
						title: '',
						description: '',
						process_graph: ''
					}
				})
				.catch(error => {
					console.log(error);
					console.log(error.response);
					alert(error.response.data.message);
				});
		}
	}
}
</script>

<style scoped>
div {
    position: relative;
}
pre {
    margin: 0;
}
pre ~ button {
    position: absolute;
    top: 5px;
    right: 10px;
}
</style>
