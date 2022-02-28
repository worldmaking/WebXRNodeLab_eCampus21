# WebXRNodeLab_eCampus21

WebXRNodeLab_eCampus21 is a project template for building multi-user WebXR spaces using Three.js (client side) and Node.js (server side). 

An example project using the template can be visited at [https://webxrnodelab.herokuapp.com/](https://webxrnodelab.herokuapp.com/)

![A screenshot of the example project, showing two visitor avatars in a shared navigable world of cuboid objects, and the "Enter VR" button for viewing in VR](screenshot.png)

Image shows a screenshot of the example project, showing two visitor avatars in a shared navigable world of cuboid objects, and the "Enter VR" button for viewing in VR.

## Sister projects

This is one of three projects developed in parallel by OCAD University and York University researchers with the goal of providing students of varying educational backgrounds and skillsets with the necessary toolkits to quickly produce WebXR envrironments for their creative media projects:

- [WebXR Template for Three.js and Node.js](https://github.com/worldmaking/WebXRNodeLab_eCampus21)
- [WebXR Template for P5.js](https://github.com/worldmaking/WebXR_P5js_eCampus21)
- [WebXR Template for A-Frame](https://github.com/ocadwebxr/ocadu-open-webxr)

## Acknowledgements

This project is made possible with funding by the Government of Ontario and through eCampusOntario’s support of the Virtual Learning Strategy. To learn more about the Virtual Learning Strategy visit: https://vls.ecampusontario.ca.

## License

WebXRNodeLab_eCampus21 by The Alice Lab at York University is licensed under the GNU General Public License v3.0, except where otherwise noted.

[Three.js is shared under the MIT license](https://github.com/mrdoob/three.js/blob/dev/LICENSE)

# Manual

## Overview

The template uses a client(browser)/server architecture. 

The client code (Three.js) is used primarily to:
- define and render the virtual world
- communicate with the server via websockets

The server code (Node.js) is used primarily to:
- host the source files and assets used in the world
- synchronize the definition of the world between users (clients)
- continuously synchronize the state of users between all clients, so that visitors can see each other


## Getting Started

The simplest way to start using this template is to fork the github repository [https://github.com/worldmaking/WebXRNodeLab_eCampus21](https://github.com/worldmaking/WebXRNodeLab_eCampus21) and make your changes there. 

You will also need a host server for the server-side Node.js code to share world data and visitor avatar updates. We recommend Heroku as a good option here, as it has built-in support for Node.js and can be tied to your Github project for automatic updates.

# Client code

Client code is all held in the `/public` folder of the repository. All content in this folder is served from the server. 

Client code (e.g. `index.js`) defines how the world is experienced. It is defined largely using the Three.js library.

The first call loads the template module code from `app.mjs`.

## Avatars

To allow flexibility in thinking of what an "avatar" can be in XR, we designed a template that does not attempt to mirror a human form as such, but rather only the minimal components of a VR system (and a near equivalent fallback for non-VR desktop interfaces), comprising a head and a body positioned above ground level. 

End-user code can provide an `avatarize(person)` method to customize how the avatar appears. This method is used for all visitors' avatars, and refers to the common properties of a `Person` instance:

- `body`: a `THREE.Group` representing the position of the person's body, anchored at their feet.
- `head`: a `THREE.Group` representing the pose of the person's head, which will track the VR headset pose or mouse movement accordingly. 
- `hands`: an array of two `THREE.Group` objects that will track a VR users's hands in space. Not be shown for non-VR users. 
- `eyeHeight`: a distance in meters above ground that the eyes are expected to be. This is used for the non-VR avatar, since a VR tracked headset will override this with the actual head height above ground. The default is 1.4m.

Typically the `avatarize()` function will be used to add geometry meshes to the `head` and `body` (and optionally `hands`) groups.


## Navigation

Navigation of a world in VR can be problematic, as any movement of the camera that is not mirroring the human head itself can cause strong nausea (cybersickness). The most common method to alleviate this and still allow navigation is via a metaphor of "teleportation": indicating (e.g. by pointing a ray of light) a point in the distance to teleport to, and pressing a button to jump there instantaneously. 

In contrast, for a non-VR interface, whether 1st-person or 3rd-person, the most familiar mode of navigation is through keyboard and mouse control, such as the classic "WASD" keys for movement and "mouselook" for orientation of view (hold down the left mouse button and drag to change the view direction).

The template here attempts to blend both of these models as closely as possible. For example, since VR immersants have the ability to teleport, WASD immersants are also given the ability teleport, by double-clicking on a location.

## Rooms

The server provides a concept of "rooms", so that the same server can support different groups of users in different worlds at the same time. Each client exists in only one room at once. Any clients in the same-named room will be able to see each other in the same world.

Each room also provides a definition of the content of the world. The first client to enter the room will define the content of the Three.js scene and send it to the server via the `makeWorld()` function. All subsequent visitors to this room will receive this definition, ensuring that they see the same world. 


# Server

The server runs on a Node.js instance. This means that both client and server use a single language (Javascript). It will require a server provider that can host Node.js processes. 

We evaluated three server configurations:
- localhost (single machine) / local area network (LAN)
- Heroku instance
- Compute Canada instance

For security reasons, entering VR using WebXR requires a secure host (HTTPS). 

For a quick tutorial on Node.js, [see nodejs.md](nodejs.md)

The server code is quite straightforward, and contained in a single file (`server.js`)

The server is written using standard libraries of Node.js, along with a small number of 3rd party modules:
- **express** to simplify the creation of a web server
- **ws** for a standardized interface over websockets, for continuous communication between server and clients
- **uuid** to generate unique identifiers for clients

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