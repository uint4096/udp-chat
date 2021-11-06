import dGram from "dgram";
import { OutgoingMessage } from "../utils/types";
import PeerStore from '../store';
import { messageHelpers } from "./Helpers/messages";
import { connectionTracker } from "./Helpers/intervals";
import { createChatWindow } from "./Helpers/window";
import { execSync } from "child_process";

(() => {
    const sock = dGram.createSocket('udp4');
    const PORT = parseInt(process.env.PORT || "23232");
    const relayAddress = process.env.RELAY_ADDRESS || '';

    const { addPeer } = PeerStore();
    const { ping, advertise, connect, getPeerInfo, post }
        = messageHelpers('', sock, relayAddress);

    const tracker = connectionTracker(ping);

    sock.on("message", (_msg, rinfo) => {
        const msg = JSON.parse(Buffer.from(_msg).toString('utf-8')) as OutgoingMessage;
        const senderId = `${rinfo.address}:${rinfo.port}`;
    
        switch (msg.type) {
            case 'pong': {
                tracker.onPong(senderId);
                break;
            }
            case 'ack': {
                tracker.create(relayAddress);
                break;
            }
            case 'holePunch': {
                const peerId = msg.message;
                if (peerId) { connect(peerId); }

                break;
            }
            case 'connection': {
                const message = JSON.parse(msg.message);
                if (message && message.username) {
                    addPeer(message.username, message.peerId);

                    tracker.create(message.peerId);
                    createChatWindow(post, message.peerId);
                    console.log(`Connected to user: ${message.username}`);
                }

                break;
            }
            case 'post': {
                const fifo = `/tmp/in_${senderId}`;
                execSync(`echo ${msg.message} > ${fifo}`);
            }
            default: {
                throw new Error(`Unrecognized message type ${msg.type}!`);
            }
        };
    });

    sock.on("listening", async () => {
        console.log(`UDP socket listening on port ${PORT}`);
        await advertise();
    });

    sock.on("error", (err) => {
        console.log(`Connection closed. Error: ${err}`);
        sock.close();
    });

    sock.bind(PORT);
})();