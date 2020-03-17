/*
Copyright 2017 Google Inc.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

var startButton = document.getElementById('startButton');
var callButton = document.getElementById('callButton');
var hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;
startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

//var startTime;
var localVideo = document.getElementById('localVideo');
var remoteVideo = document.getElementById('remoteVideo');



var localStream;
var pc1;
var pc2;
var offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};

function getName(pc) {
    return (pc === pc1) ? 'pc1' : 'pc2';
}

function getOtherPc(pc) {
    return (pc === pc1) ? pc2 : pc1;
}

function gotStream(stream) {
    trace('Received local stream');
    localVideo.srcObject = stream;
    localStream = stream;
    callButton.disabled = false;
}

function start() {
    trace('Requesting local stream');
    startButton.disabled = true;
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    })
        .then(gotStream)
        .catch(function (e) {
            alert('getUserMedia() error: ' + e.name);
        });
}

function call() {
    callButton.disabled = true;
    hangupButton.disabled = false;
    trace('Starting call');
  
    var servers = null;
    pc1 = new RTCPeerConnection(null);
    trace('Created local peer connection object pc1');
    pc1.onicecandidate = function (e) {
        console.log('pc1 onicecandidate');
        console.log(e);
        onIceCandidate(pc1, e);
    };
    
    pc2 = new RTCPeerConnection(null);
    trace('Created remote peer connection object pc2');
    pc2.onicecandidate = function (e) {
        console.log('pc2 onicecandidate');
        console.log(e);
        onIceCandidate(pc2, e);
    };
    pc1.oniceconnectionstatechange = function (e) {
        onIceStateChange(pc1, e);
    };
    pc2.oniceconnectionstatechange = function (e) {
        onIceStateChange(pc2, e);
    };

    pc1.addStream(localStream);
    pc2.onaddstream = gotRemoteStream;

   
    trace('Added local stream to pc1');

    trace('pc1 createOffer start');
    pc1.createOffer(
        offerOptions
    ).then(
        onCreateOfferSuccess,
        onCreateSessionDescriptionError
    );
}

function onCreateSessionDescriptionError(error) {
    trace('Failed to create session description: ' + error.toString());
}

function onCreateOfferSuccess(desc) {
    trace('Offer from pc1\n' + desc.sdp);
    trace('pc1 setLocalDescription start');
    pc1.setLocalDescription(desc).then(
        function () {
            onSetLocalSuccess(pc1);
        },
        onSetSessionDescriptionError
    );
    //return;
    trace('pc2 setRemoteDescription start');
    pc2.setRemoteDescription(desc).then(
        function () {
            onSetRemoteSuccess(pc2);
        },
        onSetSessionDescriptionError
    );
    trace('pc2 createAnswer start');
    // Since the 'remote' side has no media stream we need
    // to pass in the right constraints in order for it to
    // accept the incoming offer of audio and video.
    pc2.createAnswer().then(
        onCreateAnswerSuccess,
        onCreateSessionDescriptionError
    );
}

function onSetLocalSuccess(pc) {
    trace(getName(pc) + ' setLocalDescription complete');
}

function onSetRemoteSuccess(pc) {
    trace(getName(pc) + ' setRemoteDescription complete');
}

function onSetSessionDescriptionError(error) {
    trace('Failed to set session description: ' + error.toString());
}

function gotRemoteStream(e) {
    remoteVideo.srcObject = e.stream;
    trace('pc2 received remote stream');
}

function onCreateAnswerSuccess(desc) {
    trace('Answer from pc2:\n' + desc.sdp);
    trace('pc2 setLocalDescription start');
    pc2.setLocalDescription(desc).then(
        function () {
            onSetLocalSuccess(pc2);
        },
        onSetSessionDescriptionError
    );
    trace('pc1 setRemoteDescription start');
    pc1.setRemoteDescription(desc).then(
        function () {
            onSetRemoteSuccess(pc1);
        },
        onSetSessionDescriptionError
    );
}

function onIceCandidate(pc, event) {
    getOtherPc(pc).addIceCandidate(event.candidate)
        .then(
            function () {
                onAddIceCandidateSuccess(pc);
            },
            function (err) {
                onAddIceCandidateError(pc, err);
            }
        );
    trace(getName(pc) + ' ICE candidate: \n' + (event.candidate ?
        event.candidate.candidate : '(null)'));
}

function onAddIceCandidateSuccess(pc) {
    trace(getName(pc) + ' addIceCandidate success');
}

function onAddIceCandidateError(pc, error) {
    trace(getName(pc) + ' failed to add ICE Candidate: ' + error.toString());
}

function onIceStateChange(pc, event) {
    if (pc) {
        trace(getName(pc) + ' ICE state: ' + pc.iceConnectionState);
        console.log('ICE state change event: ', event);
    }
}

function hangup() {
    trace('Ending call');
    pc1.close();
    pc2.close();
    pc1 = null;
    pc2 = null;
    hangupButton.disabled = true;
    callButton.disabled = false;
}

// logging utility
function trace(arg) {
    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ': ', arg);
}