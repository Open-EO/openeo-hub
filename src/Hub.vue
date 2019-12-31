<template>
	<div id="container">
		<header>
			<h1>openEO Hub</h1>
			<nav>
				<ul>
					<li @click="view = 'discover'" :class="{active: view == 'discover'}" title="Discover">Discover</li>
					<li @click="view = 'exchange'" :class="{active: view == 'exchange'}" title="Exchange">Exchange</li>
					<li @click="view = 'about'" :class="{active: view == 'about'}" title="About">About</li>
				</ul>
			</nav>
		</header>

		<main>
			<!-- Don't use `v-show` for `div`s that may contain Leaflet maps - it would cause the map to be initiated incorrectly. Setting `height:0` etc. (instead of v-show's `display:none`) solves the problem. -->
			<DiscoverSection :class="{hidden: view != 'discover', wrapper: 1}"></DiscoverSection>
			<ExchangeSection :class="{hidden: view != 'exchange'}" :active="view == 'exchange'"></ExchangeSection>
			<AboutSection :class="{hidden: view != 'about'}"></AboutSection>
		</main>

		<footer>
			This is <strong>openEO Hub</strong>, a discovery and exchange platform for the <a href="http://openeo.org/">openEO</a> community.
		</footer>
	</div>
</template>

<script>
import AboutSection from './components/AboutSection.vue';
import DiscoverSection from './components/DiscoverSection.vue';
import ExchangeSection from './components/ExchangeSection.vue';

export default {
	name: 'openeo-hub',
	components: {
		AboutSection,
		DiscoverSection,
		ExchangeSection
	},
	data() {
		return {
			view: 'discover',
		};
	}
}
</script>

<style>
/* normalize browser standards */
body {
	margin: 0;
	font-family: sans-serif;
}
body.loading {
	cursor: wait;
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
main > section,
main > section > section {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	padding: 10px;
}
section#discover-filters {
	display: block;
}
main > section,
main > section > section:first-of-type {
	padding-left: 20px;
}
main > section.wrapper {
	flex-direction: row;
	padding: 0px;
}
main > section.tabbedContent > section {
	padding: 0px;
	padding-top: 10px;
}
main > section.tabbedContent > section:not(:last-child) {
	margin-right: 20px;
}
main > section:not(.tabbedContent),
main > section:not(.tabbedContent) > section {
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

/* sections without tab-style navigation */
main > section:not(.tabbedContent) p {
	margin: 10px 0;
}
main > section:not(.tabbedContent) p:first-child {
	margin-top: 0;
}

/* discover section */
#discover-list > p:last-of-type {
	margin-bottom: 30px;
}
#discover-list > ul > li {
	list-style: none;
	max-width: 50em;
}
#discover-list > ul > li + li {
	margin-top: 30px;
	border-top: 1px solid black;
	padding-top: 30px;
}

/* endpoint chooser */
.endpointchooser {
	width: 90%;
	padding: 5px;
	border: 1px solid #cecbc8;
}
.endpointchooser.compact {
	max-height: 5em;
	overflow: auto;
}

/* discover section cont. */
#discover h3 {
	margin-bottom: 10px;
}
#discover-filters h4 {
	margin-bottom: 10px;
}
#discover-filters h4:not(:first-of-type) {
	margin-top: 20px;
}
#discover-list h4,
#discover-list h5 {
	font-size: 100%;
	margin-top: 10px;
}
/* overriding CSS of external components */
.process h4 code {  /* otherwise param names appear really small */
	font-size: 125%;
}
.backend dd {
	margin-bottom: 10px;
}
.backend dd > ul {
	padding-left: 15px;
}
.process {
	margin: 0;
}
.process h2,
.process h3,
.collection h2,
.collection h3,
.plan h2 {
	font-size: 100%;
	margin-top: 10px;
}
.collection + .collection,
.process + .process {
	/* margin between neighbouring panels */
	margin-top: 30px;
}

.billing p {
	margin-top: 10px;
}

/* Exchange section */
#exchange div {
	display: flex;
	flex-direction: column;
}
#exchange input {
	max-width: 500px;
}
#exchange textarea {
	max-width: 1000px;
	min-height: 100px;
}
#exchange textarea ~ textarea {
	min-height: 200px;
}
#exchange button {
	max-width: 100px;
	flex-shrink: 0;
}
#exchange h3 {
	margin-top: 20px;
}
#exchange li div {
	max-width: 1000px;
	margin-bottom: 10px;
}
#exchange pre {
	background-color: #ececec;
	border: 1px solid darkgray;
	overflow: auto;
	padding: 5px;
}
#exchange pre:not(.expanded) {
	max-height: 120px;
}

/* Panels */
.panelContainer > div > h2 { /* headings of the tabs */
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
.hasTooltip {  /* do NOT use `*[title]` as selector because not *all* elements that have tooltips should display the special cursor */
	cursor: help;
}
.warningSign {
	color: goldenrod;
}
.backendname {
	margin: 10px 0;
}
h3 .backendname {
	display: inline;
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
</style>
