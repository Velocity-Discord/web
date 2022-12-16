import { showNotification, showToast, showConfirmationModal } from "./notifications";
import { installAddon } from "./actions";
import { waitUntil } from "../util/time";
import * as DataStore from "./datastore";
import * as Styling from "./styling";
import * as addons from "./addons";
import webpack from "../modules/webpack";
import logger from "../util/logger";
import Plugin from "./pluginapi";
import patcher from "./patcher";

webpack.globalPromise.then(async () => {
    window.React = await webpack.waitFor(["createElement", "useEffect"]);
    window.ReactDOM = await webpack.waitFor(["render", "hydrate"]);
});

export default {
    Logger: logger,
    WebpackModules: webpack,
    Patcher: patcher,
    Utilities: {
        waitUntil,
    },
    AddonManager: {
        ...addons,
        installAddon,
    },
    Notifications: {
        showNotification,
        showToast,
        showConfirmationModal,
    },
    Plugin,
    Styling,
    DataStore,
};
