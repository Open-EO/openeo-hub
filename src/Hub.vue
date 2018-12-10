<template>
	<div id="container">
		<header>
			<h1>openEO hub</h1>
		</header>

		<main>
			
			<section id="search">
				<nav>
					<ul>
						<li @click="searchPanel = 'backends'" :class="{active: searchPanel == 'backends'}">Backends</li>
						<li @click="searchPanel = 'collections'" :class="{active: searchPanel == 'collections'}">Collections</li>
						<li @click="searchPanel = 'processes'" :class="{active: searchPanel == 'processes'}">Processes</li>
					</ul>
				</nav>

				<div class="panelContainer" :class="{hidden: searchPanel != 'collections'} /* Don't use `v-show` for div that contains a Leaflet map - it would cause the map to be initiated incorrectly. Setting `height:0` (instead of v-show's `display:none`) solves the problem.*/">
					<CollectionSearch @search-collections="queryCollections"></CollectionSearch>
				</div>

				<div class="panelContainer" v-show="searchPanel == 'processes'">
					<ProcessSearch @search-processes="queryProcesses"></ProcessSearch>
				</div>
				
				<div class="panelContainer" v-show="searchPanel == 'backends'">
					<BackendSearch @search-backends="queryBackends"></BackendSearch>
				</div>
			</section>

			<section id="results">
				<nav>
					<ul>
						<li @click="resultPanel = 'backends'" :class="{active: resultPanel == 'backends'}">Backends</li>
						<li @click="resultPanel = 'collections'" :class="{active: resultPanel == 'collections'}">Collections</li>
						<li @click="resultPanel = 'processes'" :class="{active: resultPanel == 'processes'}">Processes</li>
					</ul>
				</nav>

				<div class="panelContainer" v-show="resultPanel == 'collections'">
					<CollectionResults :matchedCollections="matchedCollections"></CollectionResults>
				</div>

				<div class="panelContainer" v-show="resultPanel == 'processes'">
					<ProcessResults :matchedProcesses="matchedProcesses"></ProcessResults>
				</div>

				<div class="panelContainer" v-show="resultPanel == 'backends'">
					<BackendResults :matchedBackends="matchedBackends"></BackendResults>
				</div>
			</section>

		</main>

		<footer>
			This is <strong>openEO hub</strong>, a discovery and exchange platform for the <a href="http://openeo.org/">openEO</a> community.
		</footer>
	</div>
</template>

<script>
import Vue from 'vue';
import axios from 'axios';
import BackendSearch from './components/BackendSearch.vue';
import BackendResults from './components/BackendResults.vue';
import CollectionSearch from './components/CollectionSearch.vue';
import CollectionResults from './components/CollectionResults.vue';
import ProcessSearch from './components/ProcessSearch.vue';
import ProcessResults from './components/ProcessResults.vue';

export default {
	name: 'openeo-hub',
	components: {
		BackendSearch,
		BackendResults,
		CollectionSearch,
		CollectionResults,
		ProcessSearch,
		ProcessResults
	},
	data() {
		return {
			searchPanel: 'backends',
			resultPanel: 'backends',
			matchedBackends: [],
			matchedCollections: [],
			matchedProcesses: []
		};
	},
	methods: {
		queryBackends(params) {
			axios.post('/backends/search', params)
				.then(response => {
					this.matchedBackends = response.data;
					this.resultPanel = 'backends';
				})
				.catch(error => {
					console.log(error);
				});
		},

		queryCollections(params) {
			axios.post('/collections/search', params)
				.then(response => {
					this.matchedCollections = response.data;
					this.resultPanel = 'collections';
				})
				.catch(error => {
					console.log(error);
				});
		},

		queryProcesses(params) {
			axios.post('/processes/search', params)
				.then(response => {
					this.matchedProcesses = response.data;
					this.resultPanel = 'processes';
				})
				.catch(error => {
					console.log(error);
				});
		}
	}
}
</script>

<style>
/* normalize browser standards */
body {
	margin: 0;
	font-family: sans-serif;
}
h1, h2, h3, h4, h5, h6 {
	margin: 0;
}
ul, ol {
	margin-bottom: 0;
	margin-top: 0;
	padding-bottom: 0;
	padding-top: 0;
}

/* general layout */
html, body, #app, #container {
	height: 100vh;
}
#container {
	display: flex;
	flex-direction: column;
}
header {
	padding: 10px;
}
main {
	flex: 1;
	display: flex;
	overflow: hidden;
}
section {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}
section:first-child {
	margin-right: 10px;
}
section:last-child {
	margin-left: 10px;
}
div.panelContainer {
	overflow: auto;
	padding: 10px;
	padding-top: 0;
}
div.panelContainer.hidden {
	height: 0;
	padding: 0;
}
footer {
	border-top: 1px dotted #cecbc8;
	padding: 10px;
	text-align: center;
}

/* own standards */
h2 {
	margin-top: 10px;
}
a {
	color: #2F649A;
	text-decoration: none;
	cursor: pointer;
}
a:hover {
	color: black;
}
button {
	margin: 1px;
}
label {
	padding-left: 3px;
	margin-right: 10px;
}
input[type='radio'],
input[type='checkbox'] {
	vertical-align: bottom;
}

/* tab-style navigation */
nav {
	border-bottom: 1px solid black;
	padding-left: 20px;
}
nav ul {
	margin: 0;
	padding: 0;
}
nav li {
	display: inline-block;
	list-style: none;
	font-size: 120%;
	font-weight: bold;
	border: 1px solid black;
	padding: 5px 10px;
	margin-left: -1px;
	margin-bottom: -1px;
	cursor: pointer;
	background-color: #e8e5e2;
}
nav li.active {
	border-bottom: 1px solid white;
	background-color: white;
}

/* search section */
#search h3 {
	margin-top: 10px;
}
#endpointchooser {
	/*column-count: 4;*/
	height: 100px;
	width: 90%;
	overflow-y: scroll;
	padding: 5px;
	border: 1px solid #cecbc8;
}
#search textarea {
	width: 90%;
	height: 100px;
	padding: 5px;
}
#search input + em,
#search em + input {
	margin-left: 5px;
}
#search p {
	margin-top: 0;
}
#search .submitbutton {
	float: right;
}

/* results section */
#results h2,
#results h3 {
	margin-bottom: 10px;
}
#results h3,
#results h4,
#results h5 {
	font-size: 100%;
	margin-top: 10px;
}
#results h4 code {  /* otherwise param names appear really small */
	font-size: 125%;
}
#results .emptyNotice {
	margin-left: 20px;
}
#results output > ol > li { /* with "direct child" selectors so that it doesn't affect `li`s of other lists further down */
	margin-bottom: 20px;
}
#results dd {
	margin-bottom: 10px;
}
#results dd > ul {
	padding-left: 15px;
}
#results .process {
	margin: 0;
}
#results .process h2,
#results .process h3,
#results .collectionPanel h2,
#results .collectionPanel h3 {
	font-size: 100%;
	margin-top: 10px;
}
#results .collectionPanel + .collectionPanel,
#results .collectionPanelParent + .collectionPanelParent,
#results .process + .process,
#results .processParent + .processParent {
	/* margin between neighbouring panels */
	margin-top: 30px;
}

/* Panels */
div:not(.collectionPanel):not(.process) > h2 { /* all normal `h2`s, but not the ones that are part of the `Process` */
	position: sticky;
	top: 0;
	z-index: 2000; /* would lie under Leaflet map (500), attribution layer (800) or corner boxes (1000) if less */
	background-color: white;
	margin-top: 0;
	padding-top: 10px;
	padding-bottom: 10px;
	border-bottom: 1px dotted #cecbc8;
}
.collectionPanel,
.process {
	/* set `position` because... */
	position: relative;
}
.show-more-button {
	/* ...the "show more/less" button is aligned to it with `position:absolute` */
	position: absolute;
	top: 0;
	right: 0;
}
.backendname {
	margin: 10px 0;
}
.retrieved {
	margin-top: 20px;
	margin-bottom: 10px;
}
.signature .process-name,
.signature .param-name {  /* mild syntax highlighting */
	font-weight: bold;
}
.process td {
	vertical-align: top;
	padding: 5px;
}
h4 + .details { /* indent content below parameter heading */
	margin-left: 20px;
}
.schemaObjectElement table {
	border-collapse: collapse;
}
.schemaObjectElement th {
	font-weight: normal;
}
.schemaObjectElement th[colspan="2"] {  /* center "subheadings" in tables */
	text-align: center;
}
.schemaObjectElement .propKey {  /* don't allow line break between param name and "required asterisk" */
	white-space: nowrap;
}
.schemaObjectElement table p {
	margin: 0;
}
.schemaObjectElement table td:not(:first-child) table {  /* make nested tables stand out so it's easy to see what belongs together */
	border-left: 5px solid lightgray;
}
</style>
