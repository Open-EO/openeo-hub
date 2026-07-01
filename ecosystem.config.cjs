module.exports = {
	apps: [
		{
			name: "openeo-hub-server",
			script: "server.js",
			autorestart: true,
			cron_restart: "0 0 * * *",
			max_memory_restart: "500M",
			exp_backoff_restart_delay: 100
		}
	]
};