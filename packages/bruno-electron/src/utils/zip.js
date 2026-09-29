const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const S_IFMT = 0o170000;
const S_IFLNK = 0o120000;

const isSymlinkEntry = (entry) => ((entry.attr >>> 16) & S_IFMT) === S_IFLNK;

const resolveEntryPath = (targetDir, entryName) => {
  // Zip tools on Windows sometimes write `\` separators, which POSIX would
  // otherwise treat as part of the file name.
  const normalizedName = entryName.replace(/\\/g, '/');
  if (path.posix.isAbsolute(normalizedName) || /^[a-zA-Z]:/.test(normalizedName)) {
    throw new Error(`Invalid ZIP file: entry "${entryName}" has an absolute path`);
  }

  const resolved = path.resolve(targetDir, normalizedName);
  if (resolved !== targetDir && !resolved.startsWith(targetDir + path.sep)) {
    throw new Error(`Invalid ZIP file: entry "${entryName}" points outside the extraction directory`);
  }
  return resolved;
};

const readEntryData = (entry) => new Promise((resolve, reject) => {
  entry.getDataAsync((data, err) => (err ? reject(new Error(`Invalid ZIP file: cannot read "${entry.entryName}": ${err}`)) : resolve(data)));
});

/**
 * Extracts a ZIP archive into `targetDir`.
 *
 * Every entry is validated before anything is written: absolute paths, entries
 * that resolve outside `targetDir` and symbolic links are rejected rather than
 * silently rewritten, so a hostile archive fails the import instead of
 * producing a partial or relocated tree. Entries are then written one at a
 * time with async I/O so a large archive doesn't block the main process.
 */
const extractZip = async (zipFilePath, targetDir) => {
  const resolvedTargetDir = path.resolve(targetDir);
  const zip = new AdmZip(await fs.promises.readFile(zipFilePath));

  const entries = zip.getEntries().map((entry) => {
    if (isSymlinkEntry(entry)) {
      throw new Error(`Invalid ZIP file: symbolic links are not supported ("${entry.entryName}")`);
    }
    return { entry, destination: resolveEntryPath(resolvedTargetDir, entry.entryName) };
  });

  for (const { entry, destination } of entries) {
    if (entry.isDirectory) {
      await fs.promises.mkdir(destination, { recursive: true });
      continue;
    }
    await fs.promises.mkdir(path.dirname(destination), { recursive: true });
    await fs.promises.writeFile(destination, await readEntryData(entry));
  }
};

module.exports = { extractZip };
