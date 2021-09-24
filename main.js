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

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.pug'),
        protocol: 'pug',
        slashes: true
    }))

    mainWindow.on('closed', function () {
        mainWindow = null
    })

}

app.allowRendererProcessReuse = true;

app.on('ready', function () {

    protocol.registerBufferProtocol('pug', function (request, callback) {

        let parsedUrl = require('url').parse(request.url);
        var url = path.normalize(request.url.replace(os.type() == 'Windows_NT' ? 'pug:///' : 'pug://', ''));
        let ext = path.extname(url);

        switch (ext) {
            case '.pug':
                var content = pug.renderFile(url);

                callback({
                    mimeType: 'text/html',
                    data: Buffer.from(content)
                });
                break;

            default:
                console.log(url);
                let output = fs.readFileSync(url);

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
