class Business {
    constructor({ room, media, view, socketBuilder, peerBuilder }) {
        this.room = room;
        this.media = media;
        this.view = view;

        this.socketBuilder = socketBuilder;

        this.peerBuilder = peerBuilder;


        this.socket = {};
        this.currentStream = {};
        this.currentPeer = {};

        this.peers = new Map();
        this.userRecordings = new Map();
    }

    static initialize(deps) {
        const instance = new Business(deps);
        return instance._init();
    }

    async _init() {
        this.view.configureRecordButton(this.onRecordPressed.bind(this));
        this.view.configureLeaveButton(this.onLeavePressed.bind(this));

        this.currentStream = await this.media.getCamera();

        this.socket = this.socketBuilder
            .setOnUserConnected(this.onUserConnected())
            .setOnUserDisconnected(this.onUserDisconnected())
            .build()


        this.currentPeer = await this.peerBuilder
            .setOnError(this.onPeerError())
            .setOnConnectionOpened(this.onPeerConnectionOpened())
            .setOnCallReceived(this.onPeerCallReceived())
            .setOnPeerStreamReceived(this.onPeerStreamReceived())
            .setOnCallError(this.onPeerCallErro())
            .setOnCallClose(this.onPeerCallClose())
            .build();

        this.addVideoStream(this.currentPeer.id);
    }

    addVideoStream(userId, stream = this.currentStream) {
        const recorderInstance = new Recorder(userId, stream);
        this.userRecordings.set(recorderInstance.fileName, recorderInstance);

        if (this.recordingEnabled) {
            recorderInstance.startRecording();
        }

        const isCurrentId = userId === this.currentPeer.id;
        this.view.renderVideo({
            userId,
            muted: false,
            stream,
            isCurrentId
        });
    }

    onUserConnected() {
        return userId => {
            console.log('User connected!', userId);
            this.currentPeer.call(userId, this.currentStream);
        };
    };

    onUserDisconnected() {
        return userId => {
            console.log('User disconnected!', userId);
            if (this.peers.has(userId)) {
                this.peers.get(userId).call.close();
                this.peers.delete(userId);
            }

            this.view.setParticipants(this.peers.size);
            this.stopRecording(userId);
            this.view.removeVideoElement(userId);
        };
    };

    onPeerError() {
        return error => {
            console.log('Error on peer', error);
        };
    };

    onPeerConnectionOpened() {
        return peer => {
            const id = peer.id;
            console.log('peer!!', peer);
            this.socket.emit('join-room', this.room, id);
        };
    };

    onPeerCallReceived() {
        return call => {
            console.log('Answering call', call);
            call.answer(this.currentStream);
        };
    }

    onPeerStreamReceived() {
        return (call, stream) => {
            const callerId = call.peer;
            if(this.peers.has(callerId)) {
                console.log('Calling twice, ignoring second call', callerId);
                return;
            }
            this.addVideoStream(callerId, stream);
            this.peers.set(callerId, { call });
            this.view.setParticipants(this.peers.size);
        };
    };

    onPeerCallErro() {
        return (call, error) => {
            console.log('An call error ocurred', error);
            this.view.removeVideoElement(call.peer);
        }
    }

    onPeerCallClose() {
        return (call) => {
            console.log('Call closed', call.peer);
        }
    }

    onRecordPressed(recordingEnabled) {
        this.recordingEnabled = recordingEnabled;
        for (const [key, value] of this.userRecordings) {
            if (this.recordingEnabled) {
                value.startRecording();
                continue;
            }
            this.stopRecording(key);
        }
    }

    async stopRecording(userId) {
        const userRecordings = this.userRecordings;
        for (const [key, value] of userRecordings) {
            if (!key.includes(userId)) continue;

            const rec = value;
            const isRecordingActive = rec.recordingActive;
            if (!isRecordingActive) continue;

            await rec.stopRecording();

            this.playRecordings(key);
        }
    }

    playRecordings(userId) {
        const user = this.userRecordings.get(userId);
        const videosURLs = user.getAllVideoURLs();
        videosURLs.map(url => {
            this.view.renderVideo({ url, userId });
        });
    }

    onLeavePressed() {
        this.userRecordings.forEach((key, value) => key.download());
    }
}