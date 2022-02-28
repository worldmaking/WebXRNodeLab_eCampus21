

# Client


## Rooms

The first visitor to a room is able to define the room's scene?

- server notifies client that it is the first user
	- client creates world, and serializes it (scene.toJSON())

- server notifies client that it is nth user, including world JSON
	- client deserializes and adds world-scene


## Avatar

To allow flexibility in thinking of what an "avatar" can be in XR, we designed a template that does not attempt to mirror a human form as such, but rather only the essential components of a VR system (and a near equivalent fallback for non-VR desktop interfaces). The essential components of a tracked VR input are:
- head (headset)
- hands (controllers)
- floor space

Navigation of a world in VR can be problematic, as any movement of the camera that is not mirroring the human head itself can cause strong nausea (cybersickness). The most common method to alleviate this and still allow navigation is via a metaphor of "teleportation": indicating (e.g. by pointing a ray of light) a point in the distance to teleport to, and pressing a button to jump there instantaneously. 

In contrast, for a non-VR interface, whether 1st-person or 3rd-person, the most familiar mode of navigation is through keyboard and mouse control, such as the classic "WASD" keys for movement and "mouselook" for orientation of view. 

The toolkit here attempts to blend both of these models as closely as possible. For example, since VR immersants have the ability to teleport, WASD immersants are also given the ability teleport, by double-clicking on a location.

scene
- group
	- eyes
	- body
	- hands[]
- floor
- teleport

WASD:
- orbit get azimuth, kb get move
- add to group.position
- set eyes quat from oribit
- slerp body quat from orbit azimuth
- check for fall to abyss / reset
- raycast from head downwards to find floor
- if found:
	- use this to set floor position
	- if group Y is below floor, lerp it up
	- mark as on ground
- if on ground:
	- zero y velocity
	- if space held, add y velocity
- else
	- apply gravity to y vel
- add velocity to group

BOTH:
- update group/floor matrices
- sync orbit & camera

VR:
- copy camvr quat to eyes
- update eyes/group Y position
- slerp body to match head rotation
- update teleport ray by controller, set target




- Avatar room centre
	- VR: avatar can wander away from this centre
- Avatar floor position
- Avatar feet: can be different from floor if avatar jumps?
- Avatar eyes:
	- VR: matches headset. Body etc. needs to follow it.
	- WASD: oriented by mouse. 
- Avatar body:
	- stretches as headset crouches etc
- Avatar hands:
- Teleport target:
	- VR: from controller ray
	- WASD: from camera-mouse ray

For a room-scale VR participant, we have to distinguish the "room centre" coordinate system from several other objects:
- The pose of the head -- which matches headset
	- This may force the body to "compress" or "stretch" to match the person's height, and if the person crouches down etc.
- The pose of the hands/controllers
- The (estimated) pose of the feet: typically below the headset at room floor level, and gradually oriented to match the headset azimuth
- The position of a teleport target point (e.g. from a ray from a controller)

For a WASD:
- The pose of the camera under mouse control; in 1st person this is synonymous with the avatar head, in 3rd person it could be some distance behind it. It would normally be a fixed distance from the floor. A "crouch" command could move it down, forcing the body to compress. 
- The (estimated) pose of the feet: typically below the head at room floor level, and gradually oriented to match the head azimuth 


## Multi-user



# Server

The server runs on a Node.js instance. This means that both client and server use a single language (Javascript). It will require a server provider that can host Node.js processes. 

For a quick tutorial on Node.js, [see nodejs.md](nodejs.md)

We evaluated three server configurations:
- localhost (single machine) / local area network (LAN)
- Heroku instance
- Compute Canada instance

For security reasons, entering VR using WebXR requires a secure host (HTTPS). 

## Localhost

As WebXR requires HTTPS security, setting up for a localhost server requires creating and installing your own SSL certificate on the local machine. The process to do this varies by platform and browser and is beyond the scope of this documentation. 

## Heroku

Heroku provides server space and bandwidth with the ability to run Node.js under a flexible and powerful control panel. One nice thing is that, if you have set up a Github account, you can link a github repository to a Heroku site, so that each time you push to your github repository, it automatically updates and reloads the web server. 

- [Sign up here](https://signup.heroku.com)
- It gives you 550 free "dyno" hours per month. 
- [Getting started guide](https://devcenter.heroku.com/categories/nodejs-support)

One unusual quirk: Heroku sites are secure (https) by default, even if you set them up using `http` rather than `https`. 

**Linking to a Github repo**

- Once you are logged in to Heroku, on the Dashboard, select New / Create new app, name it, and Create
- Under the Deploy tab, under Deployment method, select Github: Connect to Github
- Now pick the Github repo name and click Search, and when it finds it, Connect
- Turn on "Enable Automatic Deploys" and every `git push` will update the site
- Now Deploy Branch (or git push)
- The progress and success/errors will be under the Activity tab