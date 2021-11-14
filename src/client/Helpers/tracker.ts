import { PING_INTERVAL } from "../../utils/constants";

export const connectionTracker = (
    pingFunc: (type: 'ping', peerId: string) => Promise<unknown>,
) => {

    let pingCount: number = 0, pongCount: number = 0, pingTimer: NodeJS.Timer;

    const create = (peerId: string) => {
        pingTimer = setInterval(async () => {
            await pingFunc('ping', peerId);
            pingCount += 1;
        }, PING_INTERVAL);
    };

    const onPong = () => {
        pongCount += 1;
    }

    const verify = () => {
        if (pingCount > (pongCount + 3)) {
            console.log("Connection broken!");
            if (pingTimer) {
                clearInterval(pingTimer);
            }

            return false;
        }

        return true;
    };

    return { onPong, create, verify };
}


