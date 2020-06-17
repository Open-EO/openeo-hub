<template>
	<div id="container">
		<header>
			<a href="/">
				<img src="https://openeo.org/images/openeo_navbar_logo.png" alt="openEO logo" class="logo">
				<h1>openEO Hub</h1>
			</a>
			<nav>
				<ul>
					<li @click="view = 'discover'" :class="{active: view == 'discover'}" title="Discover">Discover</li>
					<!--
					<li @click="view = 'exchange'" :class="{active: view == 'exchange'}" title="Exchange">Exchange</li>
					-->
					<li @click="view = 'about'" :class="{active: view == 'about'}" title="About">About</li>
					<li><a href="https://openeo.org/">openeo.org <!-- external link icon: --> <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" x="0px" y="0px" viewBox="0 0 100 100" width="15" height="15"><path fill="currentColor" d="M18.8,85.1h56l0,0c2.2,0,4-1.8,4-4v-32h-8v28h-48v-48h28v-8h-32l0,0c-2.2,0-4,1.8-4,4v56C14.8,83.3,16.6,85.1,18.8,85.1z"></path> <polygon fill="currentColor" points="45.7,48.7 51.3,54.3 77.2,28.5 77.2,37.2 85.2,37.2 85.2,14.9 62.8,14.9 62.8,22.9 71.5,22.9"></polygon></svg> <!-- end external link icon--> </a></li>
				</ul>
			</nav>
		</header>

		<main>
			<!-- Don't use `v-show` for `div`s that may contain Leaflet maps - it would cause the map to be initiated incorrectly. Setting `height:0` etc. (instead of v-show's `display:none`) solves the problem. -->
			<DiscoverSection :class="{hidden: view != 'discover', wrapper: 1}"></DiscoverSection>
			<!-- disabled for now
			<ExchangeSection :class="{hidden: view != 'exchange'}" :active="view == 'exchange'"></ExchangeSection>
			-->
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
	/* copied from openeo.org website: mainly keeps system fonts, falls back to sans-serif if nothing else matches (see #40) */
	font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Fira Sans,Droid Sans,Helvetica Neue,sans-serif;
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
	/* copied from openeo.org website */
	background-color: #fff;
	border-bottom: 1px solid #eaecef;
	padding: .7rem 1.5rem
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
	display: flex;
	flex-direction: column;
}
main > section,
main > section > section:first-of-type {
	padding-left: 20px;
}
main > section.wrapper {
	flex-direction: row;
	padding: 0px;
}
main > section,
main > section > section {
	overflow-y: auto;
}
.hidden {
	height: 0 !important;
	max-width: 0 !important;
	padding: 0 !important;
	margin: 0 !important;
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

/* navigation */
header h1 {
	display: inline-block; /* allow nav to start right next to it */
	color: #2c3e50; /* copied from openeo.org website */
	font-size: 20px;
	vertical-align: middle;
}
header img.logo {
	width: 42px;
	margin-right: 15px;
	vertical-align: middle;
}
header nav {
	display: inline-block;
	position: absolute;
	right: 0;
	top: 17px;
	margin-left: 100px;
	vertical-align: middle;
}
header nav ul {
	margin: 0;
	padding: 0;
}
header nav li {
	display: inline-block;
	list-style: none;
	color: #2c3e50;   /* copied from openeo.org website */
	font-weight: 500;   /* copied from openeo.org website */
	font-size: 17px;
	margin: 0px 15px;
	cursor: pointer;
	text-align: center;
}
header nav li:hover,
header nav li.active {
	border-bottom: 2px solid #2a89cc;   /* copied from openeo.org website */
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
header nav li a {
	color: #2c3e50;   /* copied from openeo.org website */
}
header nav li a svg {
	color: #aaa;   /* copied from openeo.org website */
}

/* sections */
main > section p {
	margin: 10px 0;
}
main > section p:first-child {
	margin-top: 0;
}

/* discover section */
#discover-list {
	flex: 2 1 60%;
}
#discover-filters {
	flex: 1 1 40%;
	border-left: 1px dotted #cecbc8;
}
#discover-list > ul > li {
	list-style: none;
	margin-top: 15px;
}
#discover-list > ul > li > div:not(.collapsed) {
	padding-bottom: 15px;
}
#discover-list > ul > li + li {
	/* border-top: 1px solid black; */
}
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

/* endpoint chooser */
.endpointchooser {
	padding: 5px;
	border: 1px solid #cecbc8;
}
.endpointchooser.compact {
	flex-shrink: 1;
	min-height: 3em;
	overflow: auto;
}

/* overriding CSS of external components */
.process h4 code {  /* otherwise param names appear really small */
	font-size: 125%;
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

/* Various */
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
