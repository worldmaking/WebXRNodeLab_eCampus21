

# Client

For security reasons, entering VR using WebXR requires a secure host (HTTPS). 



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