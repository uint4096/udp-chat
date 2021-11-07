import { Address, ClientMessage, RelayMessage } from "../../utils/types";
import { Socket } from "dgram";

export const messageHelpers = (username: string, socket: Socket, relayId: string) => {

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

    const ping = async (peerId: string) => await sendMessage(peerId, { type: 'ping', value: '' });
    const advertise = async () => await sendMessage(relayId, { type: 'advertise', value: username});
    const getPeerInfo = async (peer: string) => await sendMessage(relayId, { type: 'holePunch', value: peer });
    const post = async (peerId: string, message: string) => await sendMessage(peerId, { type: 'post', value: message });
    const connect = async (peerId: string) => await sendMessage(peerId, {
        type: 'connection',
        message: username 
    });

    return { ping, advertise, getPeerInfo, connect, post };
}