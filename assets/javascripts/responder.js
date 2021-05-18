const ipcRenderer = require('electron').ipcRenderer
const app = require('electron').remote.app;
const dialog = require('electron').dialog;
const session = require('electron').remote.session;

let $ = require('jquery');
let storage = require('electron-json-storage');

let $swiper = require('swiper');
const url = require('url');

const fs = require('fs');
const path = require('path');
const pug = require('pug');
const ffmpeg = require('fluent-ffmpeg');
const { readdirSync, statSync } = require('fs')
const { join } = require('path')

require('electron-disable-file-drop');

var slidesPerView = 6;
var selectedTab = 0;

let $fileUploadThumbnail = require('file-upload-thumbnail');

var menuTemplate = pug.compile($('script[data-template="menu-template"]').text());
var tabTemplate = pug.compile($('script[data-template="tab-template"]').text());

const folderFilter = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory());
const fileFilter = p => readdirSync(p).filter(f =>(f.slice(-3) === 'png'));
const videoFilter = p => readdirSync(p).filter(f =>(f.slice(-3) === 'mp4'));

let imageMap = new Object();

var swiper = null;
var videoPlayer = null;
var blobs = [];

var hidWidth;
var scrollBarWidths = 40;

var cancelDirectoryCallback = function() {

	app.quit();

}

ffmpeg.setFfmpegPath(require('ffmpeg-static'));
ffmpeg.setFfprobePath(require('ffprobe-static').path);

String.prototype.initCap = function () {
	return this.toLowerCase().replace(/(?:^|\b)[a-z]/g, function (m) {
		return m.toUpperCase();
	});
};

var widthOfList = function () {
	var itemsWidth = 0;

	$('.list li').each(function () {
		var itemWidth = $(this).outerWidth();
		itemsWidth += itemWidth;
	});

	return itemsWidth;

};

var widthOfHidden = function () {

	return (($('.wrapper').outerWidth()) - widthOfList() - getLeftPos()) - scrollBarWidths;

};

var getLeftPos = function () {
	return $('.list').position().left;
};

var reAdjust = function () {

	if (($('.wrapper').outerWidth()) < widthOfList()) {
		$('#scroll-right').css('display', 'block');
	} else {
		$('#scroll-right').css('display', 'none');
	}

	if (getLeftPos() < 0) {

		$('#scroll-left').css('display', 'block');
	} else {
		$('.item').animate({ left: "-=" + getLeftPos() + "px" }, 'slow');

		$('#scroll-left').css('display', 'none');

	}

}

/**
 * Show the Directory Dialog
 * 
 */
function showDirectoryDialog() {

	getCookie('folders', (cookies) => {
		if (cookies != null  && cookies.length != 0 && (JSON.stringify(cookies[0].value)).length != 0) {
			$('#directory').val(JSON.parse(cookies[0].value)[0]);	
		}

		$('#directoryDialog').css('display', 'inline-block');

	});

}

/**
 * Build the Tab list from the directories
 * 
 * @param {string} folders the folder list
 */
function buildTabList(folders) {

	var htmlTabs = tabTemplate({
		folders: folders,
		selectedTab: selectedTab
	  });
	
	$('#tab').html(htmlTabs);

}

/**
 * Build the Swiper List
 * 
 * @param {string} directory the directory
 * @param {string} folder the folder containing the files
 */
function buildSwiperList(directory, folder) {
	var folderPath = path.join(directory, folder)
	const files  = fileFilter(folderPath);

	$('#view').css('display', 'none');
	$('#swiper-wrapper').html("");
	$('#swiper-container').css('display', 'block');

	for (var file in files) {

		createSwiperEntry(folderPath, files[file], file, files.length);

	}

	$('#swiper-container').css('display', 'block');

}

/**
 * Create each Swiper Entry
 * 
 * @param {string} directoryName the Directory/Folder
 * @param {string} fileName the Name of the FIle
 * @param {int} index the curretn index
 * @param {int} count the count
 */
function createSwiperEntry(directoryName, fileName, index, count) {

	$('#view').css('display', 'none');
	var html = $('#swiper-wrapper').html();

	$('#swiper-wrapper').html(generateSwiperEntry(html, directoryName, fileName, index, count));
	$('#swiper-container').css('display', 'block');

	if (swiper) {
		swiper.update();
	} else {
		swiper = createSwipperControl();
	}

}

/**
 * Generate Keyframes
 * 
 * @param {*} file 
 * @param {*} directory 
 * @param {*} callback 
 */
function generateKeyFrames(file, directory, callback) {
	var files = [];
	var counter = 0;
	var proc = ffmpeg(file)
		.on('filenames', function (filenames) {
			console.log('screenshots are ' + filenames.join(', '));

			for (filename in filenames) {
				files.push(filenames[filename]);
			}

		})
		.on('end', function () {
			console.log('screenshots were saved');
			callback.on.end(files);
		})
		.on('codecData', function(data) {
			callback.on.info(data);
		})
		.on('error', function (err) {
			alert(err.message);
		})
		.on('progress', function(progress) {
			counter = counter + 1;
			$('#messageLabel').html(`Processing - Part ${counter}`);
		})
		// take 2 screenshots at predefined timemarks and size
		.takeScreenshots({count: 10,
						 filename: '%b_screenshot_%w_%i',
						 timemarks: ['0%', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%']}, directory);
}

/**
 * Show the Video Player
 * 
 * @param {string} fileUrl 
 */
function showVideoPlayer(fileUrl) {

	$('#videoContainer').css('display', 'inline-block');

	var options = {
        controls: true,
        controlBar: {
            pictureInPictureToggle: false
        },
        autoplay: false,
        preload: 'auto'};
    
    if (videoPlayer != null) {
        videoPlayer.dispose();
		$('#videoContainer').html("<video id='vid1' " + 
		  "class='video-js vjs-default-skin vjs-big-play-centered' " + 
		  "style='position:absolute; width:100%; height:100%; margin-left: auto; margin-right: auto;'>" + 
		  "</video>");
    }

    videoPlayer = videojs('vid1', options, function onPlayerReady() {
            this.on('ended', function() {
        });
	});
	
	videoPlayer.on('loadedmetadata', function() {
	});
 
    videoPlayer.src(
            {type: 'video/mp4',
			 src: fileUrl});
 
}

function showDirectory(directory) {
	
	if(swiper) {
		$('#swiper-wrapper').html("");
		swiper.update();
	}
	
	if (videoPlayer) {
		videoPlayer.dispose();
		videoPlayer = null;
	}

	$(document).attr('title', directory);

	$("#droparea *").prop("disabled", false);

	var folderPath = directory;

	getCookie('folders', (cookies) => {
		
		let folders = (cookies == null || cookies.length == 0) ? [] : JSON.parse(cookies[0].value);
		let found = false;

		for (folder in folders) {

			if (folders[folder] == folderPath) {
				found = true;
			}

		}

		if (!found) {

			folders.push(folderPath);

		}

		storage.setDataPath(folderPath);

		setCookie('folders', JSON.stringify(folders));

		buildMenu(folders);

		var directories  = folderFilter(storage.getDataPath());

		buildTabList(directories);

		if (directories.length > 0) {
			buildSwiperList(storage.getDataPath(), directories[0]);
			var directoryPath = path.join(storage.getDataPath(), directories[0]);

			var videoFiles = videoFilter(directoryPath);
			var content = fs.readFileSync(path.join(directoryPath, videoFiles[0]));
			var buffer = toArrayBuffer(content);
			var blob = new Blob([buffer], {type : 'video/mp4'});

			var videoUrl = URL.createObjectURL(blob);
			$('#videoContainer').html("<video id='vid1' " + 
		      "class='video-js vjs-default-skin vjs-big-play-centered' " + 
		  	  "style='position:absolute; width:100%; height:100%; margin-left: auto; margin-right: auto;'>" + 
			  "</video>");

			showVideoPlayer(videoUrl);
			
		}

		reAdjust();

	});

}

$('#cancelDirectorySelection').on('click', (e) => {

	cancelDirectoryCallback();

});

$('#scroll-right').click(() => {

	$('#scroll-left').fadeIn('slow');

	$('.list').animate({ left: "+=" + widthOfHidden() + "px" }, 'slow', function () {

	});

});

$('#scroll-left').click(() => {

	$('#scroll-right').fadeIn('slow');
	$('#scroll-left').fadeOut('slow');

	$('.list').animate({ left: "-=" + getLeftPos() + "px" }, 'slow', function () {

	});

});

$.fn.Tab = (folder, index) => {
	var directory = unescape(folder);

	selectTab(directory, index);
 	selectFolder(directory, index);

	return false;

}

$.fn.Select = (folder, index) => {

	showDirectory(unescape(folder));

}

$.fn.Play = (directoryName, fileName, index, count) => {
	var duration = videoPlayer.duration();

	videoPlayer.currentTime((duration/count) * (parseInt(index) - 1));
} 

$('#addDirectory').on('click', (e) => {

	showDirectoryDialog();

});

$('#openDirectoryDialog').on('click', (e) => {

	var result = ipcRenderer.sendSync('select-directory', 'directory');

	if (!result.canceled) {
		$('#directory').val(result.filePaths);
	}

});

$('#directoryClose').on('click', (e) => {

	$('#directoryDialog').css('display', 'none');

});

$('#selectDirectory').on('click', (e) => {

	if ($('#directory').val() != null) {

		cancelDirectoryCallback = function () {
			$('#directoryDialog').css('display', 'none') 
		}

		showDirectory($('#directory').val());

	}

	$('#directoryDialog').css('display', 'none');

});


$('#menu').on('click', (e) => {

	document.getElementById("dropdown").classList.toggle("show");

});

$(window).resize(function () {

	reAdjust();

});

$(document).ready(() => {

	$("#droparea *").attr("disabled", "disabled").off('click');

	window.onclick = event => {

		if (document.getElementById("dropdown").classList.contains('show')) {
			document.getElementById("dropdown").classList.remove('show');
			document.getElementById("dropdown").classList.toggle("view");
		} else if (document.getElementById("dropdown").classList.contains('view')) {
			document.getElementById("dropdown").classList.remove('view');
		}

	}

	var dropzone = $('#droparea');

	dropzone.on('dragover', function () {
		dropzone.addClass('hover');
		return false;
	});

	dropzone.on('dragleave', function () {
		dropzone.removeClass('hover');
		return false;
	});

	dropzone.on('drop', function (e) {
		e.stopPropagation();
		e.preventDefault();
		dropzone.removeClass('hover');

		var files = e.originalEvent.dataTransfer.files;
		processFiles(files);

		return false;

	});

	var uploadBtn = $('#uploadbtn');

	uploadBtn.on('click', function (e) {

		e.stopPropagation();
		e.preventDefault();
		$('#upload').click();

	});

	$('#upload').on('change', function () {
		var files = $(this)[0].files;

		processFiles(files);

		return false;

	});

	function processFiles(files) {

		Array.prototype.slice.call(files).forEach(function (file) {
			var fileURL = URL.createObjectURL(file);
			var reader = new FileReader();

			if (videoPlayer) {
				videoPlayer.pause();
			}

			$('#display').css('background', '');
			$('#pictureFrame').css('display', 'inline-block');
			$('#messageLabel').html("Processing...")
			$('#waitDialog').css('display', 'inline-block');
			$('#videoContainer').css('display', 'none');

			reader.onload = function () {
				var data = reader.result;
				var fileDirectory = file.name.replace(/\.[^/.]+$/, "");
				var directory = path.join(storage.getDataPath(), fileDirectory);

				if (!fs.existsSync(directory)) {
					fs.mkdirSync(directory);
				}

				fs.writeFileSync(path.join(directory, file.name), new Buffer(data));

				var blob = new Blob([data], {type : 'video/mp4'});
				var url = URL.createObjectURL(blob);

				generateKeyFrames(path.join(directory, file.name), directory, 
					{	
						on : {
							info:
								function(data) {
									console.log(data);
									var metadata = {
										format : data.format,
										video : data.video,
										audio : data.audio,
										duration : data.duration
									}
									fs.writeFile(path.join(directory, 'metadata.json'), JSON.stringify(metadata), (err) => {
										if (err) {
											throw err;
										}
									});
								},
							end : 
								function(filenames) {
									$('#view').css('display', 'none');
									$('#swiper-wrapper').html("");
									$('#swiper-container').css('display', 'block');

									for (filename in filenames) {
										createSwiperEntry(directory, filenames[filename], filename);
									}
									
									var directories  = folderFilter(storage.getDataPath());
					
									for (var directoryIndex in directories) {
										selectedTab =  (directories[directoryIndex] == fileDirectory) ? directoryIndex : selectedTab;
									}

									buildTabList(directories);

									$('#swiper-container').css('display', 'block');
									$('#waitDialog').css('display', 'none');
									
									showVideoPlayer(url);

								}
					}

				});

			};

			reader.onprogress = function (data) {

				if (data.lengthComputable) {
					var progress = parseInt(((data.loaded / data.total) * 100), 10);
					document.getElementById("uploadProgress").className = "c100 p" +
						progress +
						" big blue";
					$('#percentage').html(progress + "%");

				}
			}

			reader.readAsArrayBuffer(file);

		});

	}
	
	setTimeout(() => {

		showDirectoryDialog();

	}, 100);

});

function selectTab(folder, index) {

	$(".tab-item").css('background', 'rgba(255,255,255, 0.0)');
	$(".tab-item-button").css('background', 'rgba(255,255,255 ,0.0)');
	$(".tab-item").css('text-decoration', 'none');

	$('#tab-button-' + index).css('background', 'rgba(255, 255, 255, 0.4)');
	$('#tab-button-' + index).css('text-decoration', 'underline');

}

function selectFolder(folder, index) {
	
	buildSwiperList(storage.getDataPath(), folder);

	var directory = path.join(storage.getDataPath(), folder);

	var videoFiles = videoFilter(directory);
	var content = fs.readFileSync(path.join(directory, videoFiles[0]));
	var buffer = toArrayBuffer(content);
	var blob = new Blob([buffer], {type : 'video/mp4'});

	var videoUrl = URL.createObjectURL(blob);

	showVideoPlayer(videoUrl);

}

/**
 * Build the Menu
 * @param {*} folders the folders to build 
 */
function buildMenu(folders) {
	var htmlFolders = menuTemplate({
		folders: folders
	});

	$('#dropdown').html(htmlFolders);

}

/**
 * Generate the Swiper Entry
 * 
 * @param {*} html The current HTML
 * @param {*} directoryName the Directory Name
 * @param {*} fileName the Name of Image 
 * @param {*} index the Image's index within the Swiper
 * @param {*} count the Number of Images
 */
function generateSwiperEntry(html, directoryName, fileName, index, count) {
	var content = fs.readFileSync(path.join(directoryName, fileName));
	var buffer = toArrayBuffer(content);

	blobs[index] =  new Blob([buffer], {type : 'image/jpeg'});

	var url = URL.createObjectURL(blobs[index]);
	var entryHtml = html + "<div class='swiper-slide' onclick='$(this).Play(" +
		`" + ${directoryName}", "${fileName}", "${index}", "${count}");'> ` +
		"<img class='swiper-image' " +
		"id='" + fileName +
		"' src='" + url +
		"' style='width:180px; height:140px'/>" +
		` <label style='position:absolute; font-size:8px; bottom:20px; left:0px; width:180px; color:white;  text-overflow: ellipsis; ` +
		` background-color:rgba(0, 0, 0, 0.1);'>&nbsp;${parseInt(index) + 1}</label>` +
		" <div class='play'>" +
		" <img src='assets/images/play.svg' style='width:48px; height:48px;'/></div>" +
		" </div>" 

	return entryHtml;

}

/**
 * Create a swiper control
 * 
 * @return the newly constructed swiper control
 * 
 */
function createSwipperControl() {

	var swiper = new $swiper('.swiper-container', {
		slidesPerView: slidesPerView,
		centeredSlides: false,
		spaceBetween: 10,
		breakpointsInverse: true,
		breakpoints: {
			200: {
				slidesPerView: 1,
				spaceBetween: 10
			},
			600: {
				slidesPerView: 2,
				spaceBetween: 10
			},
			800: {
				slidesPerView: 3,
				spaceBetween: 10
			},
			1000: {
				slidesPerView: 4,
				spaceBetween: 10
			},
			1200: {
				slidesPerView: 5,
				spaceBetween: 10
			},
			1400: {
				slidesPerView: 6,
				spaceBetween: 10
			},
			1600: {
				slidesPerView: 7,
				spaceBetween: 10
			},
			1800: {
				slidesPerView: 8,
				spaceBetween: 10
			},
			2000: {
				slidesPerView: 9,
				spaceBetween: 10
			}
		},
		pagination: {
			el: '.swiper-pagination',
			clickable: true,
		},
		navigation: {
			nextEl: '.swiper-button-next',
			prevEl: '.swiper-button-prev',
		},

	});

	return swiper;

}

/**
 * Buffer to Array Buffer
 * @param {*} buf the input buffer
 * @return an Array Buffer
 * 
 */
function toArrayBuffer(buf) {
	var ab = new ArrayBuffer(buf.length);
	var view = new Uint8Array(ab);
	for (var i = 0; i < buf.length; ++i) {
		view[i] = buf[i];
	}

	return ab;

}

/**
 * Set the Cookie
 * @param {string} name the cookie name
 * @param {string} data the cookie data
 */
function setCookie(name, data) {
	var maxDate = new Date(8640000000000000);

	session.defaultSession.cookies.set({
		url: 'http://viz',
		name: name,
		value: data,
		expirationDate: maxDate.getTime()
	}, function (error) {
		console.log(error);
	});

}

/**
 * Get the Cookie
 * @param {*} name the Cookie Name
 * @param {*} callback the COokie Callback
 */
function getCookie(name, callback) {

	session.defaultSession.cookies.get({
		url: 'http://viz',
		name: name
	})
		.then((cookies) => {
			callback(cookies);
		}).catch((error) => {
			console.log(error)
		})

}