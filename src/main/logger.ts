import {appendFile, mkdir} from "node:fs/promises";
import {join} from "node:path";
import {app} from "electron";

type LogLevel = "INFO" | "WARN" | "ERROR";

const getLogPath = (): string =>
  join(app.getPath("userData"), "logs", "motioner.log");

export const writeAppLog = async (
  level: LogLevel,
  scope: string,
  message: string,
  detail?: string,
): Promise<void> => {
  try {
    const path = getLogPath();
    await mkdir(join(app.getPath("userData"), "logs"), {recursive: true});
    const suffix = detail ? `\n${detail}` : "";
    await appendFile(
      path,
      `[${new Date().toISOString()}] [${level}] [${scope}] ${message}${suffix}\n`,
      "utf8",
    );
  } catch (error) {
    console.error("写入 Motioner 日志失败", error);
  }
};
