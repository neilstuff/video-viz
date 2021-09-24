function VideoUtil(video) {

    this.__video = video;

};

VideoUtil.prototype.captureVideoFrame  = function(format, quality) {
    var video = (typeof this.__video === 'string') ?  document.getElementById(this.__video) : this.__video ;
    format = format || 'jpeg';
    quality = quality || 0.92;

    if (!video || (format !== 'png' && format !== 'jpeg')) {
        return false;
    }

    var canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas.getContext('2d').drawImage(video, 0, 0);

    var dataUri = canvas.toDataURL('image/' + format, quality);
    var data = dataUri.split(',')[1];
    var mimeType = dataUri.split(';')[0].slice(5)

    var bytes = window.atob(data);
    var buf = new ArrayBuffer(bytes.length);
    var arr = new Uint8Array(buf);

    for (var i = 0; i < bytes.length; i++) {
        arr[i] = bytes.charCodeAt(i);
    }

    var blob = new Blob([ arr ], { type: mimeType });

    return { blob: blob, dataUri: dataUri, format: format };

}