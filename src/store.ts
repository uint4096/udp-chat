const store = () => {
    const store = new Map();

    const addPeer = (key: string, value: string) => store.set(key, value);
    const getPeer = (key: string) => {
        if (store.has(key)) {
            return store.get(key);
        }
    };
    const removePeer = (key: string) => store.delete(key);
    const connectionsCount = () => store.size;
    const getPeerById = (id: string) => {
        const entry = Array.from(store.entries()).find((peer) => peer[1] === id);
        if (entry) {
            return entry[0];
        }
    };
    
    return {
        addPeer,
        getPeer,
        removePeer,
        connectionsCount,
        getPeerById
    };
};

export default store;


