// https://www.webrtc-experiment.com/

var fs = require('fs');

// don't forget to use your own keys!
var options = {
    key: fs.readFileSync('./real-keys/key.pem'),
    cert: fs.readFileSync('./real-keys/cert.pem')
    //key: fs.readFileSync('./fake-keys/privatekey.pem'),
    //cert: fs.readFileSync('./fake-keys/certificate.pem')
};

// HTTPs server
var app = require('http').createServer(function(request, response) {
    response.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var link = 'https://github.com/muaz-khan/WebRTC-Experiment/tree/master/socketio-over-nodejs';
    response.write('<title>socketio-over-nodejs</title><h1><a href="'+ link + '">socketio-over-nodejs</a></h1><pre>var socket = io.connect("https://webrtcweb.com:9559/");</pre>');
    response.end();
});


// socket.io goes below

var io = require('socket.io').listen(app, {
    log: true,
    origins: '*:*'
});

io.set('transports', [
    //'websocket',
    'xhr-polling',
    'jsonp-polling'
]);


var channels = {};

io.sockets.on('connection', function (socket) {

    console.log("CONNECTED");
    socket.on("hello", data => console.log("HELLO FROM PROXY"));

    var initiatorChannel = '';
    if (!io.isConnected) {
        io.isConnected = true;
    }

    socket.on('new-channel', function (data) {
        console.log("new channel: "+ data.channel);
        if (!channels[data.channel]) {
            initiatorChannel = data.channel;
        }

        channels[data.channel] = data.channel;
        onNewNamespace(data.channel, data.sender);
    });

    socket.on('presence', function (channel) {
        console.log("presence on channel: " + channel);
        var isChannelPresent = !! channels[channel];
        socket.emit('presence', isChannelPresent);
    });

    socket.on('disconnect', function (channel) {
        console.log("discounnect from channel: " + channel);
        if (initiatorChannel) {
            delete channels[initiatorChannel];
        }
    });
});

function onNewNamespace(channel, sender) {
    io.of('/' + channel).on('connection', function (socket) {
        console.log("connect to channel: " + channel);
        var username;
        if (io.isConnected) {
            io.isConnected = false;
            socket.emit('connect', true);
        }

        socket.on('message', function (data) {
            console.log("mesage from channel: " + channel);
            if (data.sender == sender) {
                if(!username) username = data.data.sender;
                
                socket.broadcast.emit('message', data.data);
            }
        });
        
        socket.on('disconnect', function() {
            console.log("disconnect from channel: " + channel);
            if(username) {
                socket.broadcast.emit('user-left', username);
                username = null;
            }
        });
    });
}


app.listen(process.env.PORT || 9559);

process.on('unhandledRejection', (reason, promise) => {
  process.exit(1);
});

console.log('Please open SSL URL: https://localhost:'+(process.env.PORT || 9559)+'/');
