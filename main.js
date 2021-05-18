'use strict';

const config = require('./config.json');

const electron = require('electron');

const mime = require('mime');
const url = require('url');
const path = require('path');
const fs = require('fs');
const pug = require('pug');

const app = electron.app;
const ipcMain = electron.ipcMain;
const dialog = electron.dialog;
const protocol = electron.protocol;

const nativeImage = electron.nativeImage;
const BrowserWindow = electron.BrowserWindow;

const locals = {};
var mainWindow = null

function createWindow() {

    mainWindow = new BrowserWindow({
        width: 1220, height: 805, resizable: true,
        minHeight: 500, minWidth: 800, autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true
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
        var url = path.normalize(request.url.replace('pug:///', ''));
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

ipcMain.on('select-directory', async (event, arg) => {
    var result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    })

    console.log("FileName: " + result.canceled + ":" + result.filePaths);

    event.returnValue = {
        status : result.canceled,
        filePaths : result.filePaths
    };

});