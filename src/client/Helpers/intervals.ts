const interval = 5000;

export const connectionTracker = (
    pingFunc: (peerId: string) => Promise<unknown>,
) => {

    let pingCount: number, pongCount: number = 0, pingInterval: NodeJS.Timer;

    const create = (peerId: string) => {
        pingInterval = setInterval(async () => {
            await pingFunc(peerId);
            pingCount += 1;
        }, interval);
    };

    const onPong = () => {
        pongCount += 1;
    }

    const verify = () => {
        if (pongCount <= pingCount + 5) {
            console.log("Connection broken!");
            if (pingInterval) {
                clearInterval(pingInterval);
            }

            return false;
        }

        return true;
    };

       return { onPong, create, verify };
}
    

