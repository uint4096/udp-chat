import { execSync } from 'child_process';
import { constants, existsSync, openSync } from 'fs';
import { Writable } from 'stream';
import { Socket } from 'net';

type MessageWriter = (peerId: string, message: string) => Promise<unknown>; 

const exec = (cmd: string, dir = process.cwd()) => execSync(cmd, { cwd: dir, stdio: 'inherit' });

const Writer = (messageWriter: MessageWriter, peerId: string) => new Writable({
    write: async (chunk, _, callback) => {
        const message = Buffer.from(chunk).toString();
        await messageWriter(peerId, message);
        callback();
    }
});

export const createChatWindow = (messageWriter: MessageWriter, peerId: string) => {

    const fifo = `/tmp/in_${peerId}`;

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

    pipe.on("connect", () => {
        console.log("Connection established!");
    });

    pipe.on("data", (data) => {
        console.log(data);
    });

    const stream = Writer(messageWriter, peerId);
    process.stdout.pipe(stream);

    process.on("SIGINT", () => {
        console.log("Connection closed");
        pipe.destroy();
        exec(`rm ${fifo}`);
        process.exit(0);
    });
};