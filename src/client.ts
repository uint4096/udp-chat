import dGram from "dgram";
import { OutgoingMessage } from "./utils/types";
import peerStore from './store';

(() => {
    const sock = dGram.createSocket('udp4');
    const port = parseInt(process.env.PORT || "23232");
    const username = process.env.USERNAME || `hal-${Math.random() * 100}`;

    const { addPeer, getPeer } = peerStore();

    const relayAddress = `54.163.157.26:23232`;

    const ping = (address: string) => {

        const host = address.split(':')[0];
        const port = Number(address.split(':')[1]);

        const message = Buffer.from([]);
        sock.send(message, 0, message.length, port, host);
    };

    const sendMessage = (message: Buffer, peerId: string) => {
        const host = peerId.split(':')[0];
        const port = Number(peerId.split(':')[1]);

        if (host && !isNaN(port)) {
            sock.send(message, 0, message.length, port, host);
        }
    }
    
    const intervals: { [k: string]: NodeJS.Timer } = {};
    let nodeId: string = '';
    sock.on("listening", () => {
        console.log(`UDP socket listening on port ${port}`);
        intervals['relay'] = setInterval(() => ping(relayAddress), 5000);
    });

    sock.on("message", (_msg, _) => {
        const msg = JSON.parse(Buffer.from(_msg).toString('utf-8')) as OutgoingMessage;
    
        switch (msg.type) {
            case 'ack': {
                if (msg.type && msg.message) {
                    nodeId = msg.message;
                }
                break;
            }
            case 'holePunch': {
                const peerId = msg.message;

                if (peerId) {
                    const message = Buffer.from(JSON.stringify({
                        type: 'connection',
                        message: JSON.stringify({peerId: nodeId, username })
                    }));

                    sendMessage(message, peerId);
                }
                break;
            }
            case 'connection': {
                const message = JSON.parse(msg.message);
                if (message && message.username) {
                    addPeer(message.username, message.peerId);
                    intervals[message.username] = setInterval(() => ping(message.peerId));
                    console.log(`Connected to user: ${username}`);
                }

                break;
            }
            case 'chat': {
                const message = JSON.parse(msg.message);

                if (getPeer(message)) {
                    console.log(`${message.username}: ${message.text}`);
                }

                break;
            }
            default: {
                throw new Error('Unrecognized message on client!');
            }
        };
    });

    sock.on("error", (err) => {
        console.log(`Connection closed. Error: ${err}`);
        sock.close();
    });
    
    sock.bind(port);
})();