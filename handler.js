function home(response) {
console.log("Request handler 'home' was called.");

    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write("Hello");
    response.end();
}
function start(response) {
console.log("Request handler 'start' was called.");

    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write("boobs");
    response.end();
}
function upload(response) {
console.log("Request handler 'upload' was called.");

    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write("tits");
    response.end();
}

exports.home = home;
exports.start = start;
exports.upload = upload;