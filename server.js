// internal modules:
const fs = require('fs');
const path = require("path")
const url = require('url');
const assert = require("assert");
const http = require("http");
// external modules:
const express = require("express");
const ws = require("ws");

// this will be true if this server is running on Heroku
const IS_HEROKU = (process.env._ && process.env._.indexOf("heroku") !== -1);
// what port should this server be accessed on?
const PORT = process.env.PORT || 3000
// where static HTML etc. files are found
const PUBLIC_PATH = path.join(__dirname, "public")


// create an Express app:
const app = express();
// serve static files from PUBLIC_PATH:
app.use(express.static(PUBLIC_PATH)); 
// default to index.html if no file given:
app.get("/", function(req, res) {
    res.sendFile(path.join(PUBLIC_PATH, "index.html"))
});
// comment this to disallow cross-domain resource access (CORS):
app.use(function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	return next();
});

// create the primary server from this app:
const server = http.createServer(app);

// add a websocket to it:
const wss = new ws.Server({ server });
// handle websocket connections and events from clients:
wss.on('connection', (socket, req) => {
	console.log("received a new websocket connection to", req.url)
	
	socket.on('message', (buf) => {
		const msg = buf.toString()
        console.log(msg)
        // send it back:
        socket.send(msg)
    });


	socket.on('error', (err) => {
		console.log(err)
	});

	socket.on('close', () => {
		console.log("client closed socket")
	});
});

// start the server:
server.listen(PORT, function() {
	console.log("\nNode.js listening on port " + PORT);
});