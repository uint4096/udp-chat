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
    
    return {
        addPeer,
        getPeer,
        removePeer,
        connectionsCount
    };
};

export default store;


