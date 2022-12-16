export const join = (...args) => {
    for (let i = 0; i < args.length; i++) {
        args[i] = args[i].replaceAll("/", "");
    }

    return args.join("/");
};

export const resolve = (...args) => {
    let resolvedPath = "";
    let resolvedAbsolute = false;

    for (let i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        let path;
        if (i >= 0) path = args[i];
        else {
            path = "/";
        }

        if (!path) {
            continue;
        }

        resolvedPath = `${path}/${resolvedPath}`;
        resolvedAbsolute = path.charAt(0) === "/";
    }

    resolvedPath = resolvedPath.replace(/\/+/g, "/");

    return resolvedAbsolute ? `/${resolvedPath}` : resolvedPath;
};
