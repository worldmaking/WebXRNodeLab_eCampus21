import * as THREE from './build/three.module.js';
import Stats from './jsm/libs/stats.module.js';
import { VRButton } from './jsm/webxr/VRButton.js';

class App {
	/** @type {THREE.WebGLRenderer} */
    renderer;
    /** @type {THREE.Scene} */
    scene;
	/** @type {THREE.Clock} */
    clock;

	constructor() {
		// create a new WebGL renderer for the app:
        this.renderer = new THREE.WebGLRenderer({antialias:true});
		// configure its size to fill the window at full pixel resolution:
		this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
		// allow WebXR rendering:
        this.renderer.xr.enabled = true;

		// add a <canvas> tag to the page for the renderer:
		document.body.appendChild(this.renderer.domElement);
		// overlay an "Enter VR" button on the page:
        document.body.appendChild(VRButton.createButton(this.renderer));


		// create a Scene object for the root of the scene graph:
		this.scene = new THREE.Scene();

	}
};




const app = new App();







//////////////////////////////////////////////////////////////
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

	location.reload()
}

socket.onmessage = function(msg) {
	console.log(msg.data)
}
