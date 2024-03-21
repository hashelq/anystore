import crypto from "crypto";
import { Semaphore } from "async-mutex";

export type ChunkData = Buffer;

const encrypt = (text: Buffer, algo: string, key: string) => {
  const cipher = crypto.createCipher(algo, key);

  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

  return encrypted;
};

const decrypt = (buf: Buffer, algo: string, key: string) => {
  const decipher = crypto.createDecipher(algo, key);

  const decrpyted = Buffer.concat([decipher.update(buf), decipher.final()]);

  return decrpyted;
};

export default abstract class AnyStorage<ChunkKey> {
  /*
   * Concurrent connections amount.
   */
  public connections: number = 8;

  /*
   * Chunk size.
   */
  public chunkSize: number = 4096;

  /*
   * Encryption key if required.
   */
  public encryptionKey?: string = null;

  /*
   * Encryption algorithm if required.
   */
  public encryptionAlgorithm?: string = "aes-256-cbc";

  /*
   * Make sure we are ready run / connect / init.
   */
  abstract ready(): Promise<void>;

  /*
   * Store a `this.chunkSize` chunk of data.
   */
  abstract storeChunk(chunk: ChunkData): Promise<ChunkKey>;

  /*
   * Fetch a `this.chunkSize` chunk of data.
   */
  abstract fetchChunk(key: ChunkKey): Promise<ChunkData>;

  /*
   * Store whole data in chunks and get keys.
   */
  public async store(
    data: Buffer,
    reportStatus?: (chunksDone: number, chunksTotal: number) => void,
  ): Promise<ChunkKey[]> {
    if (this.encryptionKey && this.encryptionAlgorithm)
      data = encrypt(data, this.encryptionAlgorithm, this.encryptionKey);

    let parts = [];
    for (let i = 0; i <= data.length; i += this.chunkSize) {
      parts.push(data.subarray(i, i + this.chunkSize));
    }

    let keys = new Array();
    const sema = new Semaphore(this.connections);
    const promises = [];
    for (let i = 0; i < parts.length; i++) {
      promises.push(
        sema.runExclusive(async () => {
          keys.push(await this.storeChunk(parts[i]));
          if (reportStatus) reportStatus(i, parts.length);
        }),
      );
    }
    await Promise.all(promises);

    return keys;
  }

  /*
   * Fetch whole data with keys.
   */
  public async fetch(
    keys: ChunkKey[],
    reportStatus?: (chunksDone: number) => void,
  ): Promise<Uint8Array> {
    let data = Buffer.from([]);
    const sema = new Semaphore(this.connections);
    const promises = [];
    for (let i = 0; i < keys.length; i++) {
      promises.push(
        sema.runExclusive(async () => {
          data = Buffer.from([...data, ...(await this.fetchChunk(keys[i]))]);
          if (reportStatus) reportStatus(i);
        }),
      );
    }
    await Promise.all(promises);

    if (this.encryptionKey && this.encryptionAlgorithm)
      data = decrypt(data, this.encryptionAlgorithm, this.encryptionKey);

    return data;
  }
}
