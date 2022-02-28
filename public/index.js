import * as THREE from './build/three.module.js';
import { RoundedBoxGeometry } from './jsm/geometries/RoundedBoxGeometry.js';

// pull in the standard classes defined in the app.mjs module:
import { App, Player, Person } from "./app.mjs"

// create a Three.js application:
let app = new App();

let { renderer, scene, clock, camera, keyboard, mouse, teleportable } = app;

renderer.setClearColor(0x000000, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.soft = true;
//renderer.shadowMap.type = THREE.PCFShadowMap; // default THREE.PCFShadowMap
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

{
	const hemiLight = new THREE.HemisphereLight(0x999999, 0x333333, 1);
	hemiLight.position.set(10, 10, 10);
	scene.add(hemiLight);

	const dirLight = new THREE.DirectionalLight(0xffffee, 1);
	dirLight.position.set(30, 50, 40);
	dirLight.castShadow = true;
	scene.add(dirLight);
	//Set up shadow properties for the light
	dirLight.shadow.mapSize.width = 2048;
	dirLight.shadow.mapSize.height = 2048;
	dirLight.shadow.camera.near = 20;
	dirLight.shadow.camera.far = 100;
	dirLight.shadow.camera.left = 30;
	dirLight.shadow.camera.bottom = 30;
	dirLight.shadow.camera.right = -30;
	dirLight.shadow.camera.top = -30;
}


function makeWorld() {
	// make a jumbled up world
	const world = new THREE.Scene()
	const cubegeom = new THREE.BoxGeometry(6, 0.2, 6);
	for (let z = -10; z < 30; z += 4) {
		for (let x = -30; x < 30; x += 4) {
			let lim = Math.max(Math.abs(x), Math.abs(z)) / 2;
			const cubemat = new THREE.MeshStandardMaterial({
				color: new THREE.Color(
					THREE.MathUtils.randFloat(0.6, 0.8),
					THREE.MathUtils.randFloat(0.6, 0.8),
					THREE.MathUtils.randFloat(0.6, 0.8)
				),
			});
			const democube = new THREE.Mesh(cubegeom, cubemat);
			democube.position.set(x, THREE.MathUtils.randFloat(-lim, lim) - 1, z);
			democube.rotation.y = THREE.MathUtils.randFloat(-Math.PI, Math.PI);
			democube.updateMatrix()
			democube.castShadow = true;
			democube.receiveShadow = true;
			world.add(democube);

			democube.userData.teleportable = true
		}
	}
	return world.toJSON()
}


//////////////////////////////////

function avatarize(player) {
	// add avatar:
	const avatar_geom = new RoundedBoxGeometry(
		player.eyeHeight * 0.4,
		player.eyeHeight * 0.8,
		player.eyeHeight * 0.2,
		10,
		0.5
	);
	avatar_geom.translate(0, player.eyeHeight * 0.4, 0);
	let avatar = new THREE.Mesh(avatar_geom,new THREE.MeshStandardMaterial());
	avatar.castShadow = true;
	player.body.add(avatar);

	const avatar_head_geom = new RoundedBoxGeometry(0.3, 0.4, 0.25, 10, 0.2);
	avatar_head_geom.translate(0, 0.1, 0);
	let avatar_head = new THREE.Mesh(avatar_head_geom, new THREE.MeshStandardMaterial());
	avatar_head.castShadow = true;
	player.head.add(avatar_head);


	const avatar_hand_geom = new RoundedBoxGeometry(0.3, 0.4, 0.25, 10, 0.2);
	const avatar_hand_mat = new THREE.MeshStandardMaterial();
	for (let i = 0; i < 2; i++) {
	let avatar_hand = new THREE.Mesh(avatar_hand_geom, avatar_hand_mat);
		//avatar_hand.position.set(PLAYER_HEIGHT * 0.2 * (i ? -1 : 1), PLAYER_HEIGHT/2, 0)
		avatar_hand.castShadow = true;
		player.hands[i].add(avatar_hand);
	}

	return player
}



let persons = []


let player = new Player(app);
avatarize(player)

function animate() {
	let { camera, cameraVR, renderer, scene } = app;
	// get current timing:
	const dt = clock.getDelta();
	const t = clock.getElapsedTime();

	// draw the scene:
	if (renderer.xr.isPresenting) {
		player.updateVR(dt, app)
		renderer.render(scene, cameraVR);
	} else {
		player.update(dt, app)
		renderer.render(scene, camera);
	}
}
// start!
renderer.setAnimationLoop(animate);


////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////
// connect to websocket at same location as the web-page host:
let room = "/main"
const addr = location.origin.replace(/^http/, 'ws') + room
console.log("connecting to", addr)

// this is how to create a client socket in the browser:
let socket = new WebSocket(addr);
let uid = ""

function addWorld(json) {
	const loader = new THREE.ObjectLoader();
	const world = loader.parse( json );
	console.log(world)
	scene.add(world)
	world.traverse(obj => {
		if (obj.userData.teleportable) teleportable.push(obj)
	})
}

// let's know when it works:
socket.onopen = function() { 
    // or document.write("websocket connected to "+addr); 
    console.log("websocket connected to "+addr); 

	socket.send("hello")
}
socket.onerror = function(err) { 
    console.error(err); z
}
socket.onclose = function(e) { 
    console.log("websocket disconnected from "+addr); 
	uid = ""

	location.reload()
}

socket.onmessage = function(e) {
	if (e.data.charAt(0) == "{") {
		let msg = JSON.parse(e.data)
		switch(msg.cmd) {
			case "handshake": {
				uid = msg.uid
				if (msg.needWorld) {
					// reply with a world:
					socket.send(JSON.stringify({ 
						cmd:"world", 
						room: room,
						world:makeWorld() 
					}))
				} else if (msg.world) {
					addWorld(msg.world)
				}
			} break;
			case "clients": {
				let clients = msg.clients.filter(v => v.uid != uid)

				// map to persons:
				for (let i=persons.length; i<clients.length; i++) {
					persons[i] = avatarize(new Person(app))
				}

				for (let i in clients) {
					let client = clients[i]
					let person = persons[i]
					if (client.group) person.group.position.fromArray(client.group.p)
					if (client.body) person.body.quaternion.fromArray(client.body.q)
					if (client.head) person.head.position.fromArray(client.head.p)
					if (client.head) person.head.quaternion.fromArray(client.head.q)
				}
			} break;
			case "world": {
				addWorld(msg.world)
			}
			default: console.log(msg)
		}
	} else {
		console.log(e.data)
	}
}

setInterval(() => {
	if (socket && socket.readyState==1 && uid) {
		socket.send(JSON.stringify({
			cmd: "pose",
			uid: uid,
			data: {
				group: {
					p: player.group.position.toArray(),
				},
				body: {
					q: player.body.quaternion.toArray(),
				},
				head: {
					p: player.head.position.toArray(),
					q: player.head.quaternion.toArray(),
				}
			}
		}))
	}
}, 1000/30);