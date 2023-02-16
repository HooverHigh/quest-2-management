const { execFileSync } = require("child_process");
const { fstat } = require("fs");
const { type } = require("os");
const path = require("path");

/* Helper functions */
function lines(text) {
    return text.split('\n');
};
/* Set ADB and SCRCPY Path */
var adbexec = 'adb';
var scrcpyexec = 'scrcpy';
if (os.platform() === 'win32') {
    adbexec = 'adb.exe';
    scrcpyexec = 'scrcpy.exe';
};
var adbexecutable = path.join(rootpath, 'lib', 'platform-tools', adbexec);
var srccpyexecutable = path.join(rootpath, 'lib', 'scrcpy', scrcpyexec);
switch(os.platform()) {
    case "linux":
        if (os.arch() == "arm") {
            adbexecutable = path.join('/usr', 'bin', adbexec);
        }
        break;
    default:
        break;
}
if (debug == true) {
    console.log(adbexecutable);
    console.log(srccpyexecutable);
}

module.exports = {
    exec: function (command) {
        //console.log("ADB Command to run", command);
        if (typeof command != "object") {
            command = command.split(' ');
        }
        const adb = execFileSync(adbexecutable, command, {
            cwd: `${rootpath}`
        });
        return adb.toString();
    },
    goHome: function () {
        const adb = execFileSync(adbexecutable, ["shell", "am", "start", "-W", "-c", "android.intent.category.HOME", "-a", "android.intent.action.MAIN"], {
            cwd: `${rootpath}`
        });
        var out = adb.toString();
    },
    showScreen(eye) {
        var arg;
        if (eye == "both") {
            arg = `-w -m 1600 -b 25M --window-title Quest2-Left-And-Right-Eye`;
        } else {
            arg = `-w --crop 1200:800:190:420 -m 1600 -b 25M`;
        }
        console.log(srccpyexecutable, arg.split(' '));
        const adb = spawn(srccpyexecutable, arg.split(' '), {
            cwd: `${rootpath}`
        });
        adb.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        adb.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
        adb.on('error', (data) => {
            console.error(`adb ERR: ${data}`);
        });
        adb.on('close', (code) => {
            console.log(`adb exited with code ${code}`);
        });
    },
    screenRecord: function (eye) {
        /*scrcpy.on('data', (pts, data) => {
            console.log(`[${data}] Data: ${data.length}b`);
            const b64 = Buffer.from(data).toString('base64');
            fs.writeFileSync(path.join(rootpath, 'screen.png'), b64);
            fs.writeFileSync(path.join(rootpath, 'screen2.png'), data);
        });

        scrcpy.start()
            .then(info => console.log(`Started -> ${info.name} at ${info.width}x${info.height}`))
            .catch(e => console.error('Impossible to start', e));*/

        h
    },
    isSetup: function () {
        const adb = execFileSync(adbexecutable, ['shell', 'pm', 'list', 'packages', 'HooverHigh.QuestAppLauncher'], {
            cwd: `${rootpath}`
        });
        var out = adb.toString();
        if (out == "package:HooverHigh.QuestAppLauncher\r\n") {
            console.log("HooverHigh Quest launcher is installed!");
            return true;
        } else {
            console.log("HooverHigh Quest launcher not installed!");
            return false;
        }
    },
    installApp: function (apk, grantallperms) {
        var cmd = `install ${apk}`;
        if (grantallperms == true) {
            cmd = `install -g ${apk}`
        }
        const adb = execFileSync(adbexecutable, cmd.split(' '), {
            cwd: `${rootpath}`
        });
        return adb.toString();
    },
    uninstallApp: function (appname) {
        var cmd = `uninstall ${appname}`;
        const adb = execFileSync(adbexecutable, cmd.split(' '), {
            cwd: `${rootpath}`
        });
        return adb.toString();
    },
    getStorageDEV: function () {
        const adb = execFileSync(adbexecutable, ['shell', 'df', '-h'], {
            cwd: `${rootpath}`
        });
        var out = adb.toString();
        //console.log(out);
        if (out == "Filesystem      Size  Used Avail Use% Mounted on\r\n\r\n") {
            console.log("No storage detected");
            return;
        };
        const storage = [];
        if (!out.length) { return storage; }
        for (var line of Array.from(out.toString('ascii').split('\n'))) {
            if (line) {
                var filtered = line.split(' ').filter(function (el) {
                    return el != '';
                });
                var [filesystem, size, used, avail, use, mount] = filtered;
                if (typeof size != undefined && typeof size != "undefined") {
                    //console.log(size);
                    size = size.replace(/[           ]/g, '');
                }
                if (typeof used != undefined && typeof used != "undefined") {
                    //console.log(used);
                    used = used.replace(/[           ]/g, '');
                }
                if (typeof avail != undefined && typeof avail != "undefined") {
                    //console.log(avail);
                    avail = avail.replace(/[           ]/g, '');
                }
                if (typeof use != undefined && typeof use != "undefined") {
                    //console.log(use);
                    use = use.replace(/[           ]/g, '');
                }
                if (typeof mount != undefined && typeof mount != "undefined") {
                    //console.log(mount);
                    mount = mount.replace(/[           ]/g, '');
                }
                storage.push({ filesystem, size, used, avail, use, mount });
            }
        }
        storage.splice(0, 1);
        return storage;
    },
    getStorage: function () {
        const adb = execFileSync(adbexecutable, ['shell', 'dumpsys', 'diskstats'], {
            cwd: `${rootpath}`
        });
        var out = adb.toString();
        //console.log(out);
        if (out == "Filesystem      Size  Used Avail Use% Mounted on\r\n\r\n") {
            console.log("No storage detected");
            return;
        };
        const storage = {};
        const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        function niceBytes(x) {
            let l = 0, n = parseInt(x, 10) || 0;
            while (n >= 1024 && ++l) {
                n = n / 1024;
            }
            return (n.toFixed(n < 10 && l > 0 ? 1 : 0) + ' ' + units[l]);
        }
        function formatBytes(bytes) {
            var marker = 1024; // Change to 1000 if required
            var decimal = 3; // Change as required
            var kiloBytes = marker; // One Kilobyte is 1024 bytes
            var megaBytes = marker * marker; // One MB is 1024 KB
            var gigaBytes = marker * marker * marker; // One GB is 1024 MB
            var teraBytes = marker * marker * marker * marker; // One TB is 1024 GB

            // return bytes if less than a KB
            if (bytes < kiloBytes) return bytes + " Bytes";
            // return KB if less than a MB
            else if (bytes < megaBytes) return (bytes / kiloBytes).toFixed(decimal) + " KB";
            // return MB if less than a GB
            else if (bytes < gigaBytes) return (bytes / megaBytes).toFixed(decimal) + " MB";
            // return GB if less than a TB
            else return (bytes / gigaBytes).toFixed(decimal) + " GB";
        }
        if (!out.length) { return storage; }
        for (var line of Array.from(out.toString('ascii').split('\n'))) {
            if (line.replace(/[           ]/g, '').trim().split(':')[0] == "Data-Free") {
                storage["free"] = line.replace(/[           ]/g, '').trim().split(':')[1].split("=")[1].split("%")[0];
                storage["used"] = niceBytes(line.replace(/[           ]/g, '').trim().split(':')[1].split("K")[0].trim());
                storage["total"] = formatBytes(line.replace(/[           ]/g, '').trim().split(':')[1].split("/")[1].split("K")[0].trim()).replace('MB', "GB");
            }
        }
        return storage;
    },
    getBatteryInfo: function (deviceid) {
        const adb = execFileSync(adbexecutable, ['shell', 'dumpsys', 'battery'], {
            cwd: `${rootpath}`
        });
        var out = adb.toString();
        //console.log(out);
        if (out == "Filesystem      Size  Used Avail Use% Mounted on\r\n\r\n") {
            console.log("No storage detected");
            return;
        };
        const battery = [];
        if (!out.length) { return battery; }
        for (var line of Array.from(out.toString('ascii').split('\n'))) {
            battery.push(line.replace(/[           ]/g, '').trim().split(':'));
        }
        battery.splice(0, 1);
        let list = {};
        for (let i = 0; i < battery.length; i++) {
            if (typeof battery[i][1] == "undefined") {
                break
            }
            list[`${battery[i][0]}`] = battery[i][1];
        }
        return list;
    },
    getModel: function (deviceid) {
        return Q2MADB.exec(["-s", deviceid, "shell", "getprop", "ro.product.model"]).replace(/[\n\r]/g, '');
    },
    listDevices: function () {
        const adb = execFileSync(adbexecutable, ['devices'], {
            cwd: `${rootpath}`
        });
        var out = adb.toString();
        //console.log(out);
        if (out == "List of devices attached\r\n\r\n") {
            console.log("No devices plugged in");
            return;
        };
        const devices = [];
        if (!out.length) { return devices; }
        for (var line of Array.from(out.toString('ascii').split('\n'))) {
            if (line) {
                var [id, type] = Array.from(line.split('\t'));
                if (id == "\r" || id == "\n" || id == "\t") {
                    continue
                }
                if (typeof type != undefined && typeof type != "undefined") {
                    type = type.replace(/[\n\r]/g, '');
                }
                devices.push({ id, type });
            }
        }
        devices.splice(0, 1);
        return devices;
    }
};
