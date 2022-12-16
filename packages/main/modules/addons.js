import { showToast } from "./notifications";
import { themes } from "../util/components";
import { Stream, getAllData } from "./datastore";
import ObservableArray from "../structs/array";
import ColorUtils from "../util/color";
import NameUtils from "../util/names";
import logger from "../util/logger";

const Logger = new logger("Addon Manager");

import polyfill from "../polyfill";

const { fs, path } = polyfill;

const Settings = Stream("config");

const PluginsPath = "plugins";
const ThemesPath = "themes";

export const Registry = {
    plugins: new ObservableArray(),
    themes: new ObservableArray(),
};

export let enabledPlugins = Array.isArray(Settings.enabledPlugins) ? new ObservableArray(...Settings.enabledPlugins) : new ObservableArray();
export let enabledThemes = Array.isArray(Settings.enabledThemes) ? new ObservableArray(...Settings.enabledThemes) : new ObservableArray();

enabledPlugins.addListener((value) => {
    Settings.enabledPlugins = [...value];
});

enabledThemes.addListener((value) => {
    Settings.enabledThemes = [...value];
});

const validateDirs = () => {
    // if (!fs.exists(PluginsPath)) {
    //     fs.mkdir(PluginsPath);
    // }
    // if (!fs.exists(ThemesPath)) {
    //     fs.mkdir(ThemesPath);
    // }
};

const formatId = (name) => {
    return name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
};

export const initPlugins = () => {
    validateDirs();

    showToast("Reading Plugin Files", { type: "velocity" });

    fs.readdir(PluginsPath, (files) => {
        const folders = Object.keys(files).filter((file) => typeof files[file] === "object");

        folders.forEach((folder) => {
            if (!fs.exists(path.join(PluginsPath, folder, "velocity_manifest.json"))) return Logger.error(`Plugin ${folder} does not have a manifest file!`);

            try {
                const _manifest = JSON.parse(fs.readFile(path.join(PluginsPath, folder, "velocity_manifest.json"), "utf8"));

                let manifest = {
                    name: _manifest.name,
                    description: _manifest.description,
                    version: _manifest.version,
                    author: _manifest.author,
                    license: _manifest.license,
                    filePath: path.join(PluginsPath, folder),
                    social: {
                        invite: _manifest.social?.invite,
                        website: _manifest.social?.website,
                        github: _manifest.social?.github,
                        donate: _manifest.social?.donate,
                    },
                    main: _manifest.main,
                    web: _manifest.web,
                    updates: _manifest.updates,
                    _type: "Plugins",
                };

                const main = fs.readFile(path.join(PluginsPath, folder, manifest.web ?? manifest.main), "utf8");

                const instance = new Function("Velocity", "module", "VelocityWeb", `${main}; return module.exports//# sourceURL=velocity://${manifest.name}.js`)(Velocity, { exports: {} }, VelocityWeb);

                manifest.instance = new instance(manifest);

                Registry.plugins.insertNew(manifest);

                showToast(`Loaded ${manifest.name}`);

                if (Plugins.isEnabled(manifest.name)) {
                    Plugins.disable(manifest.name, true);
                    Plugins.enable(manifest.name);
                }
            } catch (e) {
                Logger.error(`Error loading ${folder}`, e);
                showToast(`Error loading ${folder}`, { type: "error" });
            }
        });
    });
};

export const Plugins = {
    get dir() {
        return PluginsPath;
    },
    add: () => {
        const el = document.createElement("input");
        el.setAttribute("type", "file");
        el.setAttribute("webkitdirectory", "true");
        el.setAttribute("directory", "true");

        el.addEventListener("change", (e) => {
            const { files } = e.target;

            if (files.length === 0) return;

            const folder = files[0].webkitRelativePath.split("/")[0];

            for (const file of files) {
                const relativePath = file.webkitRelativePath.replace(folder, "");

                if (relativePath === "") continue;

                const reader = new FileReader();

                reader.readAsText(file);

                reader.onload = (e) => {
                    fs.writeFile(path.join(PluginsPath, folder, relativePath), e.target.result);
                };
            }
        });

        el.click();
    },
    get: (name) => Registry.plugins.find((plugin) => plugin.name === name),
    getAll: () => Registry.plugins,
    isEnabled: (name) => enabledPlugins.includes(name),
    getEnabled: () => Registry.plugins.filter((plugin) => Plugins.isEnabled(plugin.name)),
    enable: (name) => {
        const plugin = Registry.plugins.find((plugin) => plugin.name === name);

        if (!plugin) return;

        try {
            if (!enabledPlugins.includes(plugin.name)) {
                enabledPlugins.insertNew(plugin.name);
            }

            plugin.instance.onStart();
            showToast(`Enabled ${plugin.name}`, { type: "success" });
        } catch (err) {
            Logger.error(`Error enabling plugin '${plugin.name}'.`, err);
            showToast(`Error enabling ${plugin.name}`, { type: "error" });
        }

        return true;
    },
    disable: (name, silent) => {
        const plugin = Registry.plugins.find((plugin) => plugin.name === name);

        if (!plugin) return;

        try {
            enabledPlugins.activeFilter((plugin) => plugin !== name);

            plugin.instance.onStop();
            if (!silent) showToast(`Disabled ${plugin.name}`, { type: "success" });
        } catch (err) {
            Logger.error(`Error disabling plugin '${plugin.name}'.`, err);
            showToast(`Error disabling ${plugin.name}`, { type: "error" });
        }

        return true;
    },
    unlink: (name) => {
        const plugin = Registry.plugins.find((plugin) => plugin.name === name);

        if (!plugin) return;

        try {
            Plugins.disable(name, true);
            Registry.plugins.activeFilter((plugin) => plugin.name !== name);

            showToast(`Unlinked ${plugin.name}`, { type: "success" });
        } catch (err) {
            Logger.error(`Error unlinking plugin '${plugin.name}'.`, err);
            showToast(`Error unlinking ${plugin.name}`, { type: "error" });
        }

        return true;
    },
    delete: (name) => {
        const plugin = Registry.plugins.find((plugin) => plugin.name === name);

        if (!plugin) return;

        try {
            Plugins.unlink(name);
            fs.rm(plugin.filePath, { recursive: true });

            showToast(`Deleted ${plugin.name}`, { type: "error" });
        } catch (err) {
            Logger.error(`Error deleting plugin '${plugin.name}'.`, err);
            showToast(`Error deleting ${plugin.name}`, { type: "error" });
        }

        return true;
    },
    toggle: (name) => {
        if (Plugins.isEnabled(name)) {
            Plugins.disable(name);
        } else {
            Plugins.enable(name);
        }
    },
    reload() {
        Registry.plugins.length = 0;
        Velocity.AddonManager.Registry.plugins.length = 0;

        initPlugins();
    },
};

export const initThemes = () => {
    validateDirs();

    showToast("Reading Theme Files", { type: "velocity" });

    fs.readdir(ThemesPath, (files) => {
        const folders = Object.keys(files).filter((file) => typeof files[file] === "object");

        folders.forEach((folder) => {
            if (!fs.exists(path.join(ThemesPath, folder, "velocity_manifest.json"))) return Logger.error(`Theme ${folder} does not have a manifest file!`);

            try {
                const _manifest = JSON.parse(fs.readFile(path.join(ThemesPath, folder, "velocity_manifest.json"), "utf8"));

                let manifest = {
                    name: _manifest.name,
                    description: _manifest.description,
                    version: _manifest.version,
                    author: _manifest.author,
                    license: _manifest.license,
                    filePath: path.join(ThemesPath, folder),
                    social: {
                        invite: _manifest.social?.invite,
                        website: _manifest.social?.website,
                        github: _manifest.social?.github,
                        donate: _manifest.social?.donate,
                    },
                    main: _manifest.main,
                    updates: _manifest.updates,
                    _type: "Themes",
                };

                const _main = fs.readFile(path.join(ThemesPath, folder, manifest.main), "utf8");

                manifest.code = _main;

                const variables = ColorUtils.getRootVariables(_main);

                if (variables.length) {
                    manifest.instance = {
                        renderSettings() {
                            return variables.map((variable) => {
                                const { name, value } = variable;

                                if (value.trim().startsWith("#")) {
                                    try {
                                        return {
                                            default: Number(ColorUtils.formatHex(value.trim()).replace("#", "0x")),
                                            id: name.replace("--", "").trim(),
                                            name: NameUtils.formatName(name.replace("--", "").trim()),
                                            note: `#${value.trim().replace("#", "")}`,
                                            type: "color",
                                            action: (value) => {
                                                const hex = ColorUtils.formatHex(`#${value.toString(16)}`);

                                                document.body.style.setProperty(name, hex);
                                            },
                                        };
                                    } catch (err) {
                                        return null;
                                    }
                                }

                                return null;
                            });
                        },
                        settings: Stream(manifest.name),
                    };
                }

                Registry.themes.insertNew(manifest);

                showToast(`Loaded ${manifest.name}`);

                if (Themes.isEnabled(manifest.name)) {
                    Themes.disable(manifest.name, true);
                    Themes.enable(manifest.name);
                }
            } catch (e) {
                Logger.error(`Error loading ${folder}`, e);
                showToast(`Error loading ${folder}`, { type: "error" });
            }
        });
    });
};

export const Themes = {
    get dir() {
        return ThemesPath;
    },
    add: () => {
        const el = document.createElement("input");
        el.setAttribute("type", "file");
        el.setAttribute("webkitdirectory", "true");
        el.setAttribute("directory", "true");

        el.addEventListener("change", (e) => {
            const { files } = e.target;

            if (files.length === 0) return;

            const folder = files[0].webkitRelativePath.split("/")[0];

            for (const file of files) {
                const relativePath = file.webkitRelativePath.replace(folder, "");

                if (relativePath === "") continue;

                const reader = new FileReader();

                reader.readAsText(file);

                reader.onload = (e) => {
                    fs.writeFile(path.join(ThemesPath, folder, relativePath), e.target.result);
                };
            }
        });

        el.click();
    },
    get: (name) => Registry.themes.find((theme) => theme.name === name),
    getAll: () => Registry.themes,
    isEnabled: (name) => enabledThemes.includes(name),
    getEnabled: () => Registry.themes.filter((theme) => Themes.isEnabled(theme.name)),
    enable: (name) => {
        const theme = Registry.themes.find((theme) => theme.name === name);

        if (!theme) return;

        try {
            if (!enabledThemes.includes(theme.name)) {
                enabledThemes.insertNew(theme.name);
            }

            const ele = document.createElement("style");
            ele.id = `velocity-theme-${formatId(theme.name)}`;
            ele.innerHTML = theme.code;
            themes.appendChild(ele);

            if (theme.instance && theme.instance.settings) {
                for (const [name, value] of Object.entries(getAllData(theme.name))) {
                    const hex = ColorUtils.formatHex(`#${value.toString(16)}`);

                    document.body.style.setProperty(`--${name}`, hex);
                }
            }

            showToast(`Enabled ${theme.name}`, { type: "success" });
        } catch (err) {
            Logger.error(`Error enabling theme '${theme.name}'.`, err);
            showToast(`Error enabling ${theme.name}`, { type: "error" });
        }

        return true;
    },
    disable: (name, silent) => {
        const theme = Registry.themes.find((theme) => theme.name === name);

        if (!theme) return;

        try {
            enabledThemes.activeFilter((theme) => theme !== name);

            const ele = document.getElementById(`velocity-theme-${formatId(theme.name)}`);
            if (ele) ele.remove();

            if (theme.instance && theme.instance.settings) {
                for (let [name, value] of Object.entries(getAllData(theme.name))) {
                    document.body.style.removeProperty(`--${name}`);
                }
            }

            if (!silent) showToast(`Disabled ${theme.name}`, { type: "success" });
        } catch (err) {
            Logger.error(`Error disabling theme '${theme.name}'.`, err);
            showToast(`Error disabling ${theme.name}`, { type: "error" });
        }

        return true;
    },
    unlink: (name) => {
        const theme = Registry.themes.find((theme) => theme.name === name);

        if (!theme) return;

        try {
            Themes.disable(name, true);

            Registry.themes.activeFilter((theme) => theme.name !== name);

            showToast(`Unlinked ${theme.name}`, { type: "success" });
        } catch (err) {
            Logger.error(`Error unlinking theme '${theme.name}'.`, err);
            showToast(`Error unlinking ${theme.name}`, { type: "error" });
        }

        return true;
    },
    delete: (name) => {
        const theme = Registry.themes.find((theme) => theme.name === name);

        if (!theme) return;

        try {
            Themes.unlink(name);
            fs.rm(theme.filePath, { recursive: true });

            showToast(`Deleted ${theme.name}`, { type: "error" });
        } catch (err) {
            Logger.error(`Error deleting theme '${theme.name}'.`, err);
            showToast(`Error deleting ${theme.name}`, { type: "error" });
        }

        return true;
    },
    toggle: (name) => {
        if (Themes.isEnabled(name)) {
            Themes.disable(name);
        } else {
            Themes.enable(name);
        }
    },
    reload() {
        Registry.themes.length = 0;
        Velocity.AddonManager.Registry.themes.length = 0;

        initThemes();
    },
};
