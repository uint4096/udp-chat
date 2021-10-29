import dGram from "dgram";

(() => {
    const sock = dGram.createSocket('udp4');
    const port = parseInt(process.env.port || "23232"); 

    sock.on("listening", () => {
        console.log(`UDP socket listening on port ${port}`);
    });

    const getAckMsg = (message: string): Buffer => Buffer.from(message, 'utf-8');

    sock.on("message", (_, rinfo) => {
        const peerId = `${rinfo.address}:${rinfo.port}`;
        console.log(`Message received. PeerId: ${peerId}`);
        const msg = getAckMsg(peerId);

        sock.send(msg, 0, msg.length, rinfo.port, rinfo.address);
    });

    sock.on("error", (err) => {
        console.log(`Connection closed. Error: ${err}`);
        sock.close();
    });

    sock.bind(port);
})();