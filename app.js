var express = require('express')
var url = require("url");
var app = express()

// respond with "Hello World!" on the homepage
app.get('/', function (req, res) {
  res.send('Hello World!');
  console.log("-------\nRequest for " + url.parse(req.url).pathname + " received from ip"+req.connection.remoteAddress);
})

// accept POST request on the homepage
app.post('/', function (req, res) {
  res.send('Got a POST request');
})

// accept PUT request at /user
app.put('/user', function (req, res) {
  res.send('Got a PUT request at /user');
})

// accept DELETE request at /user
app.delete('/user', function (req, res) {
  res.send('Got a DELETE request at /user');
})
var server = app.listen(80, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)

})
var io = require('socket.io').listen(server);
io.sockets.on('connection', function (socket) 
{
	console.log("user connected 	+"+socket.id)
	socket.emit('message', { message: socket.id });
    socket.on('disconnect', function()
    {
        console.log('user disconnected  '+socket.id);
        socket.emit('message', { message: 'fuck off' });
    });
    socket.on('takethis', function(data,moredata)
    {
        console.log('taken '+moredata);
        socket.emit('message', { message: data ,moremessage: moredata});
    });
});