<template>
	<div class="collectionPanel">
		<a class="anchor" :name="collection.name"></a><!-- ToDo: Replace name with id -->
		<h2>{{collection.name}}</h2>

		<div class="summary" v-if="collection.title">
            {{collection.title}}
		</div>

		<div class="backendname">
			<em>{{collection.backend}}</em>
		</div>

		<div class="description" v-if="collection.description">
			<h3>Description</h3>
			<DescriptionElement :description="collection.description"></DescriptionElement>
		</div>

		<div class="metadata">
			<h3>Metadata</h3>
            <dl v-if="getNonTrivialMetadataKeys(collection).length > 0">
                <div v-for="key in getNonTrivialMetadataKeys(collection)" :key="key">
                    <dt>{{key}}</dt>
                    <dd>{{collection[key]}}</dd>
                </div>
			</dl>
            <p v-if="getNonTrivialMetadataKeys(collection).length === 0">This collection has no further metadata.</p>
		</div>

		<div class="links" v-if="collection.links">
			<h3>See Also</h3>
			<LinkList :links="collection.links"></LinkList>
		</div>

		<div class="retrieved">
			<em>This data was retrieved from the backend server at {{collection.retrieved}}.</em>
		</div>
			
	</div>
</template>

<script>
import { DescriptionElement, LinkList } from '@openeo/processes-docgen';

export default {
	name: 'CollectionPanel',
	props: ['collection'],
	components: {
		DescriptionElement,
		LinkList
    },
    methods: {
        getNonTrivialMetadataKeys(collection) {
            return Object.keys(collection).filter(k => ['name', 'title', 'description', 'links', 'backend', 'retrieved'].indexOf(k) == -1)
        }
    }
}
</script>

<style>
</style>