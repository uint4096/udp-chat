import PeerStore from '../../store';

const pings = new Map<string, NodeJS.Timer>();
const counters = new Map<string, number>();

const interval = 5000;

export const connectionTracker = (
    pingFunc: (peerId: string) => Promise<unknown>
) => {

    const checkConnection = (peerId: string) => {
        if (counters.has(peerId) && (counters.get(peerId) as number) <= 5) {
            return true;
        }
    };

    const create = (peerId: string) =>
        pings.set(
            peerId,
            setInterval(async () => {
                await pingFunc(peerId);

                if (!counters.has(peerId)) {
                    counters.set(peerId, 0);
                }

                counters.set(peerId, counters.get(peerId) as number + 1);
            }, interval)
        );

    const onPong = (peerId: string) => {
        if (counters.has(peerId)) {
            counters.set(peerId, counters.get(peerId) as number - 1);
        }
    };

    return { create, onPong, checkConnection };
}
    

