/* Handle global keyboard shortcuts */
const { globalShortcut, app, BrowserWindow } = require("electron");
var appdir = app.getAppPath();

app.on("ready", () => {
    globalShortcut.register("CommandOrControl+Alt+A", () => {
        app.showAboutPanel();
    });
    globalShortcut.register("CommandOrControl+Alt+I", () => {
        global.PageView.webContents.toggleDevTools();
        /*if (global.SplashWindow)
        SplashWindow.webContents.toggleDevTools();*/
    });
    globalShortcut.register("CommandOrControl+Alt+R", () => {
        global.PageView.webContents.loadFile(`${appdir}/src/view/index.html`);
    });
});