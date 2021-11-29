import dGram from "dgram";
import { createMessenger } from "./client/Helpers/messages";
import { connectionTracker } from "./client/Helpers/tracker";
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
        const messenger = createMessenger('', sock);
        const tracker = connectionTracker(messenger.send);

        switch (type) {
            case 'ping': {
                messenger.reply('pong', nodeId, '');
                break;
            }
            case 'pong': {
                tracker.onPong();
                break;
            }
            case 'ack': {
                if (!nodeId) {
                    throw new Error('NodeId not found! Dropping message.');
                }

                tracker.create(nodeId);
                messenger.reply('ack', nodeId, nodeId);
                break;
            }
            case 'peerInfo': {
                if (!nodeId || !peerId) {
                    throw new Error('Node or peer not found!');
                }

                messenger.reply('peerInfo', nodeId, peerId);
                messenger.reply('peerInfo', peerId, nodeId);
                break;
            }
            case 'rejection': {
                messenger.reply('peerInfo', nodeId, nodeId);
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