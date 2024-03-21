import DiscordImplementation from "./impls/discord.js";
import dotenv from "dotenv";
import fs from "fs/promises";

async function main() {
  dotenv.config();
  const token = process.env.token;
  const channelId = process.env.channelId;
  if (!token || !channelId) throw new Error("env token/channelId");
  const d = new DiscordImplementation(token, channelId);
  await d.ready();
  d.encryptionKey = process.env.enckey;

  const syntax = `${process.argv[0]} ${process.argv[1]} <f/s> <path-to>`;

  const operation = process.argv[2];
  if (!operation) throw new Error(syntax);

  const path = process.argv[3];
  if (!path) throw new Error(syntax);

  const db_files = process.env.db_files ?? "db/files.txt";
  const tableFiles: Map<string, string[]> = new Map();

  const fFiles = Bun.file(db_files);
  const entries = (await fFiles.text()).split("\n");
  for (const rentry of entries) {
    const entry = rentry;

    if (!entry) continue;

    const { path, keys } = JSON.parse(entry);
    tableFiles.set(path, keys);
  }

  if (operation === "f") {
    const filesToFetch = [...tableFiles.keys()].filter(x => x.startsWith(path));

    for (const path of filesToFetch) {
      if (Bun.file(path).exists())
        continue;
      process.stdout.write(`./${path}   `);
      const dir = path.split("/").slice(0, -1).join("/");
      await fs.mkdir(dir, { recursive: true });
      const data = await d.fetch(tableFiles.get(path), () => process.stdout.write("."));
      process.stdout.write("\n");
      await fs.writeFile(path, data);

    }
  } else if (operation === "s") {
    const files = await fs.readdir(path, { recursive: true });
    for (const file of files) {
      const p = path + "/" + file;
      if (tableFiles.has(p))
        continue;

      const data = await Bun.file(p).text();
      process.stdout.write(`./${p}   `); 
      const keys = await d.store(Buffer.from(data), () => process.stdout.write("."));
      tableFiles.set(p, keys);
      process.stdout.write("\n");
      const s = JSON.stringify({ path: p, keys });
      await fs.appendFile(db_files, "\n"+s);
    }
  }
  process.exit(0);
}

main();
