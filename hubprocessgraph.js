const { ProcessGraph } = require('@openeo/js-commons');

module.exports = class HubProcessGraph extends ProcessGraph {

    // overwrite to collect processes and collections while validating (visitor design pattern)
	async validateNode(node) {
        this.processes.push(node.process_id);
        if(node.process_id == 'load_collection') {
            this.collections.push(node.arguments.id);
        }
    }

    // overwrite so that sub-processgraphs are of class HubProcessGraph too
    createProcessGraphInstance(json) {
        return new HubProcessGraph(json);
    }

    // overwrite to prevent errors due to missing process registry
    parseCallbackArgument() {
    }

    async retrieveCollectionsAndProcesses() {
        this.collections = [];
        this.processes = [];
        await this.validate();
    }
    
    async getAllCollections() {
        if (this.collections == undefined) {
            await this.retrieveCollectionsAndProcesses();
        }
        return this.collections;
    }

    async getAllProcesses() {
        if (this.processes == undefined) {
            await this.retrieveCollectionsAndProcesses();
        }
        return this.processes;
    }
};
