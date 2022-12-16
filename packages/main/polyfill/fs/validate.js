export const validatePath = (path) => {
    if (typeof path !== "string") throw new TypeError(`'path' must be of type string. Received ${typeof path}`);
};
