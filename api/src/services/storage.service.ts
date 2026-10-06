import { promises as fs } from 'fs';
import path from 'path';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Where photo files live. The database only ever holds their URL
// (`/media/<key>`, served by routes/media.routes.ts); the bytes are in an
// S3-compatible bucket in production. Without S3_* variables the files go to
// a local folder (development, e2e) or stay in memory (tests), so neither
// needs the real bucket.
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  // null when there is no such file.
  get(key: string): Promise<Buffer | null>;
  remove(keys: string[]): Promise<void>;
  removePrefix(prefix: string): Promise<void>;
}

export const MEDIA_PREFIX = '/media/';

// Every stored file is a WebP under its shop's folder.
export const MEDIA_KEY_PATTERN = /^shops\/[a-z0-9]+\/[a-z0-9-]+\.webp$/;

export const mediaUrl = (key: string) => `${MEDIA_PREFIX}${key}`;

export const mediaKey = (url: string | null | undefined): string | null =>
  url && url.startsWith(MEDIA_PREFIX) ? url.slice(MEDIA_PREFIX.length) : null;

export const shopPrefix = (shopId: string) => `shops/${shopId}/`;

const s3Storage = (config: NonNullable<typeof env.storage>): Storage => {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const Bucket = config.bucket;

  const remove = async (keys: string[]) => {
    for (let i = 0; i < keys.length; i += 1000) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket,
          Delete: {
            Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
      );
    }
  };

  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
    async get(key) {
      try {
        const out = await client.send(
          new GetObjectCommand({ Bucket, Key: key }),
        );
        if (!out.Body) return null;
        return Buffer.from(await out.Body.transformToByteArray());
      } catch (err) {
        const name = (err as { name?: string }).name;
        if (name === 'NoSuchKey' || name === 'NotFound') return null;
        throw err;
      }
    },
    remove,
    async removePrefix(prefix) {
      let token: string | undefined;
      do {
        const page = await client.send(
          new ListObjectsV2Command({
            Bucket,
            Prefix: prefix,
            ContinuationToken: token,
          }),
        );
        const keys = (page.Contents ?? []).flatMap((o) =>
          o.Key ? [o.Key] : [],
        );
        if (keys.length > 0) await remove(keys);
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
    },
  };
};

const diskStorage = (root: string): Storage => {
  const file = (key: string) => path.join(root, key);
  return {
    async put(key, body) {
      await fs.mkdir(path.dirname(file(key)), { recursive: true });
      await fs.writeFile(file(key), body);
    },
    async get(key) {
      try {
        return await fs.readFile(file(key));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw err;
      }
    },
    async remove(keys) {
      await Promise.all(keys.map((key) => fs.rm(file(key), { force: true })));
    },
    async removePrefix(prefix) {
      await fs.rm(file(prefix), { recursive: true, force: true });
    },
  };
};

// The files held by the in-memory storage, exposed so tests can look at them.
export const memoryFiles = new Map<string, Buffer>();

const memoryStorage = (): Storage => ({
  async put(key, body) {
    memoryFiles.set(key, body);
  },
  async get(key) {
    return memoryFiles.get(key) ?? null;
  },
  async remove(keys) {
    for (const key of keys) memoryFiles.delete(key);
  },
  async removePrefix(prefix) {
    for (const key of [...memoryFiles.keys()]) {
      if (key.startsWith(prefix)) memoryFiles.delete(key);
    }
  },
});

const pickStorage = (): Storage => {
  if (env.storage) return s3Storage(env.storage);
  if (env.nodeEnv === 'test') return memoryStorage();
  return diskStorage(
    process.env.UPLOADS_DIR || path.join(process.cwd(), '.uploads'),
  );
};

export const storage: Storage = pickStorage();

// Deleting a file that is no longer referenced must never fail the request
// that replaced it: the worst case is an orphan in the bucket.
export const removeStoredFiles = async (
  urls: (string | null | undefined)[],
) => {
  const keys = urls.flatMap((url) => {
    const key = mediaKey(url);
    return key ? [key] : [];
  });
  if (keys.length === 0) return;
  try {
    await storage.remove(keys);
  } catch (err) {
    logger.error({ err, keys }, 'Could not delete stored files');
  }
};

export const removeShopFiles = async (shopId: string) => {
  try {
    await storage.removePrefix(shopPrefix(shopId));
  } catch (err) {
    logger.error({ err, shopId }, 'Could not delete the shop’s stored files');
  }
};
