import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i += 1) {
    let current = i;
    for (let bit = 0; bit < 8; bit += 1) {
      current =
        (current & 1) === 1
          ? (0xedb88320 ^ (current >>> 1))
          : (current >>> 1);
    }
    table[i] = current >>> 0;
  }

  return table;
})();

function parseDotEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  } else {
    const commentIndex = value.indexOf("#");
    if (commentIndex >= 0) {
      value = value.slice(0, commentIndex).trim();
    }
  }

  if (!key) {
    return null;
  }

  return { key, value };
}

function readDotEnvFile(envFilePath) {
  if (!fs.existsSync(envFilePath)) {
    return new Map();
  }

  const raw = fs.readFileSync(envFilePath, "utf8");
  const result = new Map();

  raw.split(/\r?\n/).forEach((line) => {
    const parsed = parseDotEnvLine(line);
    if (!parsed) {
      return;
    }
    result.set(parsed.key, parsed.value);
  });

  return result;
}

function toDosDateTime(date) {
  const localDate = new Date(date.getTime());
  const year = Math.max(1980, localDate.getFullYear());
  const month = localDate.getMonth() + 1;
  const day = localDate.getDate();
  const hours = localDate.getHours();
  const minutes = localDate.getMinutes();
  const seconds = Math.floor(localDate.getSeconds() / 2);

  const dosTime = ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | (seconds & 0x1f);
  const dosDate = (((year - 1980) & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f);

  return { dosDate, dosTime };
}

export function parseCliArgs(argv = process.argv) {
  const args = {};

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const nextToken = argv[i + 1];
    if (!nextToken || nextToken.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = nextToken;
    i += 1;
  }

  return args;
}

export function getArgAsString(args, key) {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

export function getDatabaseUrl(args) {
  const fromArgs = getArgAsString(args, "database-url");
  if (fromArgs) {
    return fromArgs;
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const fromDotEnv = readDotEnvFile(path.resolve(process.cwd(), ".env")).get(
    "DATABASE_URL",
  );
  if (fromDotEnv) {
    return fromDotEnv;
  }

  throw new Error("DATABASE_URL is not set. Provide --database-url or set DATABASE_URL.");
}

export function resolveSqliteFilePath(databaseUrl) {
  const strippedQuery = databaseUrl.split("?")[0];

  if (strippedQuery.startsWith("file://")) {
    return path.normalize(fileURLToPath(strippedQuery));
  }

  if (!strippedQuery.startsWith("file:")) {
    throw new Error(
      `Expected a sqlite file: URL. Received: ${databaseUrl}`,
    );
  }

  const rawPath = decodeURIComponent(strippedQuery.slice("file:".length));
  if (!rawPath) {
    throw new Error(`Invalid sqlite URL: ${databaseUrl}`);
  }

  if (path.isAbsolute(rawPath) || /^[A-Za-z]:[\\/]/.test(rawPath)) {
    return path.normalize(rawPath);
  }

  return path.resolve(process.cwd(), rawPath);
}

export function formatUtcTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return [
    String(date.getUTCFullYear()),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "-",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z",
  ].join("");
}

export function crc32(buffer) {
  let checksum = 0xffffffff;

  for (const byte of buffer) {
    checksum = CRC32_TABLE[(checksum ^ byte) & 0xff] ^ (checksum >>> 8);
  }

  return (checksum ^ 0xffffffff) >>> 0;
}

export function createZipArchive(entryName, payload, modifiedAt = new Date()) {
  const normalizedEntryName = entryName.replace(/\\/g, "/");
  const entryNameBuffer = Buffer.from(normalizedEntryName, "utf8");
  const compressedPayload = zlib.deflateRawSync(payload, {
    level: zlib.constants.Z_BEST_COMPRESSION,
  });
  const checksum = crc32(payload);
  const { dosDate, dosTime } = toDosDateTime(modifiedAt);

  const localFileHeader = Buffer.alloc(30 + entryNameBuffer.length);
  localFileHeader.writeUInt32LE(LOCAL_FILE_HEADER_SIGNATURE, 0);
  localFileHeader.writeUInt16LE(20, 4);
  localFileHeader.writeUInt16LE(0, 6);
  localFileHeader.writeUInt16LE(8, 8);
  localFileHeader.writeUInt16LE(dosTime, 10);
  localFileHeader.writeUInt16LE(dosDate, 12);
  localFileHeader.writeUInt32LE(checksum, 14);
  localFileHeader.writeUInt32LE(compressedPayload.length, 18);
  localFileHeader.writeUInt32LE(payload.length, 22);
  localFileHeader.writeUInt16LE(entryNameBuffer.length, 26);
  localFileHeader.writeUInt16LE(0, 28);
  entryNameBuffer.copy(localFileHeader, 30);

  const centralDirectoryHeader = Buffer.alloc(46 + entryNameBuffer.length);
  centralDirectoryHeader.writeUInt32LE(CENTRAL_DIRECTORY_SIGNATURE, 0);
  centralDirectoryHeader.writeUInt16LE(20, 4);
  centralDirectoryHeader.writeUInt16LE(20, 6);
  centralDirectoryHeader.writeUInt16LE(0, 8);
  centralDirectoryHeader.writeUInt16LE(8, 10);
  centralDirectoryHeader.writeUInt16LE(dosTime, 12);
  centralDirectoryHeader.writeUInt16LE(dosDate, 14);
  centralDirectoryHeader.writeUInt32LE(checksum, 16);
  centralDirectoryHeader.writeUInt32LE(compressedPayload.length, 20);
  centralDirectoryHeader.writeUInt32LE(payload.length, 24);
  centralDirectoryHeader.writeUInt16LE(entryNameBuffer.length, 28);
  centralDirectoryHeader.writeUInt16LE(0, 30);
  centralDirectoryHeader.writeUInt16LE(0, 32);
  centralDirectoryHeader.writeUInt16LE(0, 34);
  centralDirectoryHeader.writeUInt16LE(0, 36);
  centralDirectoryHeader.writeUInt32LE(0, 38);
  centralDirectoryHeader.writeUInt32LE(0, 42);
  entryNameBuffer.copy(centralDirectoryHeader, 46);

  const endOfCentralDirectoryRecord = Buffer.alloc(22);
  endOfCentralDirectoryRecord.writeUInt32LE(END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0);
  endOfCentralDirectoryRecord.writeUInt16LE(0, 4);
  endOfCentralDirectoryRecord.writeUInt16LE(0, 6);
  endOfCentralDirectoryRecord.writeUInt16LE(1, 8);
  endOfCentralDirectoryRecord.writeUInt16LE(1, 10);
  endOfCentralDirectoryRecord.writeUInt32LE(centralDirectoryHeader.length, 12);
  endOfCentralDirectoryRecord.writeUInt32LE(
    localFileHeader.length + compressedPayload.length,
    16,
  );
  endOfCentralDirectoryRecord.writeUInt16LE(0, 20);

  return Buffer.concat([
    localFileHeader,
    compressedPayload,
    centralDirectoryHeader,
    endOfCentralDirectoryRecord,
  ]);
}

export function extractFirstZipEntry(archiveBuffer) {
  if (archiveBuffer.length < 30) {
    throw new Error("Zip archive is too small.");
  }

  const signature = archiveBuffer.readUInt32LE(0);
  if (signature !== LOCAL_FILE_HEADER_SIGNATURE) {
    throw new Error("Unsupported zip archive: missing local file header.");
  }

  const generalPurposeFlag = archiveBuffer.readUInt16LE(6);
  if ((generalPurposeFlag & 0x08) !== 0) {
    throw new Error("Zip data descriptor format is not supported.");
  }

  const compressionMethod = archiveBuffer.readUInt16LE(8);
  const expectedChecksum = archiveBuffer.readUInt32LE(14);
  const compressedSize = archiveBuffer.readUInt32LE(18);
  const uncompressedSize = archiveBuffer.readUInt32LE(22);
  const fileNameLength = archiveBuffer.readUInt16LE(26);
  const extraFieldLength = archiveBuffer.readUInt16LE(28);

  const fileNameStart = 30;
  const fileNameEnd = fileNameStart + fileNameLength;
  const dataStart = fileNameEnd + extraFieldLength;
  const dataEnd = dataStart + compressedSize;

  if (dataEnd > archiveBuffer.length) {
    throw new Error("Zip archive is truncated.");
  }

  const entryName = archiveBuffer.subarray(fileNameStart, fileNameEnd).toString("utf8");
  const compressedPayload = archiveBuffer.subarray(dataStart, dataEnd);

  let payload;
  if (compressionMethod === 0) {
    payload = Buffer.from(compressedPayload);
  } else if (compressionMethod === 8) {
    payload = zlib.inflateRawSync(compressedPayload);
  } else {
    throw new Error(`Unsupported zip compression method: ${compressionMethod}`);
  }

  if (payload.length !== uncompressedSize) {
    throw new Error("Zip payload size mismatch.");
  }

  const checksum = crc32(payload);
  if (checksum !== expectedChecksum) {
    throw new Error("Zip payload checksum mismatch.");
  }

  return {
    entryName,
    payload,
  };
}
