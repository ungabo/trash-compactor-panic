import Client from "ssh2-sftp-client";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const setupOnly = process.argv.includes("--setup-only");
const localDist = path.resolve("dist");
const desktopInfoPath =
  process.env.SFTP_INFO_FILE ??
  path.join(process.env.USERPROFILE ?? "", "Desktop", "sitesindevelopment-sftp-info.txt");

function parseInfo(contents) {
  const values = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      values[match[1].trim().toLowerCase()] = match[2].trim();
    }
  }

  return {
    host: values.host,
    port: Number(values.port ?? 22),
    username: values.username,
    password: values.password,
    baseRemoteFolder: values["remote folder"],
  };
}

async function uploadDirectory(client, localDir, remoteDir) {
  await client.mkdir(remoteDir, true);
  const entries = await readdir(localDir);

  for (const entry of entries) {
    const localPath = path.join(localDir, entry);
    const remotePath = `${remoteDir}/${entry}`;
    const entryStat = await stat(localPath);

    if (entryStat.isDirectory()) {
      await uploadDirectory(client, localPath, remotePath);
    } else {
      await client.fastPut(localPath, remotePath);
    }
  }
}

if (!existsSync(desktopInfoPath)) {
  throw new Error(`SFTP info file not found at ${desktopInfoPath}`);
}

if (!setupOnly && !existsSync(localDist)) {
  throw new Error("dist/ does not exist. Run npm run build before npm run deploy.");
}

const info = parseInfo(await readFile(desktopInfoPath, "utf8"));
const missing = Object.entries(info)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  throw new Error(`SFTP info is missing: ${missing.join(", ")}`);
}

const remoteFolder = `${info.baseRemoteFolder}/games/Trash Compactor`;
const client = new Client();

try {
  await client.connect({
    host: info.host,
    port: info.port,
    username: info.username,
    password: info.password,
  });

  await client.mkdir(remoteFolder, true);
  if (setupOnly) {
    console.log(`Remote folder ready: ${remoteFolder}`);
  } else {
    await uploadDirectory(client, localDist, remoteFolder);
    console.log(`Uploaded dist/ to ${remoteFolder}`);
  }
} finally {
  await client.end();
}

await mkdir(path.resolve("output"), { recursive: true });

