<template>
    <section id="about">
		<p><strong>openEO Hub</strong> is a tool to discover Earth Observation cloud processing services that support the <a href="https://github.com/Open-EO/openeo-api">openEO API</a>. <!-- It is also an exchange platform to share process graphs among the openEO community. --> For more information on openEO, visit the project's homepage: <a href="https://openeo.org/">https://openeo.org/</a></p>
		<p>Please note: The data is crawled from the services and then cached, so may lag behind reality.</p>
		<p>The source code of this website is available <a href="https://github.com/Open-EO/openeo-hub">on GitHub</a>.</p>
		<p>If you want to add a service to this index, please open a pull request on GitHub that edits <a href="https://github.com/Open-EO/openeo-hub/blob/master/config.json">the config.json file</a> accordingly. We will then review and merge it and after a quick redeployment the crawler will index your service too. Any newcomers are very welcome!</p>
	</section>
</template>

<style scoped>
	section {
		margin: 50px auto;
		max-width: 800px;
	}
</style>