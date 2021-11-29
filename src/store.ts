const store = <T = string>() => {
    const store = new Map();

    const add = (key: string, value: T) => store.set(key, value);
    const get = (key: string): T | undefined => {
        if (store.has(key)) {
            return store.get(key);
        }
    };
    const remove = (key: string) => store.delete(key);
    const count = () => store.size;
    const getByValue = (id: string): T | undefined => {
        const entry = Array.from(store.entries()).find((peer) => peer[1] === id);
        if (entry) {
            return entry[0];
        }
    };
    
    return {
        add,
        get,
        remove,
        count,
        getByValue
    };
};

export default store;


