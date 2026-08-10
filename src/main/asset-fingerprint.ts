import {createHash} from "node:crypto";
import {createReadStream} from "node:fs";

export const fingerprintFile = async (path: string): Promise<string> => new Promise((resolve, reject) => {
  const hash = createHash("sha256");
  const stream = createReadStream(path);
  stream.on("data", (chunk) => hash.update(chunk));
  stream.on("error", reject);
  stream.on("end", () => resolve(`sha256:${hash.digest("hex")}`));
});
