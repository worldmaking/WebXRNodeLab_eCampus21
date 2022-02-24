# Node.js

Node.js was designed to support scalable network applications. Initially conceived as a *server-side* engine, it has grown to become a fantastic environment for desktop console-based scripting in general. 

- Tutorial/guides: [https://nodejs.org/en/docs/guides/](https://nodejs.org/en/docs/guides/)
- API: [https://nodejs.org/dist/latest-v14.x/docs/api/](https://nodejs.org/dist/latest-v14.x/docs/api/). 
  

## Installing

- Download and install Node.js from [https://nodejs.org/en/](https://nodejs.org/en/) -- recommend the most recent "LTS" edition
- We recommend Visual Studio Code as an editor -- it has an integrated terminal, is consistent between Mac and Windows, and has good Javascript support built in. Get it from [https://code.visualstudio.com/download](https://code.visualstudio.com/download)


## Using Node.js

A core concept of Node.js that it is **event-driven**: responding to network, file, sub-processes, and many other events and data streams via callback functions.  For example, look at [`fs.readFile()`](html#fs_fs_readfile_path_options_callback). But many offer non-event-based equivalents, such as [`fs.readFileSync()`](https://nodejs.org/docs/latest-v12.x/api/fs.html#fs_fs_readfilesync_path_options).

Most of the time Node is used to run a main script, invoked with the filename. A minimal script:

```javascript
// save as `index.js`
console.log("hello")
```

We can use VS Code (integrated file editor & terminal, with good default syntax colouring) to create this file, and the integrated Terminal view to run it, by typing `node index.js` (enter)

To access most of the API of Node.js, and of other 3rd party libraries, we use "modules", which are loaded using the `require` command. For example:

```js
// load in the "fs" (file system) module, so that we can use its API
const fs = require("fs");
```

The "fs" module is one of the few modules that comes with Node.js, but there are many, many, more that can be downloaded and installed. 

## NPM

One of the most remarkable features of Node.js is the ["Node Package Manager" (NPM)](https://www.npmjs.com/), a collection of a million libraries -- the single-largest open-source package manager in the world.
 

### Package.json

To start a new project, usually it's a good idea to run `npm init`. It will ask you for some parameters. This will create a file called `package.json` which stores all your configuration for the project, including library dependencies, start scripts, etc. 

To add a library such as [express](https://www.npmjs.com/package/express), simply:

`npm install --save express`

This will place the library folder `express` in a `node_mmodules` subfolder; and it will add the dependency to `package.json`. That way, if someone else was to check out your git repository, they could simply run `npm install` and it would download `express` for them too. 

## Express

Express itself is one of the popular web server frameworks -- it makes it very easy to host html pages from Node.js. 

Here is a minimal server using express:

```js
const express = require('express')
const app = express()
const PORT = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const server = app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`)
})
```

To serve HTML pages, there's quite a bit of plumbing needed in terms of formatting messages, but fortunately [`express` makes this very easy](https://expressjs.com/en/starter/static-files.html):


```js
// assumes 'app' was created as above
// assumes 'public' is a subfolder relative to index.js
app.use(express.static('public'))

// alternatively, try with path.join(__dirname, "public")
// where const path = require("path"); Node utilities for resolving filepaths
// and __dirname is the path to the folder where index.js lives
```

Now if you restart the node.js script, any HTML resources in the /public folder should not be visible at http://localhost:3000

Moreover, anyone on your local network should be able to see it too, so long as they know your machine's IP address (or possibly machine name). 

> To find your IP address, type `ifconfig` (mac/linux) or `ipconfig` (win) on the terminal.


## WS

Serving HTML pages is fine enough for passive experiences, but what if you want something more dynamic -- where the browser and the Node 'server' are talking to each other continuously? Here, [WebSockets](https://en.wikipedia.org/wiki/WebSocket) can help. They are a bi-directional message-passing network protocol (not the only such thing, but a very commonly-supproted one) which can sit upon the HTTP protocol. It works on most browsers already.  To use them in Node.js, we need another library. [Try this one](https://github.com/websockets/ws):

`npm install --save ws`

And in our `index.js`:

```js
const ws = require('ws');

//... and after we've set up our 'app' server:
// add a websocket server for continuous communication with clients:
const wss = new ws.Server({ server });
// handle each new connections from a client:
wss.on('connection', function(client) {
	console.log("I got a connection!");
});
```

Meanwhile, in the browser ("client") javascript code, add some code to try to connect to this server: 

```js

// connect to websocket at same location as the web-page host:
const addr = location.origin.replace(/^http/, 'ws')
console.log("connecting to", addr)

// this is how to create a client socket in the browser:
let socket = new WebSocket(addr);

// let's know when it works:
socket.onopen = function() { 
	// or document.write("websocket connected to "+addr); 
	console.log("websocket connected to "+addr); 
	socket.send("hello")
}
socket.onerror = function(err) { 
	console.error(err); 
}
socket.onclose = function(e) { 
	console.log("websocket disconnected from "+addr); 

	// a useful trick:
	// if the server disconnects (happens a lot during development!)
	// reload this page to try to reconnect again
	location.reload()
}
```

Assuming this hand-shaking works, we can start adding some conversational back & forth. In the client, let's tell the server if our mouse is moving:

```js
document.addEventListener("pointermove", e => {
	// is the socket available?
	if (socket.readyState !== WebSocket.OPEN) return;

	// we can send any old string:
	socket.send("boo!")
});

socket.onmessage = function(msg) {
	console.log(msg.data);
}
```

And, in the server, we can make a reply. Now here we have to be more careful: the server might have connections to MANY clients at once, so we need to handle it *inside* the wss.on('connection') handler:

```js
wss.on('connection', function(client) {
	console.log("I got a connection!");
	// all per-client code goes here now.

	client.on('message', buf => {
		const msg = buf.toString()
		console.log("I got a message!", msg);
		
		// reply:
		client.send("who?")
	});
});
```

### Complex data on websockets

To send more structured, arbitrary data back & forth, we can encode it using JSON:

```js
// most js objects can be encoded as JSON
// except for functions, complex structures that contain multiple references to the same object, or binary arrays, etc.
let obj = { 
	a: ["complex", "object"],
	is: { fine: 2 },
	encode: "as json"
}
let str = JSON.stringify(obj)  // this is the compact version
//let str = JSON.stringify(obj, null, "  ") // human-readable version
console.log(str) // -> suitable for sending on a websocket

let obj1 = JSON.parse(str) 
console.log(obj1) // it's a js object again! 
```

You could even look at the 1st character of a message string (`substring(0,1)`) and see if it `== "{"` to detect a potential JSON-encoded message.

Your server probably wants to maintain a list of clients (sessions) data. It might collect updates from each client, merge them into a combined "scene" representation, and broadcast that scene to all clients.

You might need some way of uniquely identifying each client, so that they can render their own data locally rather than waiting for the server reply.

## Writing your own modules

You can write your own JS modules very easily. It's a good idea if you want to package up some code that will be re-used in many projects. 

It can also be a good way to break up a complex project into smaller components that are easier to work with. 	

`require` can take a relative path, e.g. `require("./mylib")` or `require(path.join(__dirname, "mylib"))` will both find a `mylib.js` in the same folder. 

There are some standard paths that `require` will always look into -- you can check out `module.paths` to know what they are. 

In the code of a module, we declare what it 'exports' to the `require()` call via `module.exports`. Usually it looks like this:

```js
// save as ultimate.js

// module.exports can be a function, an object, an anything really.
// objects make sense when exporting an API:
module.exports = {
	question: "what is the meaning of life?",
	answer: 42,
}
```

```js
// save as test.js

const ultimate = require("./ultimate")

console.log(ultimate.question)
console.log(ultimate.answer)
```