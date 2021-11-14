import dGram from "dgram";
import peerStore from './store';
import { RelayMessage, ClientMessage } from "./utils/types";

(() => {
    const { getPeer, addPeer } = peerStore();
    const sock = dGram.createSocket('udp4');
    const PORT = parseInt(process.env.port || "23232");

    sock.on("listening", () => {
        console.log(`UDP socket listening on port ${PORT}`);
    });

    const sendMessage = (
        type: ClientMessage["type"],
        nodeId: string,
        peerId?: string
    ) => {
        const formatMessage = (message: string): Buffer =>
            Buffer.from(JSON.stringify({ type, message }), 'utf-8');

        const send = (msg: Buffer, to?: 'node' | 'peer') => {
            const recepientId = to && to === 'peer' ? peerId : nodeId;
            const host = recepientId && recepientId.split(':')[0];
            const port = recepientId && Number(recepientId.split(':')[1]);

            console.log(type, recepientId, host, port);

            if (!host || !port) {
                throw new Error('Incorrectly formatted recepientId!');
            }

            sock.send(msg, 0, msg.length, port, host);
        };

        switch (type) {
            case 'pong': {
                send(formatMessage(''));
                break;
            }
            case 'ack': {
                if (!nodeId) {
                    throw new Error('NodeId not found! Dropping message.');
                }

                send(formatMessage(nodeId));
                break;
            }
            case 'peerInfo': {
                if (!nodeId || !peerId) {
                    throw new Error('Node or peer not found!');
                }

                send(formatMessage(peerId));
                send(formatMessage(nodeId), 'peer');
                break;
            }
            case 'rejection': {
                send(formatMessage(nodeId));
                break;
            }
            default: {
                throw new Error('Unrecognized outgoing message type!');
            }
        }
    }

    sock.on("message", (_message, rinfo) => {

        const message = JSON.parse(Buffer.from(_message).toString()) as RelayMessage;
        const nodeId = `${rinfo.address}:${rinfo.port}`;

        switch(message.type) {
            case 'advertise': {
                const username = message.value || '';
                if (!username) {
                    return;
                } else if (getPeer(username)) {
                    sendMessage("rejection", nodeId);
                }

                console.log(`Message received. nodeId: ${nodeId}`);

                addPeer(username, nodeId);
                sendMessage('ack', nodeId);
                break;
            }
            case 'holePunch': {
                const peerId = getPeer(message.value);
                console.log(`Connection request received! Peer: ${peerId}`);

                if (peerId) {
                    sendMessage('peerInfo', nodeId, peerId);
                }

                break;
            }
            default: {
                throw new Error('Unrecognized incoming message type!');
            }
        }
    });

    sock.on("error", (err) => {
        console.log(`Connection closed. Error: ${err}`);
        sock.close();
    });

    sock.bind(PORT);
})();