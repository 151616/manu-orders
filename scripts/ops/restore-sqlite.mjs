#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  extractFirstZipEntry,
  formatUtcTimestamp,
  getArgAsString,
  getDatabaseUrl,
  parseCliArgs,
  resolveSqliteFilePath,
} from "./sqlite-backup-utils.mjs";

function findLatestArchive(backupDirectory) {
  if (!fs.existsSync(backupDirectory)) {
    return null;
  }

  const candidates = fs
    .readdirSync(backupDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".zip"))
    .map((entry) => path.join(backupDirectory, entry.name))
    .map((filePath) => ({
      filePath,
      mtimeMs: fs.statSync(filePath).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0]?.filePath ?? null;
}

function loadArchivePayload(archivePath) {
  const buffer = fs.readFileSync(archivePath);
  if (archivePath.toLowerCase().endsWith(".zip")) {
    return extractFirstZipEntry(buffer).payload;
  }

  return buffer;
}

function main() {
  const args = parseCliArgs();
  const backupDirectory = path.resolve(
    getArgAsString(args, "backup-dir") ?? "backups/sqlite",
  );
  const explicitArchive = getArgAsString(args, "archive");
  const archivePath = explicitArchive
    ? path.resolve(explicitArchive)
    : findLatestArchive(backupDirectory);

  if (!archivePath) {
    throw new Error(
      `No backup archive found. Provide --archive or place .zip files in ${backupDirectory}.`,
    );
  }

  if (!fs.existsSync(archivePath)) {
    throw new Error(`Backup archive not found: ${archivePath}`);
  }

  const targetPath = getArgAsString(args, "target-file")
    ? path.resolve(getArgAsString(args, "target-file"))
    : resolveSqliteFilePath(getDatabaseUrl(args));
  const skipSafetyBackup = args["skip-safety-backup"] === true;

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  const payload = loadArchivePayload(archivePath);
  if (payload.length === 0) {
    throw new Error("Restore payload is empty.");
  }

  let safetyBackupPath = null;
  if (fs.existsSync(targetPath) && !skipSafetyBackup) {
    const parsedTarget = path.parse(targetPath);
    const safetyFileName = `${parsedTarget.name}.pre-restore-${formatUtcTimestamp()}.sqlite`;
    safetyBackupPath = path.join(parsedTarget.dir, safetyFileName);
    fs.copyFileSync(targetPath, safetyBackupPath);
  }

  fs.writeFileSync(targetPath, payload);

  console.log(`Restored SQLite database to: ${targetPath}`);
  console.log(`Source archive: ${archivePath}`);
  if (safetyBackupPath) {
    console.log(`Pre-restore safety backup: ${safetyBackupPath}`);
  } else {
    console.log("Pre-restore safety backup: skipped");
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Restore failed: ${message}`);
  process.exit(1);
}
