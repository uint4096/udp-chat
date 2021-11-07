export interface RelayMessage {
    type: 'ping' | 'connect' | 'advertise' | 'holePunch' | 'post',
    value: string;
};

export interface ClientMessage {
    type: 'pong' | 'ack' | 'peerInfo' | 'connection' | 'post',
    message: string;
};

export interface Address {
    host: string;
    port: number;
};
