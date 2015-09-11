
//path hardcoded change them

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
      database : 'chat_server',
    }
);
connection.connect();

app.get('/', function (req, res) {
  res.send('Hello World!');
  console.log(getDateTime()+" Connection request received from IP "+req.connection.remoteAddress);
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
        res.write("Received upload from IP "+req.connection.remoteAddress);
        //console.log(files);
        //Rename the file to its original name
        fs.rename(files.uploaded_file.path, './profilepic/'+files.uploaded_file.name+'.jpg', function(err) 
        {
	        if (err)
	            throw err;
	          console.log(getDateTime()+" File saved "+'./profilepic/'+files.uploaded_file.name+'.jpg');  
	          easyimg.rescrop({
			     src:'./profilepic/'+files.uploaded_file.name+'.jpg', dst:'./profilethumb/'+files.uploaded_file.name+'.jpg',
			     width:80, height:90,
			     x:0, y:0
			  }).then(
			  function(image) {
			     console.log(getDateTime()+" Resized the profilepic");
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
        res.write("Received upload from IP "+req.connection.remoteAddress);
 		//generate unique filename
 		var finalp="";
		//var tmpname = randomstring.generate(30);
		var arr=(files.uploaded_file.name).split(".");
		finalp='./attachments/'+arr[0]+'.'+arr[arr.length-1];
        //console.log(files);
        //Rename the file to its original name
        fs.rename(files.uploaded_file.path, finalp, function(err) 
        {
	        if (err)
	            throw err;
	          console.log(getDateTime()+" Attachment File saved at "+finalp);  
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

var server = app.listen(6080,function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Chat Server running at http://127.0.0.1:%s", port)

})
var io = require('socket.io').listen(server);

var clients =[];      
io.sockets.on('connection', function (socket) 
{
	var download = function(uri, filename, callback)
	{
		request.head(uri, function(err, res, body)
	    {
		    //console.log('content-type:', res.headers['content-type']);
		    //console.log('content-length:', res.headers['content-length']);
		    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
		});
	};

	function getDateTime() 
	{

	    var date = new Date();

	    var hour = date.getHours();
	    hour = (hour < 10 ? "0" : "") + hour;

	    var min  = date.getMinutes();
	    min = (min < 10 ? "0" : "") + min;

	    var sec  = date.getSeconds();
	    sec = (sec < 10 ? "0" : "") + sec;

	    var year = date.getFullYear();

	    var month = date.getMonth() + 1;
	    month = (month < 10 ? "0" : "") + month;

	    var day  = date.getDate();
	    day = (day < 10 ? "0" : "") + day;

	    return day + ":" + month + ":" + year + ":" + hour + ":" + min + ":" + sec;

	}

	socket.on('storeinfo', function (username,password,alias,email) 
	{
		console.log(getDateTime()+" Storing info for user "+username+" password "+password);
		console.log(getDateTime()+" Assigning ID "+socket.id);
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
	        console.log(getDateTime()+" User "+username+" entered into available clients")
	        //io.sockets.emit('message', 'User '+username+' Connected');
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
                console.log(getDateTime()+" User "+c.customId+" has successfully logged off");
        		//sockets.emit('messaged2', 'User '+c.customId+' Disonnected');
        		clients.splice(i,1);
                break;
            }
        }
    });

    socket.on('takethis', function(data,username,sendto,isattach)
    {
    	var queryString = "select * from chat_server.friends where friend1 = \""+sendto+"\" and friend2 = \""+username+"\";";
		connection.query( queryString, function(err, row,fields){
			if(err)	
			{socket.emit('notsent','')}
			else
			{
				if(row.length!=0)
				{
			    	var isonline=0,on_id;
			    	console.log(getDateTime()+" Recieved mesaage from user "+username+" intended for "+sendto);
					for( var i=0, len=clients.length; i<len; ++i )
					{
			            var c = clients[i];
			            if(c.customId == sendto)
			            {
			                isonline=1;id=c.clientId;
			                break;
			            }
			        }
			        var curtime=getDateTime();
			        if(isonline==1)
			        {
			        	console.log(getDateTime()+" Attempting to send to "+sendto);
			        	io.to(id).emit('messaged2',data,username,curtime);
			        	var queryString = "insert into chat_server.chat values(null,\""+username+"\",\""+sendto+"\",\""+data+"\",1,"+isattach+",\""+curtime+"\",null);";
						connection.query( queryString, function(err, rows,fields){
						  	if(err)	
						  	{
						  		console.log(getDateTime()+" Couldn't send message");
						  		socket.emit('notsent','')}
						    else
						  	{
						  		socket.emit('sent',data,isattach,curtime);
						  		console.log(getDateTime()+" Message successfully sent to "+sendto);
						  	}
						  });
						
			        }
			        else
			        {
			        	console.log(getDateTime()+" User "+sendto+" not online saving for future delivery")
			        	var queryString = "insert into chat_server.chat values(null,\""+username+"\",\""+sendto+"\",\""+data+"\",0,"+isattach+",\""+curtime+"\",null);";
						connection.query( queryString, function(err, rows,fields){
						  	if(err)	
						  	{console.log(getDateTime()+" Error in saving message");socket.emit('notsent','')}
						    else
						  	{
						  		socket.emit('sent',data,isattach,curtime);
						  		console.log(getDateTime()+" Message successfully saved for "+sendto);
							}
						  });
			        }
			        var lastseen=getDateTime();
			        var queryString = "update chat_server.user set last_seen=\""+lastseen+"\" where username =\""+username+"\";";
					connection.query( queryString, function(err, rows,fields){
						if(err)	
						{console.log(getDateTime()+" Error in updating lastseen info for user "+username);socket.emit('notsent','')}
						else
						{}
					});
			    }
			    else
			    	socket.emit('notsent','User has not added you as a contact')
			}
    	});
    });

    socket.on('login', function(username,password)
    {
    	console.log(getDateTime()+" Login attempt for user "+username);
 
		var queryString = "SELECT * FROM chat_server.user where username = \""+username+"\";";
		 
		connection.query( queryString, function(err, rows,fields){
		  	if(err)	
		  	{console.log(getDateTime()+" Error in loging in user "+username);}
		    else
		  	{
		  		if(rows.length!=0)
		  		{
					var obj = rows[0].password;
					//console.log(password);
					if(obj==password){
						console.log(getDateTime()+" User "+username+" is logged in");
						socket.emit('login', 'User '+username+' is logged in');
					}
					else{
						console.log(getDateTime()+" User "+username+" is not logged in");
						socket.emit('wlogin', 'Wrong credentials');
					}
				}
				else
					socket.emit('wlogin', 'User doesn\'t exist');
		  	}
		  });
    });

	socket.on('displayfriends', function(username)
    {
    	var arr=[];var dat=[];
    	var queryString = "select username,profilethumb,alias from chat_server.user where username in(select friend2 from friends where friend1=\""+username+"\");";
		console.log(getDateTime()+" Querying friends for user "+username);
		connection.query( queryString, function(err, rows,fields)
		{
		  	if(err)	
		  	{
		  		console.log(getDateTime()+" Error in querying for user "+username);
		  	}
		  	else
		  	{
		  		console.log(getDateTime()+" Sending friend list for user "+username);
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
		var curtime=getDateTime();
		var queryString = "select message,attachment from chat_server.chat where friend1 = \""+sendto+"\" and friend2 = \""+username+"\" and delivered = 0;";
		console.log(getDateTime()+" Checking for unrecieved messages for user "+username);
		connection.query( queryString, function(err, rows,fields){
		  	if(err)	
		  	{console.log(getDateTime()+" Error in finding unrecieved messages for user "+username);}
		  	else
		  	{
		  		console.log(getDateTime()+" Sending unrecieved messages to user "+username);
				for(var i in rows)
				{
					if(rows[i].attachment==0)
						socket.emit('messaged2',rows[i].message,sendto,curtime)
					else
					{
						var data=fs.readFileSync('./attachments/'+rows[i].message);
						socket.emit('messaged3',rows[i].message,data.toString('base64'),curtime,sendto);
					}//deal with attachments
				}
				socket.emit('done','');
			}
		  });
		var queryString = "update chat_server.chat set delivered = 1,timerecieved=\""+curtime+"\" where friend1 = \""+sendto+"\" and friend2 = \""+username+"\" and delivered = 0;";
		connection.query( queryString, function(err, rows,fields){
			if(err){console.log(getDateTime()+" Error in updating database -unrecieved messages- for user "+username);}
			else{console.log(getDateTime()+" Database updated after sending unrecieved messages for user "+username);}
		});
    });

    socket.on('signup',function(username,alias,email,password)
    {
    	var lastseen=getDateTime();
    	var pic="./profilepic/"+username+'.jpg',thumb="./profilethumb/"+username+'.jpg';
		var queryString = "insert into chat_server.user values (null,\""+username+"\",\""+password+"\",\""+pic+"\",\""+thumb+"\",\""+alias+"\",\""+email+"\",\""+lastseen+"\");";
		console.log(getDateTime()+" Signing up user "+username);
		connection.query( queryString, function(err, rows,fields)
		{
		  	if(err)	
		  	{
		  		console.log(getDateTime()+" User "+ username+" already registered");
		  		socket.emit('wsign','');
			}
		  	else
		  	{
		  		console.log(getDateTime()+" Signup completed for user "+username);
				socket.emit('sign','');
			}
		  });
    });
    socket.on('tellTimeLoc',function(sendto){
    	var queryString = "select * from chat_server.user where username = \""+sendto+"\";";
		console.log(getDateTime()+" Telling time for user "+sendto);
		connection.query( queryString, function(err, rows,fields){
		  	if(err)	
		  	{console.log(getDateTime()+" Error in telling time to user "+username);}
		  	else
		  	{
		  		var time=rows[0].last_seen;
				socket.emit('takeTimeLoc',time);
			}
		});
    });
	socket.on('takeTimeLoc',function(username){
    	var lastseen=getDateTime();
    	console.log(getDateTime()+" Updating lastseen time form user "+username);
		var queryString = "update chat_server.user set last_seen=\""+lastseen+"\" where username =\""+username+"\";";
		connection.query( queryString, function(err, rows,fields){
			if(err)	
			{console.log(getDateTime()+" "+err);socket.emit('notsaved','')}
			else{}
			});
    });
	socket.on('restorehistory', function(username,sendto)
    {
    	var queryString = "select friend1,friend2,message,timesent,timerecieved from chat_server.chat where (friend1 = \""+sendto+"\" and friend2 = \""+username+"\" and delivered = 1 ) or (friend1 = \""+username+"\" and friend2 = \""+sendto+"\" and delivered = 1);";
		console.log(getDateTime()+" Restoring recieved messages for user "+username);
		connection.query( queryString, function(err, rows,fields){
		  	if(err)	
		  	{console.log(getDateTime()+" Error in fetching recieved messages for user "+username);}
		  	else
		  	{
		  		//console.log(rows);
				for(var i in rows)
				{
					if(rows[i].friend1==sendto)
						socket.emit('messaged2',rows[i].message,rows[i].timerecieved)
					if(rows[i].friend1==username)
						socket.emit('sent',rows[i].message,rows[i].timesent)
				}
				socket.emit('done','');
			}
		  });
    });
    socket.on('checkuserexist', function(username,fri)
	{
		var arr=fri.split(",");
		console.log(getDateTime()+" Adding registered users as friends for user "+username);
		for(x=0;x<arr.length;x++)
        {
        	var queryString = "select * from chat_server.user where username = \""+arr[x]+"\";";
            connection.query( queryString, function(err, rows,fields)
            {
                if(err) 
                {console.log(getDateTime()+" Error in querying user "+username);}
                else
                {
                    if(rows.length!=0)
                    {
                        var str="insert into chat_server.friends values (null,\""+username+"\",\""+rows[0].username+"\",\"0\");";
                        //console.log(str);
                        connection.query(str, function(err, rows2,fields)
                        {
                            if(err) 
                            {console.log(getDateTime()+" User "+username+"already friends with user "+rows[0].username);}
                            else
                            {
                            	if(rows2.length!=0)
                                	console.log(getDateTime()+" User "+username+" added as friends with user "+rows[0].username);
                            }
                        });
                    }
                }
            });
		}
        socket.emit('listupdated',' ');
        console.log(getDateTime()+" Friend list updated for user "+username);
    });
	
});
