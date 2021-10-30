const store = () => {
    const store = new Map();

    const addPeer = (key: string, value: string) => store.set(key, value);
    const getPeer = (key: string) => {
        if (store.has(key)) {
            return key;
        }
    };
    const removePeer = (key: string) => store.delete(key);
    const getAllPeers = () => store.values();
    
    return {
        addPeer,
        getPeer,
        removePeer,
        getAllPeers
    };
};

export default store;


