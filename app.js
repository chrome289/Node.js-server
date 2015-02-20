var express = require('express')
var url = require("url");
var app = express()
var mysql = require('mysql');
 
var connection = mysql.createConnection(
    {
      host     : 'localhost',
      user     : 'root',
      password : 'root',
      database : 'chat',
    }
);
connection.connect();
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

var clients =[];      
io.sockets.on('connection', function (socket) 
{
	socket.on('storeinfo', function (data) 
	{
		console.log("User "+socket.id+' Connected')
		var already_exists=0
		for( var i=0, len=clients.length; i<len; ++i )
		{
            var c = clients[i];
            if(c.clientId == socket.id)
            {
                already_exists=1;
                break;
            }
        }
        if(already_exists==0)
        {
        	var clientInfo = new Object();
	        clientInfo.customId = data;
	        clientInfo.clientId = socket.id;
	        clients.push(clientInfo);
	        console.log("User "+data+' Connected')
	        io.sockets.emit('messaged', 'User '+data+' Connected');
    	}
    });

	//io.sockets.emit('message', '');
	//socket.emit('message', 'User '+socket.id+' Connected');
    socket.on('disconnect', function()
    {
        
    	for( var i=0, len=clients.length; i<len; ++i )
    	{
            var c = clients[i];
            if(c.clientId == socket.id)
            {
                console.log('User '+c.customId+' Disonnected');
        		io.sockets.emit('messaged', 'User '+c.customId+' Disonnected');
        		clients.splice(i,1);
                break;
            }
        }
    });

    socket.on('takethis', function(data,username)
    {
		for( var i=0, len=clients.length; i<len; ++i )
		{
            var c = clients[i];
            if(c.customId == username)
            {
                io.sockets.to(c.clientId).emit('messaged', 'User '+username+' says '+data);
                console.log("Sending "+c.clientId+" a message");
            }
        }
		
        console.log('taken '+data);
        //socket.emit('message', 'Recieved '+data);
    });

    socket.on('login', function(username,password)
    {
    	console.log(username);
 
		var queryString = "SELECT * FROM user where username = \""+username+"\"";
		 
		connection.query( queryString, function(err, rows,fields){
		  	if(err)	
		  	{
		  		console.log("User doesn't exist");
		  	}else
		  	{
				var obj = rows[0].password;
				console.log(password);
				if(obj==password)
					socket.emit('login', 'User '+username+' is logged in');
				else
					socket.emit('wlogin', 'Wrong Password');
		  	}
		  });
    });

	socket.on('displayfriends', function(username)
    {
    	var queryString = "select friend2 from friends where friend1 = \""+username+"\"";
		 console.log("You have friends "+username);
		connection.query( queryString, function(err, rows,fields){
		  	if(err)	
		  	{
		  		console.log("You have no friends");
		  	}
		  	else
		  	{
		  		console.log(rows);
				for(var i in rows)
					socket.emit('addfriend',rows[i].friend2)
		  	}
		  });
    });
});