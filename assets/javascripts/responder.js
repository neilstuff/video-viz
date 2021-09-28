var slidesPerView = 6;

let cardTemplate = ejs.compile($('script[data-template="card-template"]').text(), { client: true });

var videoPlayer = null;
var images = {};
var video = null;
var filename = null;

var cancelArchiveCallback = () => {

    window.api.quit();

}

String.prototype.initCap = function() {
    return this.toLowerCase().replace(/(?:^|\b)[a-z]/g, function(m) {
        return m.toUpperCase();
    });
};

var getLeftPos = function() {
    return $('.list').position().left;
};

function processFiles(files) {
    Array.prototype.slice.call(files).forEach(function(file) {
        var fileURL = URL.createObjectURL(file);
        var reader = new FileReader();

        filename = file.name;

        $('#filename').html(filename);

        if (videoPlayer) {
            videoPlayer.pause();
        }

        $('#display').css('background', '');
        $('#messageLabel').html("Loading...")
        $('#waitDialog').css('display', 'inline-block');
        $('#videoContainer').css('display', 'none');

        reader.onload = function() {
            var data = reader.result;

            $('#swiper-container').css('display', 'block');
            $('#waitDialog').css('display', 'none');

            video = new Blob([data], { type: 'video/mp4' });
            var url = URL.createObjectURL(video);

            showVideoPlayer(url);

        };

        reader.onprogress = function(data) {

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
        preload: 'auto'
    };

    if (videoPlayer != null) {
        videoPlayer.dispose();
        $('#videoContainer').html("<video id='vid1' " +
            "class='video-js vjs-default-skin vjs-big-play-centered' " +
            "style='position:absolute; width:100%; height:100%; margin-left: auto; margin-right: auto;'>" +
            "</video>");
    }

    videoPlayer = videojs('vid1', options, function onPlayerReady() {
        this.on('ended', function() {});
    });

    videoPlayer.on('loadedmetadata', function() {});

    videoPlayer.src({
        type: 'video/mp4',
        src: fileUrl
    });

}

$.fn.Setup = (currentTime) => {
    images = {};

    $('#image-container').html("");
    $('#filename').html("");

    $('#photobtn').attr('disabled', false);

}

$.fn.Play = (currentTime) => {
    var duration = videoPlayer.duration();

    videoPlayer.currentTime(parseInt(currentTime));
}

$.fn.Load = (images) => {
     return new Promise(accept => {
    
        window.setTimeout(() => {

            function getBlob(file) {

                return new Promise(resolve => {
                    file.async("blob").then(function (blob) {
                        resolve(blob);
                    });

                });

            }
            
            var loadButton = document.createElementNS("http://www.w3.org/1999/xhtml", "input");

            loadButton.setAttribute("type", "file");
            loadButton.accept = '.zip';

            loadButton.onchange = function (event) {
                var files = event.target.files;

                for (var iFile = 0; iFile < files.length; ++iFile) {

                    var reader = new FileReader();

                    reader.onload = function () {
                        var images = {};
                        var tags = {};
                        var names = {};
                         var zip = new JSZip();

                        zip.loadAsync(reader.result).then(async function (zip) {
                            var files = zip.file(/.*/);

                            for (var iFile = 0; iFile < files.length; iFile++) {
                                var file = files[iFile];
                                var blob = await getBlob(file);

                                images[file.name]= {
                                    blob : blob,
                                    dataUri : URL.createObjectURL(blob),
                                    format  : file.name.slice((file.name.lastIndexOf(".") - 1 >>> 0) + 2)
                                };
                                   
                            }

                            accept(images);

                        });

                    }

                    reader.readAsArrayBuffer(files[iFile]);

                }

            };

            document.body.onfocus = function () {

                document.getElementById("waitDialog").style.display = "none";
                document.body.onfocus = null;

            }

            loadButton.click();

        }, 100);
    });

}

$.fn.Save = async (filename, images) => {
    let zipFile = new JSZip();
    let folder = zipFile.folder('');

    for (image in images) {
        zipFile.file(`${image.padStart(20, '0')}.${images[image].format}`, images[image].blob);
    }


    zipFile.generateAsync({ type: "blob" })
        .then(function(blob) {
            var click = function(node) {
                var event = new MouseEvent("click");
                node.dispatchEvent(event);
            }

            document.body.onfocus = function() {
                document.getElementById("waitDialog").style.display = "none";
                document.body.onfocus = null;
            }

            var saveLink = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
            var canUseSaveLink = "download" in saveLink;
            var properties = { type: 'application/zip' };
            var videoFile = `${filename}.zip`;
            var file = new Blob([blob], properties);
            var fileURL = URL.createObjectURL(file);

            saveLink.href = fileURL;
            saveLink.download = videoFile;

            click(saveLink);

        });

}

$('#uploadVideo').on('click', (e) => {
    let fileUtil = new FileUtil(document);

    fileUtil.load((files) => {

        $(this).Setup();

        processFiles(files);

    });

});

$('#loadArchive').on('click', async(e) => {

    images = await $(this).Load(images);

    for (image in images) {
        console.log(images[image]);
        addSwiperEntry(image);
    }

});

$('#saveArchive').on('click', (e) => {

    $(this).Save(filename, images);

});

$('#photobtn').on('click', (e) => {

    setTimeout(() => {
        $('#camera').attr('src', 'assets/images/camera-click.svg');

        $('#photobtn').css("color", "white");
        $('#photobtn').css("background-color", "black");

        videoPlayer.muted(true);
        $('#camera-click').get(0).play();
        var currentTime = videoPlayer.currentTime();
        var videoUtil = new VideoUtil($('#vid1 > video').get(0));
        var time = String(currentTime).padStart(20, '0');

        if (!(time in images)) {

            images[time] = videoUtil.captureVideoFrame('jpeg');
    
            setTimeout(() => {
                videoPlayer.muted(false);

                $('#camera').attr('src', 'assets/images/camera.svg');

                var entry = addSwiperEntry(time);

                $('#photobtn').css("color", "black");
                $('#photobtn').css("background-color", "white");

                $('#image-container')[0].scrollLeft = entry.addEnd ? $('#image-container')[0].scrollLeft + 400 :
                    entry.card * 400;

            }, 600);

        } else {
            var keys = Object.keys(images);
        }

    }, 1);

});

/**
 * Add another card to the swipper
 * 
 * @param {String} time The current Time
 */
function addSwiperEntry(time) {
    var entry = generateSwiperEntry(time);

    if (entry.addEnd) {
        $('#image-container')[0].appendChild(entry.node)
    } else {
        $('#image-container')[0].insertBefore(entry.node, entry.position);
    }

    return entry;

}

/**
 * Generate the Swiper Entry
 * 
 * @param {*} time The time index
 */
function generateSwiperEntry(time) {
    var cards = $('#image-container > .card');
    var addEnd = true;
    var card = 0;
    var output = cardTemplate({
        images: images,
        time: time
    });

    for (; card < cards.length; card++) {
        var imageTime = parseFloat(cards[card].id.replace("card-", ""));

        if (imageTime > parseFloat(time)) {
            addEnd = false;
            break;
        }

    }

    var node = new DOMParser().parseFromString(output, 'text/html').body.childNodes[0];

    return {
        node: node,
        position: cards[card],
        card: card,
        addEnd: addEnd
    };

}

/**
 * Window Load code
 */
$(() => {

    $('#photobtn').attr('disabled', true);

});