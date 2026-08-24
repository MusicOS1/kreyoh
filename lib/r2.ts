import "server-only";

import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

function readR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Cloudflare R2 is not configured. Add all four R2 server variables.");
  }

  if (
    !/^[0-9a-f]{32}$/i.test(accountId) ||
    !/^[0-9a-f]{32}$/i.test(accessKeyId) ||
    !/^[0-9a-f]{64}$/i.test(secretAccessKey)
  ) {
    throw new Error(
      "The R2 variables are in the wrong fields. Account ID and Access Key ID are 32-character values; Secret Access Key is the 64-character value. Do not use the S3 endpoint URL as a key.",
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function createR2Client(config: R2Config) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET_NAME?.trim(),
  );
}

export function r2PublicUrl(key: string) {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  return base ? `${base}/${key.split("/").map(encodeURIComponent).join("/")}` : null;
}

export async function assertR2BucketAccess() {
  const config = readR2Config();
  try {
    await createR2Client(config).send(new HeadBucketCommand({ Bucket: config.bucket }));
  } catch (cause) {
    const code = cause && typeof cause === "object" && "name" in cause ? String(cause.name) : "";
    if (code === "NoSuchBucket" || code === "NotFound") {
      throw new Error("The configured Cloudflare R2 bucket does not exist. Check R2_BUCKET_NAME.");
    }
    throw new Error(
      "Cloudflare rejected the R2 credentials. Use the R2 S3 Access Key ID and Secret Access Key from Manage R2 API Tokens, then restart or redeploy the app.",
    );
  }
}

export async function createR2PresignedUrl(
  method: "GET" | "PUT",
  key: string,
  expires = 900,
  contentType?: string,
) {
  const config = readR2Config();
  const client = createR2Client(config);
  const command =
    method === "PUT"
      ? new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          ContentType: contentType || "application/octet-stream",
        })
      : new GetObjectCommand({ Bucket: config.bucket, Key: key });

  return getSignedUrl(client, command, { expiresIn: expires });
}
