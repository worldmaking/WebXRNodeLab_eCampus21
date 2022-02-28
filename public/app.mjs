import * as THREE from './build/three.module.js';
import { VRButton } from './jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from './jsm/webxr/XRControllerModelFactory.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';


class App {
	/** @type {THREE.WebGLRenderer} */
    renderer;
	
	// create a Scene object for the root of the scene graph:
    scene = new THREE.Scene();

	// a list of objects that are valid teleport targets:
	teleportable = [];
	
	// for timing purposes:
    clock = new THREE.Clock();

	// two separate cameras, one for VR, one for desktop use:
	/** @type {THREE.PerspectiveCamera} */
	camera;
	cameraVR = new THREE.PerspectiveCamera();


	// retain keyboard state:
	keyboard = {
        held: {
          KeyW: 0,
          KeyA: 0,
          KeyS: 0,
          KeyD: 0,
          Space: 0,
          ShiftLeft: 0,
          ShiftRight: 0,
          // etc.
        },
    };

	mouse = {
        pos: new THREE.Vector2(),
		dblclick: false,
    };

	THREE = THREE;

	constructor() {
		// create a new WebGL renderer for the app:
        let renderer = new THREE.WebGLRenderer({antialias:true});
		this.renderer = renderer;
		// configure its size to fill the window at full pixel resolution:
		renderer.setPixelRatio(window.devicePixelRatio);
    	renderer.setSize(window.innerWidth, window.innerHeight);
		// allow WebXR rendering:
        renderer.xr.enabled = true;

		// add a <canvas> tag to the page for the renderer:
		document.body.appendChild(this.renderer.domElement);
		// overlay an "Enter VR" button on the page:
        document.body.appendChild(VRButton.createButton(this.renderer));
		// give the canvas keyboard focus:
		renderer.domElement.setAttribute('tabindex', 0);
		renderer.domElement.focus();

		// WASD camera:
		let camera = new THREE.PerspectiveCamera(
			75, // this camera has a 75 degree field of view in the vertical axis
			window.innerWidth / window.innerHeight, // the aspect ratio matches the size of the window
			0.05, // anything less than 5cm from the eye will not be drawn
			100 // anything more than 100m from the eye will not be drawn
		  );
		this.camera = camera;
		// initial position of the camera 
		// the Y axis points up from the ground
		// the Z axis point out of the screen toward you
		camera.position.y = 1.4;
		camera.position.z = 3;

		// update camera & renderer when display is resized
		window.addEventListener(
			'resize',
			function () {
				// ensure the renderer fills the page, and the camera aspect ratio matches:
				renderer.setSize(window.innerWidth, window.innerHeight);
				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
			},
			false
		);

		// keyboard handling:
		window.addEventListener('keydown', e => {
			this.keyboard.held[e.code] = 1;
			//console.log(e.code);
		});
		window.addEventListener('keyup', e => {
			this.keyboard.held[e.code] = 0;

			// // mode selector
			// if (e.code == 'Digit1') {
			// 	isFirstPerson = true;
			// } else if (e.code == 'Digit3') {
			// 	isFirstPerson = false;
			// 	setZoom();
			// }
		});

		window.addEventListener(
			'mousemove',
			e => {
			  // calculate mouse position in normalized device coordinates
			  // (-1 to +1) for both components
			  this.mouse.pos.x = (e.clientX / window.innerWidth) * 2 - 1;
			  this.mouse.pos.y = -(e.clientY / window.innerHeight) * 2 + 1;
			},
			false
		);

		window.addEventListener(
			'dblclick',
			e => {
				this.mouse.dblclick = true;
			},
			false
		);
	}
};


const UP_VECTOR = new THREE.Vector3(0, 1, 0);

class Person {
	// the main player group,
	// anchored at the avatar's feet
	// but without any rotation
	group = new THREE.Group();

	// the player's eye group,
	// used as the focal point of the orbit controls:
	head = new THREE.Group();

	// the player's body group,
	// useful to attach an avatar to
	body = new THREE.Group();

	// groups for the avatar hands:
	hands = [new THREE.Group(), new THREE.Group()];

	eyeHeight = 1.4;

	constructor(app) {
		let { scene, camera, renderer } = app;
		scene.add(this.group);
		this.group.add(this.body);
		this.group.add(this.hands[0]);
		this.group.add(this.hands[1]);
		this.hands[0].visible = false;
		this.hands[1].visible = false;
		// this will be the focus of orbit controls
		// (replace with a Group to get rid of the axes)
		this.head.position.set(0, this.eyeHeight, 0);
		this.group.add(this.head);
	}

	// call after any changes to group position:
	updateMatrixWorld() {
		this.group.updateMatrixWorld();
	}
}

// make a player character:
class Player {
	// the main player group,
	// anchored at the avatar's feet
	// but without any rotation
	group = new THREE.Group();

	// the player's eye group,
	// used as the focal point of the orbit controls:
	head = new THREE.Group();

	// the player's body group,
	// useful to attach an avatar to
	body = new THREE.Group();

	// groups for the avatar hands:
	hands = [new THREE.Group(), new THREE.Group()];

	// a group that is always below the player's feet
	// but stays on the ground
	floor = new THREE.Group();

	eyeHeight = 1.4;

	// a group to store the current teleport target:
	teleport = new THREE.Group();
	// the VR controllers will be here:
	controllers = [null, null];

	// navigation controls
	isOnGround = true;
	isFirstPerson = false;
	move = new THREE.Vector3();
	vel = new THREE.Vector3();

	speed = 3;
	JUMP = 8;
	GRAVITY = -0.2;

	/** @type {THREE.OrbitControls} */
	orbitControls;

	// re-usable objects:
	// computes the bounding box of any mesh:
	bbox = new THREE.Box3();
	// intersects a ray with objects:
	raycaster = new THREE.Raycaster();
	tempMatrix = new THREE.Matrix4();

	constructor(app) {
		let { scene, camera, renderer } = app;
		scene.add(this.group);
		scene.add(this.floor);
		this.group.add(this.body);
		this.group.add(this.hands[0]);
		this.group.add(this.hands[1]);
		this.hands[0].visible = false;
		this.hands[1].visible = false;

		// this will be the focus of orbit controls
		// (replace with a Group to get rid of the axes)
		this.head.position.set(0, this.eyeHeight, 0);
		this.group.add(this.head);

		this.orbitControls = new OrbitControls(camera, renderer.domElement);
		this.setZoom(app);

		// reposition vr space at avatar feet:
		this.floor.add(app.cameraVR);

		// the teleport target indicator:
		scene.add(this.teleport);
		{
			const geometry = new THREE.CircleGeometry( 1, 32 );
			geometry.rotateX(-Math.PI/2)
			geometry.translate(0, 0.05, 0)
			const material = new THREE.MeshBasicMaterial( { 
				color: 0xaaaaaa, 
				transparent: true, 
				opacity: 0.5,
				side: THREE.DoubleSide,
				combine: THREE.MixOperation,
			} );
			const circle = new THREE.Mesh( geometry, material );
			this.teleport.add( circle );
		}
		this.teleport.visible = false;


		// VR controller setup:
		const controllerModelFactory = new XRControllerModelFactory();
		for (let i = 0; i < 2; i++) {
			let controller = renderer.xr.getController(i);
			controller.visible = false;

			// crucial: add controllers to player's coordinate space
			this.floor.add(controller);

			const beam = new THREE.Line(
				new THREE.BufferGeometry().setFromPoints([
					new THREE.Vector3(0, 0, 0),
					new THREE.Vector3(0, 0, -1),
				])
			);
			beam.name = 'beam';
			beam.scale.z = 5;

			controller.addEventListener('connected', e => {
				controller.visible = true;

				/*
				XRInputSource {
					handedness: 'left' or 'right' or fail,
					targetRayMode: 'tracked-pointer' or 'gaze'
					targetRaySpace: XRSpace, 
					gripSpace: XRSpace, 
					gamepad: Gamepad {
					axes: (4) [0, 0, 0, 0]
					buttons: (5) [GamepadButton {pressed: false, touched: false, value: 0}, GamepadButton, GamepadButton, GamepadButton, GamepadButton]
					connected: true
					id: "", index: -1, mapping: "xr-standard", timestamp: 16501.39999985695, vibrationActuator: null
					},
					profiles: (2) ['valve-index', 'generic-trigger-squeeze-touchpad-thumbstick']
				}
				*/
				const session = renderer.xr.getSession();
				controller.userData.source = session.inputSources[i];

				switch (e.data.targetRayMode) {
					case 'tracked-pointer':
						let geometry, material;
						geometry = new THREE.BufferGeometry();
						geometry.setAttribute(
							'position',
							new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3)
						);
						geometry.setAttribute(
							'color',
							new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3)
						);

						material = new THREE.LineBasicMaterial({
							vertexColors: true,
							blending: THREE.AdditiveBlending,
						});
						controller.add(new THREE.Line(geometry, material));

						// also add the beam:
						controller.add(beam);
					break;

					case 'gaze':
					// geometry = new THREE.RingGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
					// material = new THREE.MeshBasicMaterial( { opacity: 0.5, transparent: true } );
					break;
				}
			});
			controller.addEventListener('disconnected', e => {
				controller.visible = false;
			});

			controller.addEventListener('selectstart', e => {
				controller.userData.selected = true;
			});
			controller.addEventListener('selectend', e => {
				controller.userData.selected = false;
			});

			let controllerGrip = renderer.xr.getControllerGrip(i);
			controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
			this.floor.add(controllerGrip);

			this.controllers[i] = controller;
		}
	}

	setZoom(app, d = 5) {
        app.camera.position
          .sub(this.orbitControls.target)
          .normalize()
          .multiplyScalar(d)
          .add(this.orbitControls.target);
    }

	azimuthFromQuaternion(q) {
        let s = 2 * (q._w * q._y + q._z * q._x);
        let c = 1 - 2 * (q._x * q._x + q._y * q._y);
        return Math.atan2(s, c);
    }

	
	updateVR(dt, app) {
		let { teleportable, cameraVR } = app;
		
		// hide self in VR
		this.group.visible = false;

		// update controllers (incl. teleporting)
		for (let i = 0; i < 2; i++) {
            let controller = this.controllers[i];
            // use controller if available
            if (!controller || !controller.visible) continue;

			const isTeleportHand = (i==0);

			const source = controller.userData.source;
            if (source && source.gamepad) {
				// const gamepad = source.gamepad;
				// const buttons = [];
				// for (let btn of gamepad.buttons) {
				// 	buttons.push({
				// 		touched: btn.touched,
				// 		pressed: btn.pressed,
				// 		value: btn.value,
				// 	});
				// }
			}

			const beam = controller.getObjectByName('beam');
            if (beam) {
				// construct ray based on controller:
				this.tempMatrix.identity().extractRotation(controller.matrixWorld);
				this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
				this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
				this.raycaster.firstHitOnly = true;
				let intersects = this.raycaster.intersectObjects(teleportable);
				let is = intersects[0];
				if (is) {
					beam.scale.z = is.distance;

					if (isTeleportHand) {
						// compute teleport target:
						this.bbox.setFromObject(is.object);
						this.teleport.position.set(is.point.x, this.bbox.max.y, is.point.z);
						this.teleport.visible = true;
					}
				} else {
					if (isTeleportHand) { this.teleport.visible = false; }
					beam.scale.z = 5;
				}
				
				// actually teleport:
				if (isTeleportHand && controller.userData.selected) {
					controller.userData.selected = false;

					let target = this.teleport.position.clone();
					// add current headset x,z so that we end up standing on top of our target point:
					target.x -= cameraVR.position.x;
					target.z -= cameraVR.position.z;
				  
					this.group.position.copy(target);
					this.floor.position.copy(target);
				}
			}
		}
		this.positionChanged(app);

		// player.head should always look in the same direction as VR headset:
		this.head.quaternion.copy(cameraVR.quaternion);
		// player.group should match the VR camera,
		// but the group should be on the floor,
		// and the VR camera Y position sets the head
		cameraVR.getWorldPosition(this.group.position);
		this.head.position.y = cameraVR.position.y;
		this.group.position.y = this.floor.position.y;
		// rotate body to face same direction as head?
		// this is currently tricky because we parented the head to the group
		let angle = this.azimuthFromQuaternion(cameraVR.quaternion);
		let q = new THREE.Quaternion();
		q.setFromAxisAngle(UP_VECTOR, angle);
		this.body.quaternion.slerp(q, 0.02);
	}


	update(dt, app) {
		let { camera, mouse, keyboard, teleportable } = app;

		// hide self in VR
		this.group.visible = !this.isFirstPerson;

		// teleport?
		if (this.teleport.visible && mouse.dblclick) {
			mouse.dblclick = false;
			let target = this.teleport.position.clone();
			
			this.group.position.copy(target);
			this.floor.position.copy(target);
			this.positionChanged(app);
		}

		if (this.isFirstPerson) {
            this.orbitControls.maxPolarAngle = Math.PI;
            this.orbitControls.minDistance = 1e-4;
            this.orbitControls.maxDistance = 1e-4;
        } else {
            this.orbitControls.maxPolarAngle = Math.PI / 2;
            this.orbitControls.minDistance = 1;
            this.orbitControls.maxDistance = 20;
        }
		this.orbitControls.update(dt);

		const angle = this.orbitControls.getAzimuthalAngle(); // -PI to +PI

		// move the player
		// can't change WASD motion while falling/jumping!
		if (this.isOnGround) {
		this.move = new THREE.Vector3(
			keyboard.held.KeyD - keyboard.held.KeyA,
			0,
			keyboard.held.KeyS - keyboard.held.KeyW
		);
		this.move.normalize();
		// rotate by view angle
		this.move.applyAxisAngle(UP_VECTOR, angle);
		}
		this.group.position.addScaledVector(this.move, this.speed * dt);

		// head always follows camera view:
		this.head.quaternion.setFromAxisAngle(UP_VECTOR, angle);
		// rotate body to face in same direction:
		// console.log(angle, object.rotation.y);
		this.body.quaternion.slerp(this.head.quaternion, 0.1);

		// did we fall to oblivion?
		if (this.group.position.y < -25) {
		  this.group.position.set(0, 10, 0);
		  this.vel.y = 0;
		}

		this.isOnGround = false;
		let raypt = this.group.position.clone();
		raypt.y += this.eyeHeight;
		this.raycaster.set(raypt, new THREE.Vector3(0, -1, 0));
		this.raycaster.firstHitOnly = true;
		let intersects = this.raycaster.intersectObjects(teleportable);
		if (intersects.length) {
			let is = intersects[0];
			// .distance, .point, .object
			//box.setFromObject(is.object);
			this.bbox.setFromObject(is.object);
			this.floor.position.set(is.point.x, this.bbox.max.y, is.point.z);
			// if player is below this point, lift it up:
			if (this.group.position.y <= this.bbox.max.y + 0.01) {
				this.group.position.lerp(this.floor.position, 0.5);
				this.isOnGround = true;
			}
		}

		if (this.isOnGround) {
            this.vel.y = 0;
            if (keyboard.held.Space) {
              // jump:
              this.vel.y += this.JUMP;
            }
        } else {
            // fall:
            this.vel.y += this.GRAVITY;
        }

        this.group.position.addScaledVector(this.vel, dt);
		this.positionChanged(app);
		

		// teleport targetting:
		{
			this.raycaster.setFromCamera(mouse.pos, camera);
			this.raycaster.firstHitOnly = true;
			const intersects = this.raycaster.intersectObjects(teleportable);
			// apply filters to intersects to exclude any items we are not interested in
			// e.g.: only intersect with mesh faces that point mostly upwards:
			//intersects = intersects.filter(o => o.face && o.face.normal && o.face.normal.y > 0.7)
			const is = intersects[0];
			if (is) {
				// compute teleport target:
				this.bbox.setFromObject(is.object);
				this.teleport.position.set(is.point.x, this.bbox.max.y, is.point.z);
				this.teleport.visible = true;
			} else {
				this.teleport.visible = false;
			}
		}
	}

	positionChanged(app) {
		let { camera } = app;

		this.group.updateMatrixWorld();
		this.floor.updateMatrixWorld();

		// always do this, even in VR, so that it updates our desktop view too:
		// recentre orbitcontrols around our new position:
		camera.position.sub(this.orbitControls.target);
		// copy head position into orbit target:
		this.head.getWorldPosition(this.orbitControls.target);
		camera.position.add(this.orbitControls.target);
	}
};


export { App, Person, Player };