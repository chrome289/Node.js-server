var server =require("./server");
var router = require("./router");
var handler=require("./handler");

var handle = {}
handle["/"] = handler.home;
handle["/start"] = handler.start;
handle["/upload"] = handler.upload;

server.start(router.route,handle);