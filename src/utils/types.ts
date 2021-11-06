export interface IncomingMessage {
    type: 'ping' | 'connect' | 'advertise' | 'holePunch' | 'post',
    value: string;
};

export interface OutgoingMessage {
    type: 'pong' | 'ack' | 'holePunch' | 'connection' | 'post',
    message: string;
};

export interface Address {
    host: string;
    port: number;
};
