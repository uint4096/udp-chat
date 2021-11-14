import { execSync } from 'child_process';
import { constants, existsSync, openSync } from 'fs';
import { Writable } from 'stream';
import { Socket } from 'net';

type MessageWriter = (peerId: string, message: string) => Promise<unknown>;
type VerifyConnection = () => boolean;
type Args = [MessageWriter, VerifyConnection, string];

const exec = (cmd: string, dir = process.cwd()) => execSync(cmd, { cwd: dir, stdio: 'inherit' });

const Writer = (
    messageWriter: MessageWriter,
    verifyConnection: VerifyConnection,
    peerId: string
) => new Writable({
    write: async (chunk, _, callback) => {
        const message = Buffer.from(chunk).toString();
        if (!verifyConnection()) {
            const err = new Error("Peer is not responding.");
            callback(err);
        } else {
            await messageWriter(peerId, message);
            callback(null);
        }
    }
});

export const createChatWindow = (...args: Args) => {

    const fifo = `/tmp/in_${args[2]}`;

    if (!existsSync(fifo)) {
        exec(`mkfifo ${fifo}`);
    }

    /*
    * Specifying the flag for both read and write (O_RDWR) so that
    * there's atleast one writer open and EOF isn't recieved after the first
    * message.
    */
    const fd = openSync(fifo, constants.O_RDWR | constants.O_NONBLOCK);
    const pipe = new Socket({ fd });

    const terminateProcess = () => {
        console.log("Connection closed");
        pipe.destroy();
        exec(`rm ${fifo}`);
        process.exit(0);
    };

    pipe.on("connect", () => {
        console.log("Connection established!");
    });

    pipe.on("data", (data) => {
        console.log(data);
    });

    const stream = Writer(...args);
    process.stdout.pipe(stream);

    stream.on("error", () => terminateProcess());
    process.on("SIGINT", () => terminateProcess());
    process.on("SIGTERM", () => terminateProcess());
};