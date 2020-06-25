export class Message {
    mId: Number
    type: string
    payload: string
    timestamp: Number
    sender: string
}

export class SendMessageRequest {
    cId: string
    message: Message
}

export class Session {
    uid: string
}