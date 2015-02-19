var http = require("http");
var url = require("url");
var io = require('socket.io')(http);
function start(route, handle) 
{
	function onRequest(request, response) 
	{
		var pathname = url.parse(request.url).pathname;
		console.log("-------\nRequest for " + pathname + " received from ip"+request.connection.remoteAddress);
		route(handle, pathname, response);
	}
	http.createServer(onRequest).listen(80);
	console.log("Server has started.");
}
io.on('connection', function (socket) 
{
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) 
  {
    console.log(data);
  });
});
exports.start = start;