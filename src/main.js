import Vue from 'vue';
import Hub from './Hub.vue';

window.App = new Vue({
	render: h => h(Hub)
}).$mount('#app');
