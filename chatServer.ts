import {Socket} from "socket.io";

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

import * as dtos from "./protos/dtos"

import * as express from "express";
const app = express();

var http = require('http').createServer(app);
var io = require('socket.io')(http);

//var chatService = require('../chat-data-service/chatDataServer')

var serverId = 'msgServer1'
var local_session = new Map<string, dtos.Session>()

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

function fakeAuth(jwt): string {
    return jwt['uid']
}

function getSocketUid(socketId: string) {
    console.log(local_session, socketId)
    return local_session.get(socketId).uid
}

io.on('connection', (socket: Socket) => {
    socket.on('sendMessage', (data: dtos.SendMessageRequest) => {
        console.log("RUA")
        let _ts = Date.now()
        data.message.timestamp = _ts
        data.message.sender = getSocketUid(socket.id)
        console.log(data)

        client.NewMessage({
            cId: data.cId,
            msg: data.message
        }, function (err, response) {
            console.log(response)
        })
        //TODO: exclude sender
        io.to(data.cId).emit('sendMessageReply',data.message)
    });

    socket.on('authSocket', (data: Map<string, any>) => {
        console.log("New connection: %s",data)
        let newSession = new dtos.Session()
        newSession.uid = fakeAuth(data)
        local_session.set(socket.id, newSession)
    })

    socket.on('fetchChat', (data: Array<Map<string, any>>) => {
        let call = client.FetchOfflineChat()

        call.on('data', function (d) {
            console.log(d)
            socket.emit('fetchChat', d)
        })

        for (let i = 0; i < data.length;i++) {
            console.log("Joining %s", data[i])
            socket.join(data[i]['cId'])
            call.write(data[i])
        }
    })
});


http.listen(3000, () => {
    console.log('listening on *:3000');
});