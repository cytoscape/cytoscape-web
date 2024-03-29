# Cytoscape Web

## Development environment
### Build dependencies
Install `node` and `npm`. The easiest way is to download both from [offical website](https://nodejs.org/en/).

- Node.js 16.8.0 or later version is required.

After installation, run `node -v` and `npm -v` to check.

The next step is to install yarn. Run `npm install --global yarn`

- yarn 1.22.11 or later version is required.

Check that Yarn is installed by running:

`yarn --version`

### Build instructions

Run a command using `yarn <command>`.  Run `yarn install` before using other commands.

- `dev`: run a dev server that watches code changes, open `localhost:5500` in your web browser. By default this app points to [NDEx dev server] (https://dev.ndexbio.org), please create an account on the NDEx dev server with a email that links to your Google account before trying to setup your own dev environment for Cytoscape Web.
- `build`: build the app for production
- `lint`: lint code according to the eslint config
- `format`: format source code according to eslint and prettier configs
- `test`: run tests

## Deploy on Netlify
All branches will have deploy previews automatically once changes pushed to github. The url is:
`branch name`--incredible-meringue-aa83b1.netlify.app  

For example, if the branch is development, the url is <https:development--incredible-meringue-aa83b1.netlify.app>

It usually takes few minutes to reflect changes.

## Build for production

`export NODE_ENV=production`

`npm run build`


## Troubleshooting
This section lists solutions to problems you might encounter with Cytoscape web.

### Debug
Use developer tools in browser to check the error message. Then we recommend using Visual Studio Code debugger to debug.

### Blank Workspace or Fail to Load Any Networks
Possible solutions:
- Use a new incognito window to open Cytoscape web
- Clear browsing data include cookies
- In developer tools, go to Application page,find IndexedDB in session storage. Click `Delete database`.
