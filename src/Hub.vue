<template>
	<div id="container">
		<header>
			<h1>openEO hub</h1>
			<nav>
				<ul>
					<li @click="view = 'discover'" :class="{active: view == 'discover'}" title="Discover">Discover</li>
					<li @click="view = 'search'" :class="{active: view == 'search'}" title="Search">Search</li>
					<li @click="view = 'share'" :class="{active: view == 'share'}" title="Exchange">Exchange</li>
					<li @click="view = 'about'" :class="{active: view == 'about'}" title="About">About</li>
				</ul>
			</nav>
		</header>

		<main>
			
			<!-- Don't use `v-show` for `div`s that may contain Leaflet maps - it would cause the map to be initiated incorrectly. Setting `height:0` etc. (instead of v-show's `display:none`) solves the problem. -->
			<section id="discover" :class="{hidden: view != 'discover'}">
				<p>This is a list of all available openEO backends:</p>
				<ul>
					<li v-for="backend in allBackends" :key="backend.backend">
						<Backend :backend="backend"></Backend>
					</li>
				</ul>
			</section>
			
			<section id="search" :class="{hidden: view != 'search'}">
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

			<section id="results" :class="{hidden: view != 'search'}">
				<nav>
					<ul>
						<li @click="resultPanel = 'backends'" :class="{active: resultPanel == 'backends'}">Backends</li>
						<li @click="resultPanel = 'collections'" :class="{active: resultPanel == 'collections'}">Collections</li>
						<li @click="resultPanel = 'processes'" :class="{active: resultPanel == 'processes'}">Processes</li>
					</ul>
				</nav>

				<div class="panelContainer" v-show="resultPanel == 'collections'">
					<CollectionResults :matchedCollections="matchedCollections" initialInstructionText='Use the "Collections" tab on the left side to compose a search.'></CollectionResults>
				</div>

				<div class="panelContainer" v-show="resultPanel == 'processes'">
					<ProcessResults :matchedProcesses="matchedProcesses" initialInstructionText='Use the "Processes" tab on the left side to compose a search.'></ProcessResults>
				</div>

				<div class="panelContainer" v-show="resultPanel == 'backends'">
					<BackendResults :matchedBackends="matchedBackends" initialInstructionText='Use the "Backends" tab on the left side to compose a search.'></BackendResults>
				</div>
			</section>

			<section id="share" :class="{hidden: view != 'share'}">
				<p>Soon you will be able to upload your process graphs here to share them with fellow openEO users.</p>
			</section>

			<section id="about" :class="{hidden: view != 'about'}">
				<p><strong>openEO hub</strong> is a tool to discover backends that support the openEO API. It is also an exchange platform to share process graphs among the openEO community.</p>
				<p>For more information on openEO, visit the project's homepage: <a href="http://openeo.org/">http://openeo.org/</a></p>
				<p>The source code of this website is available <a href="https://github.com/Open-EO/openeo-hub">on GitHub</a>.</p>
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
import Backend from './components/Backend.vue';
import BackendSearch from './components/BackendSearch.vue';
import BackendResults from './components/BackendResults.vue';
import CollectionSearch from './components/CollectionSearch.vue';
import CollectionResults from './components/CollectionResults.vue';
import ProcessSearch from './components/ProcessSearch.vue';
import ProcessResults from './components/ProcessResults.vue';

export default {
	name: 'openeo-hub',
	components: {
		Backend,
		BackendSearch,
		BackendResults,
		CollectionSearch,
		CollectionResults,
		ProcessSearch,
		ProcessResults
	},
	data() {
		return {
			view: 'discover',
			allBackends: [],
			searchPanel: 'backends',
			resultPanel: 'backends',
			matchedBackends: null,
			matchedCollections: null,
			matchedProcesses: null
		};
	},
	mounted() {
		axios.get('/backends?details=true')
			.then(response => {
				this.allBackends = response.data;
			})
			.catch(error => {
				console.log(error);
			});
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
	border-bottom: 1px dotted #cecbc8;
	padding: 10px;
}
main {
	flex: 1;
	display: flex;
	overflow: hidden;
}
main > section {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	padding-top: 10px;
}
section#search {
	margin-right: 10px;
}
section#results {
	margin-left: 10px;
}
section#discover {
	overflow-y: auto;
}
div.panelContainer {
	overflow: auto;
	padding: 10px;
	padding-top: 0;
}
.hidden {
	height: 0 !important;
	max-width: 0 !important;
	padding: 0 !important;
	margin: 0 !important;
}
div.panelContainer > div {
	padding-bottom: 20px;
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

/* pill-style navigation */
h1 {
	display: inline-block; /* allow nav to start right next to it */
}
header nav {
	display: inline-block;
	margin-left: 100px;
	vertical-align: top;
}
header nav ul {
	margin: 0;
	padding: 0;
}
header nav li {
	display: inline-block;
	list-style: none;
	font-size: 130%;
	padding: 5px 10px;
	margin: 0px 10px;
	/*border: 1px solid black;*/
	border: 1px dotted black;
	border-radius: 10px;
	cursor: pointer;
	text-align: center;
}
header nav li:hover {
	border: 1px solid black;
}
header nav li.active {
	/*background-color: #e8e5e2;*/
	border: 3px solid black;
	font-weight: bold;
}
header nav li::after {
	/* make un-bold text take up as much space as bold text so it doesn't jump when it becomes active */
    display: block;
    content: attr(title);
    font-weight: bold;
    height: 0;
    overflow: hidden;
    visibility: hidden;
}

/* tab-style navigation in search+results panels */
main nav {
	border-bottom: 1px solid black;
	padding-left: 20px;
}
main nav ul {
	margin: 0;
	padding: 0;
}
main nav li {
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
main nav li.active {
	border-bottom: 1px solid white;
	background-color: white;
}

/* sections without tab-style navigation */
#discover,
#share,
#about {
	padding-left: 20px;
}
#discover p,
#share p,
#about p {
	margin: 10px 0;
}
#discover p:first-child,
#share p:first-child,
#about p:first-child {
	margin-top: 0;
}
#discover > p:last-of-type {
	margin-bottom: 30px;
}


/* discover section */
#discover > ul > li {
	list-style: none;
	max-width: 50em;
}
#discover > ul > li + li {
	margin-top: 30px;
	border-top: 1px solid black;
	padding-top: 30px;
}

/* search section */
#search h3 {
	margin-top: 10px;
}
#endpointchooser {
	width: 90%;
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
#results h4, #discover h4,
#results h5, #discover h5 {
	font-size: 100%;
	margin-top: 10px;
}
.process h4 code {  /* otherwise param names appear really small */
	font-size: 125%;
}
#results .emptyNotice {
	margin-left: 20px;
}
ol.searchresults > li { /* with "direct child" selectors so that it doesn't affect `li`s of other lists further down */
	margin-bottom: 20px;
}
.backend dd,
.collection dd {
	margin-bottom: 10px;
}
.backend dd > ul,
.collection dd > ul {
	padding-left: 15px;
}
.process {
	margin: 0;
}
.process h2,
.process h3,
.collection h2,
.collection h3 {
	font-size: 100%;
	margin-top: 10px;
}
.collection + .collection,
.collectionParent + .collectionParent,
.process + .process,
.processParent + .processParent {
	/* margin between neighbouring panels */
	margin-top: 30px;
}

/* Panels */
div:not(.collection):not(.process) > h2 { /* all normal `h2`s, but not the ones that are part of the `Process` */
	position: sticky;
	top: 0;
	z-index: 2000; /* would lie under Leaflet map (500), attribution layer (800) or corner boxes (1000) if less */
	background-color: white;
	margin-top: 0;
	padding-top: 10px;
	padding-bottom: 10px;
	border-bottom: 1px dotted #cecbc8;
}
.collection,
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
