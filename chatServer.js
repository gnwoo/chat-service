const PROTO_PATH = './protos/message_chat.proto'

var grpc = require('grpc');
var protoLoader = require('@grpc/proto-loader');
var packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    }
);
var ChatService = grpc.loadPackageDefinition(packageDefinition).ChatService;
var client = new ChatService.ChatService('localhost:50051', grpc.credentials.createInsecure())

var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

//var chatService = require('../chat-data-service/chatDataServer')

var serverId = 'msgServer1'
let local_session = new Map()

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

function fakeAuth(jwt) {
    return jwt
}

function getSocketUid(socketId) {
    return local_session.get(socketId)['uid']
}

io.on('connection', (socket) => {
    //{'cId': conversationId, 'message': {'type': str, 'payload': data}}
    socket.on('chatMessage', (data) => {
        let _ts = Date.now()
        data['message']['timestamp'] = _ts
        data['message']['from'] = getSocketUid(socket.id)
        console.log(data)

        client.NewMessage({
            cId: data['cId'],
            msg: data['message']
        }, function (err, response) {
            console.log(response)
        })

        io.to(data['cId']).emit('chatMessage',data['message'])
    });

    //{'token': jwtToken}
    socket.on('connection', (data) => {
        console.log("New connection: %s",data)
        let uid = fakeAuth(data)
        local_session[socket.id] = {'uid': uid}
    })

    //
    socket.on('fetchChat', (data) => {
        console.log(data)
        let call = client.FetchOfflineChat()

        // let cIds = data['cIds']
        // let timestamps = data['timestamps']
        call.on('data', function (d) {
            console.log(d)
            socket.emit('fetchChat', d)
        })
        // call.on('end', function (d, e) {
        //     console.log('END')
        // })
        //let chatToPush = {}
        for (let i = 0; i < data.length;i++) {
            
            console.log("Joining %s", data[i])
            socket.join(data[i].cId)
            call.write(data[i])
            //chatToPush[cIds[c]] = chatService.getChatAfter(cIds[c], timestamps[c])
        }
        //socket.emit('fetchChat', chatToPush)
    })
});


http.listen(3000, () => {
    console.log('listening on *:3000');
});