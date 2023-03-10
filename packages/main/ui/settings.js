import ButtonContainer from "./components/reworks/ButtonContainer";
import ColorPicker from "./components/settings/ColorPicker";
import AddonHeader from "./components/settings/AddonHeader";
import AddonCard from "./components/settings/AddonCard";
import SettingPage from "./components/settings/Page";
import Section from "./components/settings/Section";
import Editor from "./components/settings/Editor";
import Switch from "./components/settings/Switch";
import Slider from "./components/settings/Slider";
import EmptyState from "./components/EmptyState";

import Velocity from "../modules/velocity";
import ColorUtils from "../util/color";
import logger from "../util/logger";

import { showNotification, showToast } from "../modules/notifications";
import { updateVariable } from "../modules/variables";
import { Stream } from "../modules/datastore";
import { Registry } from "../modules/addons";
import { useFilter } from "../util/hooks";

const Logger = new logger("Settings");

export const initialiseSettings = async () => {
    const { WebpackModules, Utilities } = Velocity;

    const Patcher = new Velocity.Patcher("VelocityInternal_Settings");

    const UserSettings = await WebpackModules.waitFor((m) => m.default?.prototype?.getPredicateSections);
    const TabBar = (await WebpackModules.waitFor((m) => m.default?.prototype?.render?.toString().includes("this.tabBar"))).default;

    Patcher.after(UserSettings.default.prototype, "getPredicateSections", (_, returnValue) => {
        let location = returnValue.findIndex((s) => s.section.toLowerCase() == "discord nitro") - 2;
        if (location < 0) return;
        const insert = (section) => {
            returnValue.splice(location, 0, section);
            location++;
        };

        const { Components, Classes, Actions } = WebpackModules.common;

        const FormDivider = Components.FormDivider;
        const ButtonModules = Components.ButtonModules;
        const FormText = Components.FormText.default;
        const ModalActions = Actions.ModalActions;

        insert({ section: "DIVIDER" });
        insert({ section: "HEADER", label: "Velocity" });
        // Settings
        insert({
            section: "settings",
            label: "Settings",
            className: `velocity-settings-tab`,
            element: () => [
                <SettingPage title="Settings">
                    <Section title="General">
                        <Switch name="Stop DevTools Warnings" note="Stops Discord from showing warnings when you open devtools." setting="StopWarnings" />
                    </Section>
                    <Section title="Notifications">
                        <ButtonContainer>
                            <ButtonModules.default
                                onClick={() => {
                                    const close = showNotification({
                                        title: "Notification",
                                        content: "This is a test notification",
                                        buttons: [
                                            {
                                                label: "Button",
                                                action: () => {
                                                    showToast("Toast");
                                                },
                                            },
                                            {
                                                label: "Dangerous Button",
                                                color: "RED",
                                                action: () => {
                                                    close();
                                                },
                                            },
                                        ],
                                    });
                                }}
                                style={{ marginBlock: "10px" }}
                            >
                                Open Preview Notification
                            </ButtonModules.default>
                        </ButtonContainer>
                        <ColorPicker
                            defaultColor={Number(ColorUtils.getVariable("background-floating", "hex").replace("#", "0x")) || 0x18191c}
                            name="Background Color"
                            note="The background color of notifications"
                            setting="NotificationBackground"
                            action={(value) => {
                                const NotifBackgroundHSl = ColorUtils.hexToHSL(ColorUtils.intToHex(value));

                                updateVariable(
                                    "--velocity-notification-background",
                                    `hsla(${NotifBackgroundHSl[0]}, ${NotifBackgroundHSl[1]}%, ${NotifBackgroundHSl[2]}%, var(--velocity-notification-transparency,  100%))`
                                );
                            }}
                        />
                        <Slider
                            name="Background Opacity"
                            note="The opacity of the notification background"
                            setting="NotificationTransparency"
                            action={(value) => {
                                updateVariable("--velocity-notification-transparency", `${value}%`);
                            }}
                            units="%"
                        />
                        <Slider
                            name="Background Blur"
                            note="The blur of the notification background"
                            setting="NotificationBlur"
                            action={(value) => {
                                updateVariable("--velocity-notification-blur", `${Math.round(value)}px`);
                            }}
                            maxValue={20}
                            units="px"
                        />
                    </Section>
                </SettingPage>,
            ],
        });

        // Plugins
        insert({
            section: "plugins",
            label: "Plugins",
            className: `velocity-plugins-tab`,
            element: () => {
                const [plugins, setPlugins] = React.useState(Registry.plugins);
                const [search, setSearch] = React.useState("");
                const [rerender, setRerender] = React.useState(false);

                React.useEffect(() => {
                    const l = (val) => {
                        setPlugins(val);
                        setRerender(!rerender);
                    };

                    Registry.plugins.addListener(l);

                    return () => {
                        Registry.plugins._removeListener(l);
                    };
                });

                return [
                    <SettingPage title="Plugins">
                        <AddonHeader type="plugins" onSearch={setSearch} />
                        {useFilter(plugins, search).length ? (
                            useFilter(plugins, search).map((plugin) => {
                                return <AddonCard {...plugin} />;
                            })
                        ) : (
                            <EmptyState artURL="/assets/b669713872b43ca42333264abf9c858e.svg" header="Couldn't find any plugins" description="Make sure they're installed and your search is correct" />
                        )}
                    </SettingPage>,
                ];
            },
        });

        // Themes
        insert({
            section: "themes",
            label: "Themes",
            className: `velocity-themes-tab`,
            element: () => {
                const [themes, setThemes] = React.useState(Registry.themes);
                const [search, setSearch] = React.useState("");
                const [rerender, setRerender] = React.useState(false);

                React.useEffect(() => {
                    const l = (val) => {
                        setThemes(val);
                        setRerender(!rerender);
                    };

                    Registry.themes.addListener(l);

                    return () => {
                        Registry.themes._removeListener(l);
                    };
                });

                return [
                    <SettingPage title="Themes">
                        <AddonHeader type="themes" onSearch={setSearch} />
                        {useFilter(themes, search).length ? (
                            useFilter(themes, search).map((theme) => {
                                return <AddonCard {...theme} />;
                            })
                        ) : (
                            <EmptyState artURL="/assets/b669713872b43ca42333264abf9c858e.svg" header="Couldn't find any themes" description="Make sure they're installed and your search is correct" />
                        )}
                    </SettingPage>,
                ];
            },
        });

        // Snippets
        insert({
            section: "snippets",
            label: "Snippets",
            className: `velocity-snippets-tab`,
            element: () => {
                return (
                    <SettingPage title="Snippets">
                        <Editor />
                    </SettingPage>
                );
            },
        });
    });
};
