var express = require('express')
var url = require("url");
var app = express()
var mysql = require('mysql');
var fs = require('fs');
var request = require('request');
var async =require('async');

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
	var download = function(uri, filename, callback){
		  request.head(uri, function(err, res, body){
		    console.log('content-type:', res.headers['content-type']);
		    console.log('content-length:', res.headers['content-length']);

		    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
		  });
		};

	socket.on('storeinfo', function (username,password,image,thumb,alias,email) 
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
			  			download(image, 'd:/nodejs/profilepic/'+username+'.png', function(){
    					console.log('Done downloading..');
  						});
  						download(thumb, 'd:/nodejs/profilethumb/'+username+'.png', function(){
    					console.log('Done downloading..');
  						});
			  			var queryString2 = "insert into user values(null, \""+username+"\" , \"google+\" , \"d:/nodejs/profilepic/"+username+".png\", \"d:/nodejs/profilethumb/"+username+".png\" , \""+alias+"\" , \""+email+"\")";
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
        		//sockets.emit('messaged', 'User '+c.customId+' Disonnected');
        		clients.splice(i,1);
                break;
            }
        }
    });

    socket.on('takethis', function(data,username,sendto)
    {
    	var isonline=0,on_id;
    	console.log(username);
    	var queryString = "insert into chat values(null,\""+username+"\",\""+sendto+"\",\""+data+"\",0)";
		 
		connection.query( queryString, function(err, rows,fields){
		  	if(err)	
		  	{socket.emit('notsent','')}
		    else
		  	{socket.emit('sent',data)}
		  });
		for( var i=0, len=clients.length; i<len; ++i )
		{
            var c = clients[i];
            if(c.customId == sendto)
            {
                isonline=1;id=c.clientId;
                break;
            }
        }
        if(isonline==1)
        {
        	console.log("sending");
        	io.to(id).emit('messaged',data,username)
        	var queryString = "update chat set delivered = 1 where friend1 = \""+username+"\" and friend2 = \""+sendto+"\"";
			connection.query( queryString, function(err, rows,fields){
				if(err){console.log("**Y");}
				else{}
		});
		console.log("recieved");
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
    	var arr=[];var dat=[];
    	var queryString = "select username,profilethumb,alias from user where username in(select friend2 from friends where friend1=\""+username+"\");";
		console.log("You have friends "+username);
		connection.query( queryString, function(err, rows,fields)
		{
		  	if(err)	
		  	{
		  		console.log("You have no friends");
		  	}
		  	else
		  	{
		  		//console.log(rows);
				for(var i in rows)
				{
					var data=fs.readFileSync(rows[i].profilethumb);
					socket.emit('addfriend',rows[i].username,data.toString('base64'),rows[i].alias);
				}
				
		  	}
		});
    });

    socket.on('refresh', function(username,sendto)
    {
    	var queryString = "select serial,message from chat where friend1 = \""+sendto+"\" and friend2 = \""+username+"\" and delivered = 0";
		console.log("unrecieved messages ");
		connection.query( queryString, function(err, rows,fields){
		  	if(err)	
		  	{console.log("You have no friends");}
		  	else
		  	{
		  		console.log(rows);
				for(var i in rows)
					socket.emit('messaged',rows[i].message)
				socket.emit('done','');
			}
		  });
		var queryString = "update chat set delivered = 1 where friend1 = \""+sendto+"\" and friend2 = \""+username+"\"";
		connection.query( queryString, function(err, rows,fields){
			if(err){console.log("**Y");}
			else{}
		});
    });

    socket.on('recievedmessage',function(username,sendto,serial)
    {
		
				
    });
	socket.on('restorehistory', function(username,sendto)
    {
    	var queryString = "select serial,friend1,friend2,message from chat where (friend1 = \""+sendto+"\" and friend2 = \""+username+"\" and delivered = 1 ) or (friend1 = \""+username+"\" and friend2 = \""+sendto+"\")";
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
	socket.on('addid', function(username,fri)
	    {
			var arr = fri.toString().split("+");
	    	var lv1=0,lv2=0,lv3=0;
	    	var y=0,x=0;
	    	console.log("length "+arr.length+" "+arr[0]);
	    	for(x=0;x<arr.length;x++)
	    	{
	    		console.log("iter " +arr[x]);
	    		var queryString1 = "select username from user where username=\""+arr[x]+"\"";
					connection.query( queryString1, function(err, rows1,fields)
					{
					  	if(err)	
					  	{
					  		console.log("You have no friends1");
						}
					  	else
					  	{
					  		lv1=0;lv2=0;lv3=0;
					  		console.log("You have no friends "+y);y++;
					  		for(var r in rows1)
					  		{
					  			lv1=1;
					  			console.log("User +" + arr[x]);
					  		}
					  			if(lv1==1)
			    				{
									var queryString2 = "select friend2 from friends where friend1=\""+arr[x]+"\" and friend2 = \""+username+"\"";
									connection.query( queryString2, function(err, rows2,fields)
									{
										if(err)	
										{
											console.log("You have no friends2");
										}
										else
										{
											console.log("--- " +x);
								  	
											for(var i2 in rows2)
												lv2=1;
											if(lv2==0)
									    	{
									    		var queryString3 = "insert into friends values (null,\""+username+"\",\""+arr[x]+"\",\"0\")";
												console.log("adding friend " +username+" "+arr[x]);
												connection.query( queryString3, function(err, rows3,fields)
												{
													if(err)	
													{console.log("You have no friends3");}
													else
													{
														console.log(rows3);
													}
												});
											}
							  			}
							  		});
							  	}//WTF is this shit
					  		x++;
						}
					});
				}	
			console.log("bs");
			x=0;
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
					var queryString = "insert into user values (null,\""+username+"\",\""+password+"\",null,null,null)";
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
