// internal modules:
const fs = require('fs');
const path = require("path")
const url = require('url');
const assert = require("assert");
const http = require("http");
const https = require("https");
// external modules:
const express = require("express");
const ws = require("ws");
const { v4: uuidv4 } = require("uuid");
const { Console } = require('console');

// this will be true if this server is running on Heroku
const IS_HEROKU = (process.env._ && process.env._.indexOf("heroku") !== -1);
// bpth KEY_PATH and CERT_PATH must be defined for HTTPS to work: 
const IS_HTTPS = (process.env.KEY_PATH && process.env.CERT_PATH && !IS_HEROKU);

// what port should this server be accessed on?
const PORT_HTTP = process.env.PORT || process.env.PORT_HTTP || 3000
const PORT_HTTPS = process.env.PORT_HTTPS || 443;
const PORT = IS_HTTPS ? PORT_HTTPS : PORT_HTTP;
// where static HTML etc. files are found
const PUBLIC_PATH = path.join(__dirname, "public")


// create an Express app:
const app = express();
// comment this to disallow cross-domain resource access (CORS):
app.use(function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	return next();
});

// promote http to https:
if (IS_HTTPS) {
	http.createServer(function(req, res) {
        res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
        res.end();
    }).listen(PORT_HTTP);
}

// create the primary server:
const server = IS_HTTPS ? 
	https.createServer({
		key: fs.readFileSync(process.env.KEY_PATH),
		cert: fs.readFileSync(process.env.CERT_PATH)
	}, app) 
	: 
	http.createServer(app);

// serve static files from PUBLIC_PATH:
app.use(express.static(PUBLIC_PATH)); 
// default to index.html if no file given:
app.get("/", function(req, res) {
    res.sendFile(path.join(PUBLIC_PATH, "index.html"))
});

// add a websocket to it:
const wss = new ws.Server({ server });


// handle websocket connections and events from clients
const clients = {}
const rooms = {}
wss.on('connection', (socket, req) => {
	
	// Read the path from the connection request and treat it as a room name, sanitizing and standardizing the format.
	// Actual room name might differ from this, if it's empty and we need to substitute a "default" instead.
	const room_name = url.parse(req.url).pathname.replace(/\/*$/, "").replace(/\/+/, "/")

	let room = getRoom(room_name)

	

	const uid = uuidv4()

	let client = {
		socket,
		room: room_name,
		shared: {
			uid,
		}
	}
	clients[uid] = client

	socket.on('close', () => {
		delete clients[uid]
		updateRoomClients()
		console.log(`client ${uid} left room ${client.room}`);	
	});
	
	socket.on('message', (buf) => {
		const str = buf.toString()

		if (str.charAt(0) == "{") {
			let msg = JSON.parse(str)
			switch(msg.cmd) {
				case "pose": {
					let client = clients[msg.uid]
					if (client) {
						Object.assign(client.shared, msg.data)
					}
				} break;
				case "world": {
					console.log(msg)
					
					let { room, world } = msg

					if (rooms[room]) {
						rooms[room].world = world

						// notify all members:
						sendRoom(room, JSON.stringify({
							cmd: "world",
							world
						}))
					}
				} break;
				default: {
					console.log(msg)
				}
			}
		}
    });


	socket.on('error', (err) => {
		console.log(err)
	});

	// let user know:
	socket.send(JSON.stringify({
		cmd: "handshake",
		uid,
		// request a world from the client:
		needWorld: (room.clients.length == 0),
		world: room.world
	}))

	updateRoomClients()
	
	console.log(`client ${uid} entered room ${client.room}`);	
});

// start the server:
server.listen(PORT, function() {
	console.log("\nNode.js listening on port " + PORT);
});

function createRoom() {


	return {
		clients:[],
		shared: {

		}
	}
}

function getRoom(name) {
	if (!rooms[name]) {
		// create a room
		rooms[name] = createRoom()
	}
	return rooms[name]
}

function sendRoom(name, msg) {
	updateRoomClients()


	rooms[name].clients.forEach(shared => {


		let client = clients[shared.uid]
		
		console.log(client)
		client.socket.send(msg)
	})
}

// periodically update client lists
function updateRoomClients() {

	let names = Object.keys(rooms)


	// first empty them out
	names.forEach(name => rooms[name].clients.length = 0)

	// then fill them up:
	for (let uid in clients) {
		let client = clients[uid]
		let name = client.room
		let room = getRoom(name)
		room.clients.push(client.shared)
	}

	names.forEach(name => {
		if (rooms[name].clients.length == 0) { 
			delete rooms[name] 
		}
	})
}

setInterval(function() {
	
	updateRoomClients()

	let msgs = {}
	for (let name in rooms) {
		msgs[name] = JSON.stringify({ cmd:"clients", clients: rooms[name].clients})
	}

	for (let uid in clients) {
		let client = clients[uid]
		client.socket.send(msgs[client.room])
	}
}, 1000/100);
