export interface RelayMessage {
    type:
        | 'connect'
        | 'advertise'
        | 'holePunch'
        | 'post',
    value: string;
};

export interface ClientMessage {
    type: 
        | 'ping'
        | 'pong'
        | 'ack'
        | 'peerInfo'
        | 'connection'
        | 'post'
        | 'rejection',
    message: string;
};

export interface Address {
    host: string;
    port: number;
};
