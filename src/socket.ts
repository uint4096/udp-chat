import dGram from "dgram";
import { createMessenger } from "./client/Helpers/messages";
import { connectionTracker } from "./client/Helpers/tracker";
import store from './store';
import { RelayMessage, ClientMessage } from "./utils/types";

(() => {
    const peerStore = store();
    const trackerStore = store<ReturnType<typeof connectionTracker>>();

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
            case 'pong': {
                messenger.reply('pong', nodeId, '');
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
    };

    const onFailedConnection = (nodeId: string) => () => trackerStore.remove(nodeId);

    sock.on("message", (_message, rinfo) => {

        const message = JSON.parse(Buffer.from(_message).toString()) as RelayMessage;
        const nodeId = `${rinfo.address}:${rinfo.port}`;
        const messenger = createMessenger('', sock);

        switch(message.type) {
            case 'ping': {
                sendMessage("pong", nodeId);
                break;
            }
            case 'pong': {
                const tracker = trackerStore.get(nodeId);
                if (tracker) {
                    tracker.onPong();
                }
                break;
            }
            case 'advertise': {
                const username = message.value || '';
                if (!username) {
                    return;
                } else if (peerStore.get(username)) {
                    sendMessage("rejection", nodeId);
                }

                console.log(`Message received. nodeId: ${nodeId}`);

                const tracker = connectionTracker(messenger.send);
                tracker.create(nodeId);
                trackerStore.add(nodeId, tracker);

                peerStore.add(username, nodeId);
                sendMessage('ack', nodeId);
                break;
            }
            case 'holePunch': {
                const peerId = peerStore.get(message.value);
                console.log(`Connection request received! Peer: ${peerId}`);

                if (peerId) {
                    const tracker = trackerStore.get(peerId);

                    if (tracker) {
                        tracker.verify(onFailedConnection(peerId));
                    }

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