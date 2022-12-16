import { initialiseNotifications, initialiseToasts } from "./modules/notifications";
import { initPlugins, initThemes } from "./modules/addons";
import { initialiseSettings } from "./ui/settings";
import { waitUntil } from "./util/time";
import webpack from "./modules/webpack";
import logger from "./util/logger";

import Velocity from "./modules/velocity";
import VelocityWeb from "./modules/web";

const Logger = new logger("Injector");

export default async () => {
    const start = Date.now();

    Logger.log("Initialising...");

    await webpack.globalPromise;

    window.Velocity = Velocity;
    window.VelocityWeb = VelocityWeb;

    Object.freeze(window.Velocity);
    Object.freeze(window.VelocityWeb);

    Logger.log(`API Added in ${Date.now() - start}ms`);

    initialiseSettings();
    Logger.log(`Settings Added`);

    // wait for React to be loaded
    await waitUntil(() => webpack.common.React);

    Logger.log(`React Loaded`);

    initialiseToasts();
    initialiseNotifications();

    webpack.remapDefaults();

    initPlugins();
    initThemes();

    Logger.log(`Plugins & Themes Initialised`);
};
