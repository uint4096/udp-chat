export interface IncomingMessage {
    type: 'ping' | 'connect' | 'advertise' | 'broadcast',
    value: string;
};

export interface OutgoingMessage {
    type: 'pong' | 'ack' | 'holePunch' | 'connection' | 'chat',
    message: string;
};