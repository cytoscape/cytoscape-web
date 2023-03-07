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

- `dev`: run a dev server that watches code changes, open `localhost:5500` in your web browser
- `build`: build the app for production
- `lint`: lint code according to the eslint config
- `format`: format source code according to eslint and prettier configs
- `test`: run tests

## Deploy on Netlify
All branches will have deploy previews automatically once changes pushed to github. The url is:
`branch name`--incredible-meringue-aa83b1.netlify.app  

For example, if the branch is development, the url is <https:development--incredible-meringue-aa83b1.netlify.app>

It usually takes few minutes to reflect changes.
