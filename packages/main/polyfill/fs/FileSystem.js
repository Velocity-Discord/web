const getStorageDescriptor = () => {
    const f = document.createElement("iframe");
    document.body.append(f);
    const pd = Object.getOwnPropertyDescriptor(f.contentWindow, "localStorage");
    f.remove();
    return pd;
};

Object.defineProperty(window, "localStorage", getStorageDescriptor());

export default class FileSystem {
    #record = {
        ...(window.localStorage.getItem("FileSystem") ? JSON.parse(localStorage.getItem("FileSystem")) : {}),
    };

    set(path, data) {
        const segments = path.split("/");
        let current = this.#record;

        for (let index in segments) {
            const segment = segments[index];

            if (Number(index) === segments.length - 1) {
                current[segment] = data;
            } else {
                current[segment] = current[segment] || {};
            }

            current = current[segment];
        }

        window.localStorage.setItem("FileSystem", JSON.stringify(this.#record));
    }
    get(path) {
        const segments = path.split("/");
        let current = this.#record;

        for (let index in segments) {
            const segment = segments[index];
            current = current[segment];
        }

        return current;
    }
    exists(path) {
        const segments = path.split("/");
        let current = this.#record;

        for (let index in segments) {
            const segment = segments[index];
            current = current[segment];
        }

        return typeof current !== "undefined";
    }
    delete(path) {
        const segments = path.split("/");
        let current = this.#record;

        for (let index in segments) {
            const segment = segments[index];

            if (Number(index) === segments.length - 1) {
                delete current[segment];
            } else {
                current = current[segment];
            }
        }

        window.localStorage.setItem("FileSystem", JSON.stringify(this.#record));
    }
}
