import inquirer from "inquirer";
import chalk from "chalk";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const outDir = path.resolve(__dirname, "../packages/out");

const config = {
    buildFor: process.argv[2],
    watch: process.argv.includes("-w"),
};

if (process.argv[2] !== "firefox" && process.argv[2] !== "chrome" && process.argv[2] !== "all") {
    const answer = await inquirer.prompt({
        name: "buildFor",
        message: "Which browser would you like to build for?",
        type: "list",
        choices: [
            {
                name: chalk.redBright("Firefox"),
                value: "firefox",
            },
            {
                name: chalk.yellowBright("Chrome"),
                value: "chrome",
            },
            {
                name: "Both",
                value: "all",
            },
        ],
    });

    console.log("");

    config.buildFor = answer.buildFor;
}

const build = () => {
    const v2Manifest = {
        name: "Velocity",
        version: "1.0.0",
        manifest_version: 2,

        content_scripts: [
            {
                matches: ["https://*.discord.com/app", "https://*.discord.com/channels/*"],
                js: ["inject.js"],
            },
        ],

        permissions: ["webRequest", "webRequestBlocking", "https://discord.com/*"],

        background: {
            scripts: ["background.js"],
        },
    };

    if (config.buildFor === "firefox" || config.buildFor === "all") {
        if (!fs.existsSync(path.join(outDir, "firefox"))) fs.mkdirSync(path.join(outDir, "firefox"));

        const injectScript = fs.readFileSync(path.join(outDir, "index.js"), { encoding: "utf-8" });

        fs.writeFileSync(path.join(outDir, "firefox", "manifest.json"), JSON.stringify(v2Manifest));
        fs.writeFileSync(
            path.join(outDir, "firefox", "inject.js"),
            `const script = document.createElement("script");
const ij = \`${injectScript.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\${/g, "\\${").replace(/\\n/g, "")}\`;
script.textContent = ij + "injectVelocity()";
document.body.appendChild(script);`
        );
        fs.writeFileSync(
            path.join(outDir, "firefox", "background.js"),
            `browser.webRequest.onHeadersReceived.addListener(
  ({ responseHeaders }) => {
    responseHeaders = responseHeaders.filter((header) => header.name !== "content-security-policy");

    return { responseHeaders };
  },

  { urls: ["*://*.discord.com/*", "*://discord.com/*"] },
  ["blocking", "responseHeaders"]
);`
        );
    }

    if (config.buildFor === "chrome" || config.buildFor === "all") {
        // mv3 bad
    }
};

console.log("--------------------------------------------------------------------------------");
console.log(chalk.blueBright(`Building for ${chalk.bold(config.buildFor)}... `));

await build();

console.log("Done!");
console.log("--------------------------------------------------------------------------------");

if (config.watch) {
    let timeout;

    fs.watch(path.join(outDir, "index.js"), async (_, filename) => {
        if (timeout) return;
        timeout = setTimeout(() => {
            timeout = null;
        }, 200);

        console.log("--------------------------------------------------------------------------------");
        console.log(chalk.blueBright(`Change detected in out/${filename}, Re-Packaging for ${chalk.bold(config.buildFor)}...`));

        try {
            await build();
            console.log("Done!");
        } catch {
            console.log(chalk.redBright(`Error Packaging for ${chalk.bold(config.buildFor)}`));
        }

        console.log("--------------------------------------------------------------------------------");
    });
}
