/*NodeJS Modules*/
const path = require('path');
const fs = require('fs');
const os = require('os');
const onezip = require('onezip');
const request = require('request');
const log4js = require("log4js");
const {
	ipcMain,
	ipcRenderer
} = require('electron');
const {
	app,
	BrowserWindow,
	shell,
	dialog
} = require('@electron/remote');
const {
	execFile,
	execFileSync,
	exec,
	spawn
} = require('child_process');
const {
	downloadRelease
} = require('@terascope/fetch-github-release');

/* Info about app */
var appdir = path.join(__dirname, "..", "..");
const config = require(path.join(__dirname, "..", "/data/config.json"));
var packageJson = require(path.join(appdir, 'package.json'));
var appname = packageJson.name;

var LauncherVersion = packageJson.version;

const rootpath = path.join(app.getPath('userData'));
console.log(rootpath);

const Q2MADB = require("./js/lib/adb.js");

/* Enable debug mode */
var debug = false;
if (fs.existsSync(path.join(rootpath, '.dev')) || fs.existsSync(path.join(rootpath, '.debug')) || fs.existsSync(path.join(rootpath, '.debug.txt'))) {
	debug = true;
};

/*Get date*/
let sdate = new Date();

/*Set audio*/
const media = {
	"error": new Audio(path.join(__dirname, 'sound/error.mp3')),
	"success": new Audio(path.join(__dirname, 'sound/success.mp3')),
	"christmas": new Audio(path.join(__dirname, 'sound/Christmas-Snow.mp3')),
	"other": {
		info: new Audio("https://res.cloudinary.com/dxfq3iotg/video/upload/v1557233294/info.mp3"),
		success: new Audio("https://res.cloudinary.com/dxfq3iotg/video/upload/v1557233524/success.mp3"),
		warning: new Audio("https://res.cloudinary.com/dxfq3iotg/video/upload/v1557233563/warning.mp3"),
		error: new Audio("https://res.cloudinary.com/dxfq3iotg/video/upload/v1557233574/error.mp3"),
	}
};

/* Set DiscordRPC client up */
var DiscordRPC = true;
/*var showrpc = false;*/
const {
	Client
} = require("discord-rpc");
var rpc, pt, kc;
if (process.platform == "linux") {
	kc = "Ctl-";
	pt = "/usr/bin/discord";
} else if (process.platform == "darwin") {
	kc = "Command-";
	pt = "/Applications/Discord.app";
} else if (process.platform == "win32") {
	kc = "Ctl-";
	pt = path.join(process.env.APPDATA, '..', 'Local', 'Discord', 'Update.exe');
};
try {
	if (fs.existsSync(pt) && DiscordRPC == true) {
		console.log("Discord installed, enabling rpc.");
		document.getElementById("DiscCh").style.display = "block";
		showrpc = true;

		var discobbj = {
			details: `${packageJson.version}`,
			state: `Just started`,
			startTimestamp: sdate,
			largeImageKey: `logo`,
			largeImageText: `Just opened Quest2Management`
		};

		rpc = new Client({
			transport: "ipc",
		});
		rpc.login({
			clientId: "904514136875089950"
		});

		function setDiscordActivity(rpc, obbj) {
			rpc.setActivity(obbj);
		};

		rpc.on("ready", () => {
			console.log("Discord rpc is ready!");

			// activity can only be set every 15 seconds
			setInterval(() => {
				setDiscordActivity(rpc, discobbj);
			}, 1533);
		});
	} else {
		console.log("Discord not installed, disabling rpc.");
	}
} catch (e) {
	console.log("An error occurred, disabling rpc.");
};

if (DiscordRPC == true) {
	/* Set activity,
	Just started */
	discobbj = {
		details: `${packageJson.version}`,
		state: `Just started`,
		startTimestamp: sdate,
		largeImageKey: `logo`,
		largeImageText: `Just opened Quest2Management`
	};
};

var dluseragent = `Q2M v:${launcherversion}; platform:${os.platform()};`;

function DownloadLIBS() {
	const url = 'https://dl.google.com/android/repository/platform-tools-latest-';
	console.log(`Platform: ${os.platform()}`);
	let downloadUrl;
	switch (os.platform()) {
		case "win32":
			downloadUrl = `${url}windows.zip`;
			break;

		default:
			downloadUrl = `${url}${os.platform()}.zip`;
			break;
	}
	console.log(`DL Url: ${downloadUrl}`);

	$("#DLGMODAL").modal({
		backdrop: 'static',
		keyboard: false
	});
	$('#DLGMODAL').modal('show');

	var progressText = document.getElementById("progress-text");
	var downloadProgressText = document.getElementById("download-progress-text");
	var progbar = document.getElementById("progbar");

	document.getElementById("DLMODAL-title").innerHTML = "Downloading ADB Tools...";
	progressText.innerHTML = "Downloading ADB Tools..."
	progbardiv.style.display = "block";

	/*Save variable to know progress*/
	var received_bytes = 0;
	var total_bytes = 0;

	var req = request({
		method: 'GET',
		uri: downloadUrl,
		headers: {
			'User-Agent': `${dluseragent}`
		}
	});

	var out = fs.createWriteStream(path.join(rootpath, `adb-tools-platform-${os.platform()}.zip`));
	req.pipe(out);

	req.on('response', function(data) {
		/*Change the total bytes value to get progress later*/
		//console.log(data);
		total_bytes = parseInt(data.headers['content-length']);
	});

	req.on('data', function(chunk) {
		/*Update the received bytes*/
		received_bytes += chunk.length;

		var percentage = (received_bytes * 100) / total_bytes;
		console.log(percentage.toFixed(2).split('.')[0].trim() + "% | " + received_bytes + " bytes out of " + total_bytes + " bytes.");
		//console.log(percentage.toFixed(2).split('.')[0].trim());

		progbar.innerHTML = `${percentage.toFixed(2).split('.')[0].trim()}%`;
		progbar.style = `width: ${percentage}%;`;
		downloadProgressText.innerHTML = `${percentage.toFixed(2).split('.')[0].trim()}%`;
		//progbar.innerHTML = `${percentage.toFixed(2).split('.')[0].trim()}%`;
	});

	req.on('end', function() {
		out.end();
		console.log("Successfully downloaded ADB Tools!");
		progressText.innerHTML = 'Download Complete!';
		document.getElementById("DLMODAL-title").innerHTML = "Downloaded ADB Tools";
		setTimeout(async function() {
			progressText.innerHTML = 'Extracting ADB Tools...';
			const extract = onezip.extract(path.join(rootpath, `adb-tools-platform-${os.platform()}.zip`), path.join(rootpath, 'lib'));

			extract.on('file', (name) => {
				if (debug == true) {
					console.log(name);
				};
			});

			extract.on('start', (percent) => {
				console.log('extracting started');
				document.getElementById("DLMODAL-title").innerHTML = "Extracting ADB Tools";
			});

			extract.on('progress', (percent) => {
				console.log(percent + '%');
				progbar.style = `width: ${percent}%;`;
				downloadProgressText.innerHTML = `${percent}%`;
				progbar.innerHTML = `${percent}%`;
			});

			extract.on('error', (error) => {
				console.error(error);
				/*Create error log and inform user an error occured*/
				let data = JSON.stringify({
					"Ereason": `${error}`,
					"Date": `${currentMonth}/${currentDay}/${currentYear}`,
					"Platform": `${os.platform()}`,
					"section": `ADB`
				});
				fs.writeFileSync(path.join(rootpath, 'ADBTools-Extract-Error.json'), data);
			});

			extract.on('end', () => {
				console.log('done extrating');
				document.getElementById("DLMODAL-title").innerHTML = "Extracted ADB Tools";
				progressText.innerHTML = 'Extracted ADB Tools!';
				setTimeout(async function() {
					let ver = "v1.25";
					let downloadUrl = `https://github.com/Genymobile/scrcpy/releases/download/${ver}/scrcpy-${os.platform()}-${ver}.zip`;
					console.log(`Platform: ${os.platform()}`);
					console.log(`DL Url: ${downloadUrl}`);
					document.getElementById("DLMODAL-title").innerHTML = "Downloading SCRCPY...";
					progressText.innerHTML = "Downloading SCRCPY..."
					progbardiv.style.display = "block";

					//Save variable to know progress
					var received_bytes = 0;
					var total_bytes = 0;

					var req = request({
						method: 'GET',
						uri: downloadUrl,
						headers: {
							'User-Agent': `${dluseragent}`
						}
					});

					var out = fs.createWriteStream(path.join(rootpath, `scrcpy-${os.platform()}-${ver}.zip`));
					req.pipe(out);

					req.on('response', function(data) {
						//Change the total bytes value to get progress later
						//console.log(data);
						total_bytes = parseInt(data.headers['content-length']);
					});

					req.on('data', function(chunk) {
						//Update the received bytes
						received_bytes += chunk.length;

						var percentage = (received_bytes * 100) / total_bytes;
						console.log(percentage.toFixed(2).split('.')[0].trim() + "% | " + received_bytes + " bytes out of " + total_bytes + " bytes.");
						//console.log(percentage.toFixed(2).split('.')[0].trim());

						progbar.innerHTML = `${percentage.toFixed(2).split('.')[0].trim()}%`;
						progbar.style = `width: ${percentage}%;`;
						downloadProgressText.innerHTML = `${percentage.toFixed(2).split('.')[0].trim()}%`;
						//progbar.innerHTML = `${percentage.toFixed(2).split('.')[0].trim()}%`;
					});

					req.on('end', function() {
						out.end();
						console.log("Successfully downloaded SCRCPY!");
						progressText.innerHTML = 'Download Complete!';
						document.getElementById("DLMODAL-title").innerHTML = "Downloaded SCRCPY";
						setTimeout(async function() {
							progressText.innerHTML = 'Extracting SCRCPY...';
							const extract = onezip.extract(path.join(rootpath, `adb-tools-platform-${os.platform()}.zip`), path.join(rootpath, 'lib'));

							extract.on('file', (name) => {
								if (debug == true) {
									console.log(name);
								};
							});

							extract.on('start', (percent) => {
								console.log('extracting started');
								document.getElementById("DLMODAL-title").innerHTML = "Extracting SCRCPY";
							});

							extract.on('progress', (percent) => {
								console.log(percent + '%');
								progbar.style = `width: ${percent}%;`;
								downloadProgressText.innerHTML = `${percent}%`;
								progbar.innerHTML = `${percent}%`;
							});

							extract.on('error', (error) => {
								console.error(error);
								//Create error log and inform user an error occured
								let data = JSON.stringify({
									"Ereason": `${error}`,
									"Date": `${currentMonth}/${currentDay}/${currentYear}`,
									"Platform": `${os.platform()}`,
									"section": `SCRCPY`
								});
								fs.writeFileSync(path.join(rootpath, 'SCRCPY-Extract-Error.json'), data);
							});

							extract.on('end', () => {
								console.log('done extrating');
								document.getElementById("DLMODAL-title").innerHTML = "Extracted SCRCPY";
								progressText.innerHTML = 'Extracted SCRCPY!';
							});
						}, 3000);
					});
					$('#DLGMODAL').modal('hide');

					fs.unlink(path.join(rootpath, `adb-tools-platform-${os.platform()}.zip`), (err) => {
						progbar.style.display = "none";
						if (err) {
							//Create error log and inform user an error occured
							let data = JSON.stringify({
								"Ereason": `${err}`,
								"Date": `${currentMonth}/${currentDay}/${currentYear}`,
								"Platform": `${os.platform()}`,
								"section": `ADB`
							});
							fs.writeFileSync(path.join(rootpath, 'ADB-Tools-unlink-Error.json'), data);
						};
						console.log(`adb-tools-platform-${os.platform()}.zip was deleted`);
						var dvcloop;
						dvcloop = setInterval(dispinfo, 1000);
					});
					fs.unlink(path.join(rootpath, `scrcpy-${os.platform()}-${ver}.zip`), (err) => {
						progbar.style.display = "none";
						if (err) {
							//Create error log and inform user an error occured
							let data = JSON.stringify({
								"Ereason": `${err}`,
								"Date": `${currentMonth}/${currentDay}/${currentYear}`,
								"Platform": `${os.platform()}`,
								"section": `SCRCPY`
							});
							fs.writeFileSync(path.join(rootpath, 'SCRCPY-unlink-Error.json'), data);
						};
						console.log(`scrcpy-${os.platform()}-${ver}.zip was deleted`);
					});
				}, 3000);
				$('#DLGMODAL').modal('hide');
				progbar.style.display = "none";
				var dvcloop;
				dvcloop = setInterval(dispinfo, 1000);
			});
		}, 3000);
	});
};

function imgError(image) {
	image.onerror = "";
	image.src = "./img/placeholder-image.png";
	return true;
}

function streamScreen(eye) {
	Q2MADB.showScreen(eye);
}

async function installAPK(mode = "", url = "") {
	var localapk, apkpath, apkurl, apkdlpath;
	if (typeof mode != "" || typeof mode != "null" && mode == "online" && typeof url != "") {
		apkurl = url;
		console.log(`Platform: ${os.platform()}`);
		console.log(`DL Url: ${apkurl}`);
		document.getElementById("DLMODAL-title").innerHTML = "Downloading APK...";
		progressText.innerHTML = `Downloading APK from url: ${apkurl}`;
		apkdlpath = path.join(rootpath, `dl`, `online-apk-${currentMonth}-${currentDay}-${currentYear}.apk`);
		progbardiv.style.display = "block";

		//Save variable to know progress
		var received_bytes = 0;
		var total_bytes = 0;

		var req = request({
			method: 'GET',
			uri: apkurl,
			headers: {
				'User-Agent': `${dluseragent}`
			}
		});

		var out = fs.createWriteStream(apkdlpath);
		req.pipe(out);

		req.on('response', function(data) {
			//Change the total bytes value to get progress later
			//console.log(data);
			total_bytes = parseInt(data.headers['content-length']);
		});

		req.on('data', function(chunk) {
			//Update the received bytes
			received_bytes += chunk.length;

			var percentage = (received_bytes * 100) / total_bytes;
			console.log(percentage.toFixed(2).split('.')[0].trim() + "% | " + received_bytes + " bytes out of " + total_bytes + " bytes.");
			//console.log(percentage.toFixed(2).split('.')[0].trim());

			progbar.innerHTML = `${percentage.toFixed(2).split('.')[0].trim()}%`;
			progbar.style = `width: ${percentage}%;`;
			downloadProgressText.innerHTML = `${percentage.toFixed(2).split('.')[0].trim()}%`;
			//progbar.innerHTML = `${percentage.toFixed(2).split('.')[0].trim()}%`;
		});

		req.on('end', function() {
			out.end();
			console.log("Successfully downloaded APK!");
			progressText.innerHTML = 'Download Complete!';
			document.getElementById("DLMODAL-title").innerHTML = "Downloaded APK";
		});
		$('#DLGMODAL').modal('hide');
		apkpath = apkdlpath;

		/*fs.unlink(path.join(rootpath, `adb-tools-platform-${os.platform()}.zip`), (err) => {
			progbar.style.display = "none";
			if (err) {
				//Create error log and inform user an error occured
				let data = JSON.stringify({
					"Ereason": `${err}`,
					"Date": `${currentMonth}/${currentDay}/${currentYear}`,
					"Platform": `${os.platform()}`,
					"section": `ADB`
				});
				fs.writeFileSync(path.join(rootpath, 'ADB-Tools-unlink-Error.json'), data);
			};
			console.log(`adb-tools-platform-${os.platform()}.zip was deleted`);
		});*/
	} else {
		localapk = await dialog.showOpenDialog({
			properties: ['openFile'],
			filters: [{
					name: 'Android App Package',
					extensions: ['apk']
				},
				{
					name: 'All Files',
					extensions: ['*']
				}
			]
		});
		if (localapk.canceled != true) {
			console.log(localapk.filePaths[0]);
			apkpath = localapk.filePaths[0];
		} else {
			console.log("local APK install canceled");
			return;
		};
	}
	var progressText = document.getElementById("progress-text");
	var denybtn = document.getElementById("DenyDLGModalBtn");
	var acceptbtn = document.getElementById("AcceptDLGModalBtn");

	document.getElementById("DLMODAL-title").innerHTML = "Install APK";
	progressText.style.display = "block";
	denybtn.style.display = "block";
	acceptbtn.style.display = "block";
	progressText.innerHTML = "Are you sure you want to install this APK?<br>It might put your device at risk, only install APK's from trusted sources.";

	acceptbtn.innerHTML = '<i class="fa fa-download"></i> Yes, Install';

	$("#DLGMODAL").modal({
		backdrop: 'static',
		keyboard: false
	});
	$('#DLGMODAL').modal('show');

	acceptbtn.addEventListener("click", async function eventHandler() {
		document.getElementById("DLMODAL-title").innerHTML = "Enrolling device";
		progressText.innerHTML = `Enrolling device in MDM`;
		denybtn.style.display = "none";
		acceptbtn.style.display = "none";
		setTimeout(async function() {
			try {
				var resp = await Q2MADB.installApp(apkpath);
				console.log(resp);
				if (resp == "Performing Streamed Install\r\nSuccess\r\n") {
					document.getElementById("DLMODAL-title").innerHTML = "Installed APK";
					progressText.innerHTML = `Successfully Installed ${apkpath}`;
					setTimeout(async function() {
						$('#DLGMODAL').modal('hide');
					}, 2000);
				} else {
					document.getElementById("DLMODAL-title").innerHTML = "Error durring install";
					fs.writeFileSync(path.join(rootpath, "AOKINSTALLERROR.log"), resp);
					progressText.innerHTML = `An error accured while install your APK, a log has been saved at ${path.join(rootpath, 'APKINSTALLERROR.log')}`;
					setTimeout(async function() {
						$('#DLGMODAL').modal('hide');
					}, 2000);
				}
			} catch (e) {
				document.getElementById("DLMODAL-title").innerHTML = "Error durring install";
				fs.writeFileSync(path.join(rootpath, "APKINSTALLERROR.log"), e.toString());
				progressText.innerHTML = `An error accured while install your APK,<br>a log has been saved at ${path.join(rootpath, 'APKINSTALLERROR.log')}`;
				setTimeout(async function() {
					$('#DLGMODAL').modal('hide');
				}, 5000);
			};
			this.removeEventListener('click', eventHandler);
		}, 2000);
	});
	denybtn.addEventListener("click", async function eventHandler() {
		$('#DLGMODAL').modal('hide');
		this.removeEventListener('click', eventHandler);
	});
}

function EnrollMDM() {
	var progressText = document.getElementById("progress-text");
	var denybtn = document.getElementById("DenyDLGModalBtn");
	var acceptbtn = document.getElementById("AcceptDLGModalBtn");

	document.getElementById("DLMODAL-title").innerHTML = "Enroll device in MDM";
	progressText.style.display = "block";
	denybtn.style.display = "block";
	acceptbtn.style.display = "block";
	progressText.innerHTML = "Are you sure you want to enroll this device in MDM?<br>This will install the Miradore client to this device.";

	acceptbtn.innerHTML = '<i class="fa fa-download"></i> Yes, Install';

	$("#DLGMODAL").modal({
		backdrop: 'static',
		keyboard: false
	});
	$('#DLGMODAL').modal('show');

	acceptbtn.addEventListener("click", async function eventHandler() {
		document.getElementById("DLMODAL-title").innerHTML = "Installing APK";
		progressText.innerHTML = `Installing ${apkpath}`;
		denybtn.style.display = "none";
		acceptbtn.style.display = "none";
		setTimeout(async function() {
			try {
				var resp = await installAPK("online", "https://online.miradore.com/mdonline.apk");
				console.log(resp);
			} catch (e) {
				document.getElementById("DLMODAL-title").innerHTML = "Error durring install";
				fs.writeFileSync(path.join(rootpath, "MDMINSTALLERROR.log"), e.toString());
				progressText.innerHTML = `An error accured while enrolling your device in MDM,<br>a log has been saved at ${path.join(rootpath, 'MDMINSTALLERROR.log')}`;
				setTimeout(async function() {
					$('#DLGMODAL').modal('hide');
				}, 5000);
			};
			this.removeEventListener('click', eventHandler);
		}, 2000);
	});
	denybtn.addEventListener("click", async function eventHandler() {
		$('#DLGMODAL').modal('hide');
		this.removeEventListener('click', eventHandler);
	});
}

function dispinfo() {
	var devices = Q2MADB.listDevices();
	if (typeof devices != "object") {
		$("#devhelptip1").css("display", "block");
		$("#HeadsetImg").attr("src", "./img/vrheadset-questionmark.png");
		$("#connstat").html("No device connected");
		$("#deviceinfo").css("display", "none");
		document.getElementById("connectionstatusicon").classList = "status offline";
		$("#connectionstatusicon").attr("title", "Disconnected");
		$("#connectionstatusicon").attr("arira-label", "Disconnected");
		$("#connectionstatusicon").attr("data-bs-original-title", "Disconnected");
		return;
	}
	var device = {
		id: devices[0].id,
		model: Q2MADB.getModel(devices[0].id),
		storage: Q2MADB.getStorage(devices[0].id),
		battery: Q2MADB.getBatteryInfo(devices[0].id)
	};
	if (debug == true) {
		console.log("Device id:", device.id);
		console.log("Device model:", device.model);
		console.log("Device storage:", device.storage);
		console.log("Device storage used:", device.storage[6].used);
		console.log("Device battery info:", device.battery);
	};

	var headsettype, headsetimg;
	switch (device.model) {
		case "Quest":
			headsetimg = "./img/quest-headset-v3.png";
			headsettype = "Oculus Quest";
			break;

		case "Quest 2":
			headsetimg = "./img/quest2-headset-v3.png";
			headsettype = "Oculus Quest 2";
			break;

		default:
			headsetimg = "./img/vrheadset-questionmark.png";
			headsettype = "Unknown";
			break;
	}
	$("#devhelptip1").css("display", "none");
	$("#HeadsetImg").attr("src", headsetimg);
	$("#connstat").html(headsettype);
	$("#deviceinfo").css("display", "block");
	//$("#storagecap").html(`${device.storage.used}/${device.storage.total}`);
	//$("#storageused").html(`${device.storage.use} used`);
	//$("#storageused").html(`Device storage is not accurate, please view it in your headsets settings.`);
	$("#batperc").html(`${device.battery.level}%`);
	document.getElementById("connectionstatusicon").classList = "status online";
	$("#connectionstatusicon").attr("title", "Connected");
	$("#connectionstatusicon").attr("arira-label", "Connected");
	$("#connectionstatusicon").attr("data-bs-original-title", "Connected");
	document.getElementById("viewscrnbtn").removeEventListener("click", streamScreen);
	document.getElementById("viewscrnbtn").addEventListener("click", streamScreen);
	document.getElementById("installapkbtn").removeEventListener("click", installAPK);
	document.getElementById("installapkbtn").addEventListener("click", installAPK);
};

$(document).ready(function() {
	document.getElementById("discordbtn-href").href = discordbtn.href;
	document.getElementById("discordbtn-img").src = discordbtn.img;
	document.getElementById("discordbtn-img").style.width = discordbtn.width;

	$("#lver").html(`Version: ${packageJson.version}`);

	/* Check if ADB tools is installed, otherwise download */
	try {
		if (fs.existsSync(path.join(rootpath, 'lib', 'platform-tools', 'adb.exe'))) {
			console.log("ADB tools installed, checking for connected device");
			var dvcloop;
			dvcloop = setInterval(dispinfo, 1000);
		} else {
			console.log("ADB tools not installed, downloading...");
			$("#DLGMODAL").modal({
				backdrop: 'static',
				keyboard: false
			});
			$('#DLGMODAL').modal('show');

			var progressText = document.getElementById("progress-text");
			var acceptbtn = document.getElementById("AcceptDLGModalBtn");

			document.getElementById("DLMODAL-title").innerHTML = "Download ADB Tools";
			progressText.style.display = "block";
			progressText.innerHTML = "To connect to your Meta Quest 2, you need to install ADB Tools.";

			acceptbtn.style.display = "block";
			acceptbtn.addEventListener("click", e => {
				DownloadLIBS();
				acceptbtn.style.display = "none";
			});
		}
	} catch (e) {
		console.log(e);
		/*Create error log and inform user an error occured*/
		let data = JSON.stringify({
			"LauncherVersion": `${LauncherVersion}`,
			"Ereason": `${e}`,
			"CurrDate": `${currentMonth}/${currentDay}/${currentYear}`
		});
		fs.writeFileSync(path.join(rootpath, 'ADB-Tools-Install-Error.json'), data);
		console.log("An error occurred, saving error log.");
	};

	const imgtag = document.querySelector('img');
	imgtag.ondragstart = () => {
		return false;
	};

	console.log("Enabling tooltips");
	var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
	var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
		return new bootstrap.Tooltip(tooltipTriggerEl);
	});
	$(function() {
		$('[data-toggle="tooltip"]').tooltip()
	});
});
