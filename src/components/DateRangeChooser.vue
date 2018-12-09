<template>
	<div class="daterangechooser">        
        <p><em>Specify a start date, end date or time interval that the collection must contain. Uses <a href="https://www.ietf.org/rfc/rfc3339">RFC 3339</a> format, i.e. YYYY-MM-DD.</em></p>
        <div class="daterangechooser-main">
            <DateChooser v-model="value[0]" label="From"></DateChooser>
            <DateChooser v-model="value[1]" label="until"></DateChooser>
        </div>
	</div>
</template>

<script>
import DateChooser from './DateChooser.vue';

export default {
    name: 'DateRangeChooser',
    components: {
        DateChooser
    },
    props: ['value'], // enable use of `v-model` directive
    watch: {
        state: function(newVal, oldVal) {
            // enable use of `v-model` directive
            this.$emit('input', this.state);
        }
    }
}
</script>

<style scoped>
	.daterangechooser-main {
		display: flex;
        justify-content: space-evenly;
        flex-wrap: wrap; /* responsiveness: allow to display each DateChooser on its own line if page isn't wide enough to show them next to each other */
	}
</style>
