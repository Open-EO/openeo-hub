var restify = require('restify');
var server = restify.createServer();

server.get('/test', function(req, res, next) {
    res.send('test');
    return next();
});

server.get('/*', restify.plugins.serveStatic({
    directory: './public',
    default: 'index.html'
}));

server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
});
