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
	socket.on('storeinfo', function (username,password) 
	{
		console.log("User "+socket.id+' Connected')
		var already_exists=0
		for( var i=0, len=clients.length; i<len; ++i )
		{
            var c = clients[i];
            if(c.customId == username)
            {
                already_exists=1;
                break;
            }
        }
        if(already_exists==0)
        {
        	var clientInfo = new Object();
	        clientInfo.customId = username;
	        clientInfo.clientId = socket.id;
	        clients.push(clientInfo);
	        console.log("User "+username+' Connected')
	        io.sockets.emit('message', 'User '+username+' Connected');
    	
	    	var queryString = "select username from user where username = \""+username+"\"";
			 
			connection.query( queryString, function(err, rows,fields){
			  	if(err)	
			  	{console.log("User doesn't exist");}
			  	else
			  	{
			  		for(var i in rows)
			  			i=1;
			  		if(i!=1)
			  		{
			  			var queryString2 = "insert into user values(null,\""+username+"\",\"google+\")";
						connection.query( queryString2, function(err, rows,fields){
					  	if(err)	
					  	{console.log("User doesn't exist");}
					  	else
					  	{}
					  	});
					}
			  	}
			});
			socket.emit('login','User '+username+' is logged in');
		}
		else
		{
			socket.emit('wlogin','You are logged in from some other device');
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

    socket.on('takethis', function(data,username,sendto)
    {
    	var isonline=0;
    	console.log(username);
    	var queryString = "insert into chat values(null,\""+username+"\",\""+sendto+"\",\""+data+"\",0)";
		 
		connection.query( queryString, function(err, rows,fields){
		  	if(err)	
		  	{socket.emit('notsent','')}
		    else
		  	{socket.emit('sent',data)}
		  });
        console.log('taken '+data);
        //socket.emit('message', 'Recieved '+data);
    });

    socket.on('login', function(username,password)
    {
    	console.log(username);
 
		var queryString = "SELECT * FROM user where username = \""+username+"\"";
		 
		connection.query( queryString, function(err, rows,fields){
		  	if(err)	
		  	{console.log("User doesn't exist");}
		    else
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
		  	{console.log("You have no friends");}
		  	else
		  	{
		  		console.log(rows);
				for(var i in rows)
					socket.emit('addfriend',rows[i].friend2)
		  	}
		  });
    });
    socket.on('refresh', function(username,sendto)
    {
    	var queryString = "select message from chat where friend1 = \""+sendto+"\" and friend2 = \""+username+"\" and delivered = 0";
		 console.log("unrecieved messages ");
		connection.query( queryString, function(err, rows,fields){
		  	if(err)	
		  	{console.log("You have no friends");}
		  	else
		  	{
		  		console.log(rows);
				for(var i in rows)
					socket.emit('messaged',rows[i].message)
				var queryString = "update chat set delivered = 1 where friend1 = \""+sendto+"\" and friend2 = \""+username+"\"";
				console.log("recieved");
				connection.query( queryString, function(err, rows,fields){
				  	if(err)	
				  	{
				  		console.log("You have no friends");
				  	}
				  	else
				  	{
				  	}
				  });
				socket.emit('done','');
			}
		  });
    });
	socket.on('restorehistory', function(username,sendto)
    {
    	var queryString = "select friend1,friend2,message from chat where (friend1 = \""+sendto+"\" and friend2 = \""+username+"\" and delivered = 1 ) or (friend1 = \""+username+"\" and friend2 = \""+sendto+"\")";
		 console.log("recieved messages ");
		connection.query( queryString, function(err, rows,fields){
		  	if(err)	
		  	{console.log("You have no friends");}
		  	else
		  	{
		  		console.log(rows);
				for(var i in rows)
				{
					if(rows[i].friend1==sendto)
						socket.emit('messaged',rows[i].message)
					if(rows[i].friend1==username)
						socket.emit('sent',rows[i].message)
				}
				socket.emit('done','');
			}
		  });
    });
    socket.on('checkuserexists', function(username)
    {
    	var queryString = "select * from user where username = \""+username+"\" ";
		console.log("checking if user "+username+" exists");
		connection.query( queryString, function(err, rows,fields){
		  	if(err)	
		  	{console.log("Error");}
		  	else
		  	{
		  		var exists=0
		  		for(var i in rows)
					exists=1;
				if(exists==0)
				{
					var queryString = "insert into user values (null,\""+username+"\",\""+password+"\")";
					console.log("adding user "+username);
					connection.query( queryString, function(err, rows,fields){
					  	if(err)	
					  	{console.log("Error2");}
					  	else
					  	{socket.emit('signup','You have been registered',1);}
					});
				}
				else
				{socket.emit('signup','User already exists',0);}
				socket.emit('done','');
			}
		  });
    });
});
