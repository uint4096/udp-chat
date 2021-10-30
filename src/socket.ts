import dGram from "dgram";
import peerStore from './store';
import { IncomingMessage, OutgoingMessage } from "./utils/types";

(() => {
    const { getPeer, addPeer } = peerStore();
    const sock = dGram.createSocket('udp4');
    const port = parseInt(process.env.port || "23232"); 

    sock.on("listening", () => {
        console.log(`UDP socket listening on port ${port}`);
    });

    const sendMessage = (
        type: OutgoingMessage["type"],
        nodeId: string,
        peerId?: string,
        message?: string
    ) => {
        const formatMessage = (message: string): Buffer =>
            Buffer.from(JSON.stringify({ type, message }), 'utf-8');

        const send = (msg: Buffer, to?: 'node' | 'peer') => {
            const recepientId = to && to === 'peer' ? peerId : nodeId;
            const host = recepientId && recepientId.split(':')[0];
            const port = recepientId && Number(recepientId.split(':')[1]);

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
                if (!nodeId || !getPeer(nodeId)) {
                    throw new Error('NodeId not found! Dropping message.');
                }

                send(formatMessage(nodeId));
                break;
            }
            case 'holePunch': {
                if (!message || !peerId || !getPeer(peerId) || !getPeer(nodeId)) {
                    throw new Error('Node or peer not found! Dropping messages.'); 
                }

                send(formatMessage(peerId));
                send(formatMessage(nodeId), 'peer');
                break;
            }
            default: {
                throw new Error('Unrecognized outgoing message type!');
            }
        }
    } 

    sock.on("message", (_message, rinfo) => {

        const message = JSON.parse(Buffer.from(_message).toString()) as IncomingMessage;

        switch(message.type) {
            case 'ping': {
                sendMessage('pong', `${rinfo.address}:${rinfo.port}`);
            }
            case 'advertise': {
                const nodeId = `${rinfo.address}:${rinfo.port}`;
                const username = message.value || '';
                if (!username) {
                    return;
                }

                console.log(`Message received. nodeId: ${nodeId}`);

                addPeer(username, nodeId);
                sendMessage('ack', nodeId);
            }
            case 'connect': {
                const nodeId = `${rinfo.address}:${rinfo.port}`;
                const peerId = message.value ?? message.value;

                if (peerId && getPeer(peerId)) {
                    sendMessage('holePunch', nodeId, peerId);
                }
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

    sock.bind(port);
})();