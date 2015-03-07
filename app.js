var express = require('express')
var url = require("url");
var app = express()
var mysql = require('mysql');
var fs = require('fs');
var request = require('request');
var async =require('async');
var connect = require('connect');
var bodyParser = require('body-parser'); //connects bodyParsing middleware
var formidable = require('formidable');
var path = require('path');
var easyimg = require('easyimage');
var randomstring = require("randomstring");

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
app.use(bodyParser({defer: true}));
app.post('/', function(req, res) 
{
    //console.log(req);
    var form = new formidable.IncomingForm();
    //Formidable uploads to operating systems tmp dir by default
    form.uploadDir = "./profilepic";       //set upload directory
    form.keepExtensions = true;     //keep file extension

    form.parse(req, function(err, fields, files) 
    {
        res.writeHead(200, {'content-type': 'text/plain'});
        res.write('received upload:\n\n');
        //console.log(files);
        //Rename the file to its original name
        fs.rename(files.uploaded_file.path, './profilepic/'+files.uploaded_file.name+'.jpg', function(err) 
        {
	        if (err)
	            throw err;
	          console.log('file saved '+'./profilepic/'+files.uploaded_file.name+'.jpg');  
	          easyimg.rescrop({
			     src:'./profilepic/'+files.uploaded_file.name+'.jpg', dst:'./profilethumb/'+files.uploaded_file.name+'.jpg',
			     width:80, height:90,
			     x:0, y:0
			  }).then(
			  function(image) {
			     console.log('Resized');
			  },
			  function (err) {
			    console.log(err);
			  }
			);
		});
        res.end();
    });
})

//attachments
app.post('/attachments', function(req, res) 
{
    //console.log(req);
    var form = new formidable.IncomingForm();
    //Formidable uploads to operating systems tmp dir by default
    form.uploadDir = "./attachments";       //set upload directory
    form.keepExtensions = true;     //keep file extension

    form.parse(req, function(err, fields, files) 
    {
        res.writeHead(200, {'content-type': 'text/plain'});
        res.write('received upload:\n\n');
 		//generate unique filename
 		var finalp="";
		//var tmpname = randomstring.generate(30);
		var arr=(files.uploaded_file.name).split(".");
		finalp='d:/nodejs/attachments/'+arr[0]+'.'+arr[arr.length-1];
        //console.log(files);
        //Rename the file to its original name
        fs.rename(files.uploaded_file.path, finalp, function(err) 
        {
	        if (err)
	            throw err;
	          console.log('file saved '+finalp);  
		});
        res.end();
    });
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
	var download = function(uri, filename, callback)
	{
		request.head(uri, function(err, res, body)
	    {
		    console.log('content-type:', res.headers['content-type']);
		    console.log('content-length:', res.headers['content-length']);
		    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
		});
	};

	socket.on('storeinfo', function (username,password,alias,email) 
	{
		console.log(username+" "+password);
		console.log("User "+socket.id+' Connected')
		var already_exists=0;
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
			socket.emit('ready','User '+username+' is logged in');
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
        		//sockets.emit('messaged2', 'User '+c.customId+' Disonnected');
        		clients.splice(i,1);
                break;
            }
        }
    });

    socket.on('takethis', function(data,username,sendto,isattach)
    {
    	var queryString = "select * from friends where friend1 = \""+sendto+"\" and friend2 = \""+username+"\"";
		connection.query( queryString, function(err, row,fields){
			if(err)	
			{socket.emit('notsent','')}
			else
			{
				if(row.length!=0)
				{
			    	var isonline=0,on_id;
			    	console.log(username);
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
			        	io.to(id).emit('messaged2',data,username)
			        	var queryString = "insert into chat values(null,\""+username+"\",\""+sendto+"\",\""+data+"\",1,"+isattach+")";
						connection.query( queryString, function(err, rows,fields){
						  	if(err)	
						  	{socket.emit('notsent','')}
						    else
						  	{socket.emit('sent',data)}
						  });
						console.log("recieved");
			        }
			        else
			        {
			        	var queryString = "insert into chat values(null,\""+username+"\",\""+sendto+"\",\""+data+"\",0,"+isattach+")";
						connection.query( queryString, function(err, rows,fields){
						  	if(err)	
						  	{console.log(err);socket.emit('notsent','')}
						    else
						  	{socket.emit('sent',data)}
						  });
		   				 console.log('taken '+data);
			        }
			    }
			    else
			    	socket.emit('notsent','User has not added you as a contact')
			}
    	});
    });

    socket.on('login', function(username,password)
    {
    	console.log(username);
 
		var queryString = "SELECT * FROM user where username = \""+username+"\"";
		 
		connection.query( queryString, function(err, rows,fields){
		  	if(err)	
		  	{console.log("");}
		    else
		  	{
		  		if(rows.length!=0)
		  		{
					var obj = rows[0].password;
					console.log(password);
					if(obj==password)
						socket.emit('login', 'User '+username+' is logged in');
					else
						socket.emit('wlogin', 'Wrong credentials');
				}
				else
					socket.emit('wlogin', 'User doesn\'t exist');
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
    	var queryString = "select serial,message,attachment from chat where friend1 = \""+sendto+"\" and friend2 = \""+username+"\" and delivered = 0";
		console.log("unrecieved messages ");
		connection.query( queryString, function(err, rows,fields){
		  	if(err)	
		  	{console.log("You have no friends");}
		  	else
		  	{
		  		console.log(rows);
				for(var i in rows)
				{
					if(rows[i].attachment==0)
						socket.emit('messaged2',rows[i].message)
					else
					{
						var data=fs.readFileSync('d:/nodejs/attachments/'+rows[i].message);
						socket.emit('messaged3',rows[i].message,data.toString('base64'));
					}//deal with attachments
				}
				socket.emit('done','');
			}
		  });
		var queryString = "update chat set delivered = 1 where friend1 = \""+sendto+"\" and friend2 = \""+username+"\"";
		connection.query( queryString, function(err, rows,fields){
			if(err){console.log("**Y");}
			else{}
		});
    });

    socket.on('signup',function(username,alias,email,password)
    {
    	var pic="d:/nodejs/profilepic/"+username+'.jpg',thumb="d:/nodejs/profilethumb/"+username+'.jpg';
		var queryString = "insert into user values (null,\""+username+"\",\""+password+"\",\""+pic+"\",\""+thumb+"\",\""+alias+"\",\""+email+"\")";
		console.log("adding user");
		connection.query( queryString, function(err, rows,fields)
		{
		  	if(err)	
		  	{
		  		console.log("Already registered");
		  		socket.emit('wsign','');
			}
		  	else
		  	{
		  		console.log("Signed up");
				socket.emit('sign','');
			}
		  });
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
						socket.emit('messaged2',rows[i].message)
					if(rows[i].friend1==username)
						socket.emit('sent',rows[i].message)
				}
				socket.emit('done','');
			}
		  });
    });
    socket.on('checkuserexist', function(username,fri)
	{
		var arr=fri.split(",");
		for(x=0;x<arr.length;x++)
        {
        	var queryString = "select * from user where username = \""+arr[x]+"\"";
            connection.query( queryString, function(err, rows,fields)
            {
                if(err) 
                {console.log("no shit 1");}
                else
                {
                    if(rows.length!=0)
                    {
                        var str="insert into friends values (null,\""+username+"\",\""+rows[0].username+"\",\"0\")";
                        console.log(str);
                        connection.query(str, function(err, rows2,fields)
                        {
                            if(err) 
                            {console.log("no shit 2");}
                            else
                            {
                            	if(rows2.length!=0)
                                	console.log("ttt "+rows2);
                            }
                        });
                    }
                }
            });
		}
		console.log("done");
        socket.emit('listupdated',' ');
        console.log("done");
    });
	
});
