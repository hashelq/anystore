import { Stream } from "stream";
import AnyStorage, { ChunkData } from "../abstract.js";
import {
  Channel,
  Client,
  GatewayIntentBits,
  MessagePayload,
  RawFile,
  TextChannel,
} from "discord.js";

// message id
export type DiscordKey = string;

export default class DiscordImplementation extends AnyStorage<DiscordKey> {
  public connections: number = 2;
  public chunkSize: number = 1024 * 1024 * 8;
  public client: Client;
  public channelId: string;
  public token: string;
  public channel: TextChannel;

  constructor(token: string, channelId: string) {
    super();
    this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
    this.token = token;
    this.channelId = channelId;
  }

  public async ready(): Promise<void> {
    await this.client.login(this.token);
    const channel = await this.client.channels.fetch(this.channelId);
    if (!(channel instanceof TextChannel))
      throw new Error("Specified channel is not a TextChannel");
    this.channel = channel;
  }

  public async storeChunk(chunk: ChunkData): Promise<DiscordKey> {
    const msg = await this.channel.send({
      files: [{ attachment: chunk, name: "_.txt" }],
    });
    const k = msg.attachments.keys().next().value;
    const attachment = msg.attachments.get(k);
    return attachment.url;
  }

  public async fetchChunk(key: DiscordKey): Promise<ChunkData> {
    const d = await fetch(key).then((x) => x.blob());
    const data = Buffer.from(await d.arrayBuffer());

    return data;
  }
}
