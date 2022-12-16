import FileSystem from "./FileSystem";
import { validatePath } from "./validate";

const FILESYSTEM = new FileSystem();

export const writeFile = (path, data) => {
    validatePath(path);

    FILESYSTEM.set(path, data);
};

export const readFile = (path) => {
    validatePath(path);

    return FILESYSTEM.get(path);
};

export const exists = (path) => {
    validatePath(path);

    return FILESYSTEM.exists(path);
};

export const mkdir = (path) => {
    validatePath(path);

    FILESYSTEM.set(path, {});
};

export const readdir = (path, callback) => {
    validatePath(path);

    if (typeof callback === "function") {
        callback(FILESYSTEM.get(path));
    }

    return FILESYSTEM.get(path);
};

export const rmdir = (path) => {
    validatePath(path);

    FILESYSTEM.delete(path);
};

export const rm = (path) => {
    validatePath(path);

    FILESYSTEM.delete(path);
};
