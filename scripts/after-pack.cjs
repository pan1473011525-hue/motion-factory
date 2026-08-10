const {execFile} = require("node:child_process");
const {promisify} = require("node:util");
const {join} = require("node:path");

const run = promisify(execFile);

module.exports = async (context) => {
  if (context.electronPlatformName !== "darwin") return;
  const infoPlist = join(context.appOutDir, "Motioner.app", "Contents", "Info.plist");
  await run("/usr/libexec/PlistBuddy", [
    "-c",
    "Set :NSAppTransportSecurity:NSAllowsArbitraryLoads false",
    infoPlist,
  ]);
};
