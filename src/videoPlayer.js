const MIME_CODEC = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
const SEGMENT_LENGTH = 1024 * 1024;

class VideoPlayer {

    constructor(videoElement, videoUrl) {
        if (!videoElement) {
            throw new Error('The video-player must received video-element when created');
        }
        if (!videoUrl) {
            throw new Error('The video-player must received video-url when created');
        }
        this.videoElement = videoElement;
        this.videoUrl = videoUrl;
        this.onTimeUpdate = () => null;
        this.mediaSource = null;
        this.sourceBuffer = null;
        this.videoLength = null;
        this.initialize();
    }

    play() {
        if (this.videoElement.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
            this.videoElement.play();
        } else {
            this.videoElement.addEventListener('canplay', () => this.videoElement.play());
        }
    }

    pause() {
        this.videoElement.pause();
    }

    setOnTimeUpdate(onTimeUpdate) {
        this.onTimeUpdate = onTimeUpdate;
    }

    seekTo(timeFraction) {
        this.videoElement.currentTime = timeFraction * this.videoElement.duration;
    }

    isPlaying() {
        return !this.videoElement.paused && !this.videoElement.ended;
    }

    initialize() {
        if (!MediaSource.isTypeSupported(MIME_CODEC)) {
            throw new Error('Unsupported media format');
        }
        this.mediaSource = new MediaSource();
        this.videoElement.src = URL.createObjectURL(this.mediaSource);
        this.mediaSource.addEventListener('sourceopen', () => {
            this.sourceBuffer = this.mediaSource.addSourceBuffer(MIME_CODEC);
            this.sourceBuffer.addEventListener('error', error => console.error('Source buffer problem: ', error));
            this.getVideoFileLength(length => {
                this.videoLength = length;
                this.fetchSegmentsInSerial(0);
            });
        });
        this.videoElement.addEventListener('timeupdate', () =>
            this.onTimeUpdate(this.videoElement.currentTime / this.videoElement.duration));
    }

    fetchSegmentsInSerial(fromIndex) {
        const start = fromIndex * SEGMENT_LENGTH;
        const end = start + SEGMENT_LENGTH - 1;
        if (start < this.videoLength) {
            this.fetchSegment(start, end, chunk => {
                this.sourceBuffer.appendBuffer(chunk);
                setTimeout(() => this.fetchSegmentsInSerial(fromIndex + 1), 500);
            })
        } else {
            this.mediaSource.endOfStream();
        }
    }

    fetchSegment(start, end, callback) {
        const xhr = new XMLHttpRequest();
        xhr.open('get', this.videoUrl);
        xhr.responseType = 'arraybuffer';
        xhr.setRequestHeader('Range', 'bytes=' + start + '-' + end);
        xhr.onload = () => callback(xhr.response);
        xhr.send();
    };

    getVideoFileLength(callback) {
        const xhr = new XMLHttpRequest();
        xhr.open('head', this.videoUrl);
        xhr.onload = () => callback(xhr.getResponseHeader('content-length'));
        xhr.send();
    };
}

