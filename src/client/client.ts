#!/usr/bin/env node

import dGram from "dgram";
import { ClientMessage } from "../utils/types";
import ConnectionStore from '../store';
import { createMessenger } from "./Helpers/messages";
import { connectionTracker as ConnectionTracker } from "./Helpers/tracker";
import { createChatWindow } from "./Helpers/window";
import minimist from 'minimist';
import { HELP_CONTENT } from "../utils/constants";
import * as pkg from '../../package.json'
import { openSync } from "fs";
import { Socket } from "net";

(() => {
    try {
        const args = minimist(process.argv.slice(2));
        const sock = dGram.createSocket('udp4');
        const PORT = parseInt(process.env.PORT || "23232");

        const relayAddress = args.relay || process.env.RELAY_ADDRESS;
        const peerUsername = args.peer || args.p;
        const username = args.username || args.u;

        if (args.help) {
            console.log(HELP_CONTENT);
            return;
        } else if (args.version) {
            console.log(pkg.version);
            return;
        }

        if (!username) {
            throw new Error("Username must be specified. See 'p2pconnect --help'.");
        }

        const { addPeer, connectionsCount, getPeerById } = ConnectionStore();
        const messenger = createMessenger(username, sock, relayAddress);
        const nodeTracker = ConnectionTracker(messenger.send);
        const relayTracker = ConnectionTracker(messenger.send);

        sock.on("message", async (_msg, rinfo) => {
            const msg = JSON.parse(Buffer.from(_msg).toString('utf-8')) as ClientMessage;
            const senderId = `${rinfo.address}:${rinfo.port}`;

            switch (msg.type) {
                case 'ping': {
                    messenger.send('pong', senderId);
                    break;
                }
                case 'pong': {
                    nodeTracker.onPong();
                    relayTracker.onPong();
                    break;
                }
                case 'ack': {
                    relayTracker.create(relayAddress);
                    if (peerUsername) {
                        await messenger.getPeerInfo(peerUsername);
                    }

                    break;
                }
                case 'rejection': {
                    if (senderId === relayAddress) {
                        console.error("Username already exists!");
                    } else {
                        console.error("Connection rejected!");
                    }

                    process.exit(0);
                }
                case 'peerInfo': {
                    const peerId = msg.message;
                    if (connectionsCount() > 0) {
                        await messenger.send('rejection', peerId)
                    }

                    if (peerId) { await messenger.send('connection', peerId); }

                    break;
                }
                case 'connection': {
                    const username = msg.message;
                    if (username) {
                        addPeer(username, senderId);

                        nodeTracker.create(senderId);
                        createChatWindow(messenger.post, nodeTracker.verify, senderId);
                        console.log(`Connected to peer: ${username}`);
                    }

                    break;
                }
                case 'post': {
                    const fifo = `/tmp/in_${senderId}`;
                    const fd = openSync(fifo, 'w+');
                    const pipe = new Socket({ fd });

                    const peer =  getPeerById(senderId);

                    if (peer) {
                        pipe.write(`${peer}> ${msg.message}`);
                    }

                    pipe.destroy();
                    break;
                }
                default: {
                    throw new Error(`Unrecognized message type ${msg.type}!`);
                }
            };
        });

        sock.on("listening", async () => {
            console.log(`Listening for connections.`);
            await messenger.advertise();
        });

        sock.on("error", (err) => {
            console.error(`Connection closed. Error: ${err}.`);
            sock.close();
        });

        sock.bind(PORT);
    } catch(err) {
        console.error(err);
    }
})();
