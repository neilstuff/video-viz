# Video Viz

**Clone and run for a quick way to see Electron in action.**

This is a simple Video Album - which can index each index using `ffmpeg2`.

**Use this app along with the [Electron API Demos](http://electron.atom.io/#get-started) app for API code examples to help you get started.**

A basic Video Viz  application directory structure:

- `assets` - contains all javascript,css, and pug for the application.
- `build` - contains the icons for windows and the mac versions.

Files
- `main.js` - Starts the app and creates a browser window to render HTML. This is the app's **main process**.
- `index.pug` - A web page to render. This is the app's **renderer process**.

You can learn more about each of these components within the [Quick Start Guide](http://electron.atom.io/docs/tutorial/quick-start).

## To Use

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/neilstuff/video-viz.git
# Go into the repository
cd video-viz
# Install dependencies
npm install
# To build the application
npm run dist
# Run the app
npm start
```

Note: If you're using Linux Bash for Windows, [see this guide](https://www.howtogeek.com/261575/how-to-run-graphical-linux-desktop-applications-from-windows-10s-bash-shell/) or use `node` from the command prompt.

## Resources for Video Viz

- [www.brittliff.org](https://www.brittliff.org) - all of Electron's documentation


## License

[CC0 1.0 (Public Domain)](LICENSE.md)
