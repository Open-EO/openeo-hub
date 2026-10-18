import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';
import { fileURLToPath } from 'node:url';

const configFile = fileURLToPath(new URL('./config.js', import.meta.url)).replace(/\\/g, '/');
const vueComponents = '/node_modules/@openeo/vue-components/';
// Modules that need to be evaluated before a required module, as require() was called lazily
// e.g. leaflet.antimeridian expects the global L that Leaflet sets
const requirePrerequisites = {
	'leaflet.antimeridian': ['leaflet']
};

// Vite only serves ES modules, but some files are CommonJS:
// - config.js is shared with the (CommonJS) backend
// - @openeo/vue-components lazily calls require() in some components to break circular imports
//   and ships featurelist.js as CommonJS
function commonjsCompat() {
	return {
		name: 'openeo-hub:commonjs-compat',
		transform(code, id) {
			const [file, query] = id.split('?');
			// Skip the template/style sub-modules of .vue files
			if (query && query.includes('type=')) {
				return null;
			}
			if (file === configFile || file.endsWith(vueComponents + 'featurelist.js')) {
				return { code: code.replace(/module\.exports\s*=/, 'export default'), map: null };
			}
			if (file.includes(vueComponents) && code.includes('require(')) {
				const imports = [];
				code = code.replace(/\brequire\((['"])([^'"]+)\1\)/g, (match, quote, path) => {
					const name = `__cjs_require_${imports.length}`;
					for (const prerequisite of requirePrerequisites[path] || []) {
						imports.push(`import ${JSON.stringify(prerequisite)};`);
					}
					imports.push(`import * as ${name} from ${JSON.stringify(path)};`);
					// For .vue files the namespace (with .default) is expected, otherwise module.exports
					return path.endsWith('.vue') ? name : `(${name}.default ?? ${name})`;
				});
				return { code: imports.join('\n') + '\n' + code, map: null };
			}
			return null;
		}
	};
}

export default defineConfig({
	plugins: [
		vue(),
		commonjsCompat()
	],
	optimizeDeps: {
		// Ships uncompiled .vue files, which can't be pre-bundled
		exclude: ['@openeo/vue-components']
	},
	server: {
		port: 9000
	}
});
