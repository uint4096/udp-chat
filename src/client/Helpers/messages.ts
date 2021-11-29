import { Address, ClientMessage, RelayMessage } from "../../utils/types";
import { Socket } from "dgram";

export const createMessenger = (username: string, socket: Socket, relayId?: string) => {

    const promisifySend = (
        ...args: [
            msg: string | Uint8Array,
            offset: number,
            length: number,
            port: number,
            address: string,
        ]
    ) =>
        new Promise((resolve, reject) => {
            socket.send(...args, (err: Error | null, bytes: number) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(bytes);
                }
            })
        });

    const getAddress = (nodeId: string): Address => ({
        host: nodeId.split(':')[0],
        port: Number(nodeId.split(':')[1])
    });

    const sendMessage = (peerId: string, msg: RelayMessage | ClientMessage) => {
        const { host, port } = getAddress(peerId);
        const message = Buffer.from(JSON.stringify(msg));

        if (host && !isNaN(port)) {
            return promisifySend(message, 0, message.length, port, host);
        }

        return Promise.resolve();
    };

    return {
        send: async (
            type: Exclude<ClientMessage["type"], 'ack' | 'peerInfo' | 'post'>,
            peerId: string
        ) => await sendMessage(peerId, { type, message: username }),

        reply: async (
            type: Exclude<ClientMessage["type"], 'connection' | 'post'>,
            recepientId: string,
            message: string
        ) => await sendMessage(recepientId, { type, message }),

        advertise: async () => relayId && await sendMessage(relayId, {
            type: 'advertise',
            value: username
        }),

        getPeerInfo: async (peer: string) => relayId && await sendMessage(relayId, {
            type: 'holePunch',
            value: peer
        }),

        post: async (peerId: string, message: string) => await sendMessage(peerId, {
            type: 'post',
            message
        })
    };
}