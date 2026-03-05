#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  createZipArchive,
  formatUtcTimestamp,
  getArgAsString,
  getDatabaseUrl,
  parseCliArgs,
  resolveSqliteFilePath,
} from "./sqlite-backup-utils.mjs";

function parseKeepDays(rawValue) {
  if (!rawValue) {
    return 30;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("--keep-days must be a non-negative number.");
  }

  return Math.floor(parsed);
}

function pruneOldArchives(backupDirectory, keepDays) {
  if (keepDays === 0) {
    return 0;
  }

  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  const entries = fs.readdirSync(backupDirectory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".zip")) {
      continue;
    }

    const fullPath = path.join(backupDirectory, entry.name);
    const stats = fs.statSync(fullPath);
    if (stats.mtimeMs >= cutoff) {
      continue;
    }

    fs.unlinkSync(fullPath);
    deletedCount += 1;
  }

  return deletedCount;
}

function main() {
  const args = parseCliArgs();
  const backupDirectory = path.resolve(
    getArgAsString(args, "backup-dir") ?? "backups/sqlite",
  );
  const keepDays = parseKeepDays(getArgAsString(args, "keep-days"));
  const shouldPrune = args["no-prune"] !== true;

  const databaseUrl = getDatabaseUrl(args);
  const databaseFilePath = resolveSqliteFilePath(databaseUrl);

  if (!fs.existsSync(databaseFilePath)) {
    throw new Error(`SQLite database file not found: ${databaseFilePath}`);
  }

  fs.mkdirSync(backupDirectory, { recursive: true });

  const timestamp = formatUtcTimestamp();
  const databaseBaseName = path.parse(databaseFilePath).name || "database";
  const stagedFileName = `${databaseBaseName}-${timestamp}.sqlite`;
  const stagedFilePath = path.join(backupDirectory, stagedFileName);
  const archiveFilePath = `${stagedFilePath}.zip`;

  fs.copyFileSync(databaseFilePath, stagedFilePath);

  const databaseBuffer = fs.readFileSync(stagedFilePath);
  const archiveBuffer = createZipArchive(stagedFileName, databaseBuffer, new Date());
  fs.writeFileSync(archiveFilePath, archiveBuffer);

  fs.unlinkSync(stagedFilePath);

  const prunedCount = shouldPrune ? pruneOldArchives(backupDirectory, keepDays) : 0;

  console.log(`Backup created: ${archiveFilePath}`);
  console.log(`Source DB: ${databaseFilePath}`);
  console.log(`Archive size: ${archiveBuffer.length} bytes`);
  if (shouldPrune) {
    console.log(`Pruned archives older than ${keepDays} day(s): ${prunedCount}`);
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Backup failed: ${message}`);
  process.exit(1);
}
