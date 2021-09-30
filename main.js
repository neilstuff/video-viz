'use strict';

const config = require('./config.json');

const electron = require('electron');

const mime = require('mime');
const url = require('url');
const path = require('path');
const fs = require('fs');
const os = require('os');
const pug = require('pug');


const { app } = electron;
const { protocol } = electron;
const { ipcMain } = electron;
const { dialog } = electron;
const { shell } = electron;
const { webContents } = electron;
const { contextBridge } = electron;

const BrowserWindow = electron.BrowserWindow;

const locals = {};
var mainWindow = null

function createWindow() {

    mainWindow = new BrowserWindow({
        width: 1020, height: 805, resizable: true,
        minHeight: 500, minWidth: 800, autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            nativeWindowOpen: true,
            preload: path.join(__dirname, "preload.js")
        }

    });
    mainWindow.setMenu(null);

    if (config.mode == "debug") {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadURL(`pug:///${path.join(__dirname, 'index.pug')}`);

    mainWindow.on('closed', function () {
        mainWindow = null
    });

}

app.allowRendererProcessReuse = true;

app.on('ready', function () {

    protocol.registerBufferProtocol('pug', function(request, callback) {
        let parsedUrl = new URL(request.url);
        let pathname = path.normalize(path.toNamespacedPath(parsedUrl.pathname).startsWith("\\\\?\\") ?
                            parsedUrl.pathname.replace(/^\/*/, '') :  parsedUrl.pathname);
        let ext = path.extname(pathname);

        switch (ext) {
            case '.pug':
                var content = pug.renderFile(pathname);

                callback({
                    mimeType: 'text/html',
                    data: new Buffer.from(content)
                });
                break;

            default:
                let output = fs.readFileSync(pathname);

                return callback({ data: output, mimeType: mime.getType(ext) });
        }

    });

    createWindow();

});

app.on('window-all-closed', function () {
    app.quit()
})

app.on('activate', function () {

    if (mainWindow === null) {
        createWindow()
    }

});

ipcMain.on('quit', function(event, arg) {

    app.quit();

});
