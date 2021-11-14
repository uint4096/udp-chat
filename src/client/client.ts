#!/usr/bin/env node

import dGram from "dgram";
import { ClientMessage } from "../utils/types";
import PeerStore from '../store';
import { messageHelpers } from "./Helpers/messages";
import { connectionTracker } from "./Helpers/intervals";
import { createChatWindow } from "./Helpers/window";
import minimist from 'minimist';
import { HELP_CONTENT } from "../utils/constants";
import * as pkg from '../../package.json'
import { openSync } from "fs";
import { O_NONBLOCK, O_WRONLY } from "constants";
import { Socket } from "net";

(() => {
    try {
        const args = minimist(process.argv.slice(2));
        const sock = dGram.createSocket('udp4');
        const PORT = parseInt(process.env.PORT || "23232");

        const relayAddress = args.relay || process.env.RELAY_ADDRESS;
        const peerUsername = args.peer;
        const username = args.username;

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

        const { addPeer } = PeerStore();
        const { 
            ping,
            pong,
            advertise,
            connect,
            getPeerInfo,
            post 
        } = messageHelpers(username, sock, relayAddress);

        const tracker = connectionTracker(ping);

        sock.on("message", async (_msg, rinfo) => {
            const msg = JSON.parse(Buffer.from(_msg).toString('utf-8')) as ClientMessage;
            const senderId = `${rinfo.address}:${rinfo.port}`;

            switch (msg.type) {
                case 'ping': {
                    pong(senderId);
                    break;
                }
                case 'pong': {
                    tracker.onPong();
                    break;
                }
                case 'ack': {
                    tracker.create(relayAddress);
                    if (peerUsername) {
                        await getPeerInfo(peerUsername);
                    }

                    break;
                }
                case 'peerInfo': {
                    const peerId = msg.message;
                    if (peerId) { await connect(peerId); }

                    break;
                }
                case 'connection': {
                    const username = msg.message;
                    if (username) {
                        addPeer(username, senderId);

                        tracker.create(senderId);
                        createChatWindow(post, tracker.verify, senderId);
                        console.log(`Connected to peer: ${username}`);
                    }

                    break;
                }
                case 'post': {
                    const fifo = `/tmp/in_${senderId}`;
                    const fd = openSync(fifo, O_WRONLY | O_NONBLOCK);
                    const pipe = new Socket({ fd });

                    pipe.write(`${new Date().toDateString()}> ${msg.message}`);
                    pipe.destroy();
                    break;
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
            console.log(`Connection closed. Error: ${err}.`);
            sock.close();
        });

        sock.bind(PORT);
    } catch(err) {
        console.error(err);
    }
})();
