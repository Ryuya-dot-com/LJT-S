'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const REQUIRED_TOP_LEVEL_FILES = [
  'START_HERE.html',
  'README_FIRST-ja.md',
  'README_FIRST-en.md'
];

const REQUIRED_ONLINE_FILES = [
  'index.html',
  'participant.html',
  'assets/styles.css',
  'data/items.js',
  'data/conversion.js',
  'data/submission.js',
  'js/app.js'
];

function inspectOfflinePackage(targetPath, options = {}) {
  const absoluteTarget = path.resolve(targetPath);
  const loaded = loadPackage(absoluteTarget);
  const errors = [...loaded.errors];
  const entries = loaded.entries;

  for (const required of REQUIRED_TOP_LEVEL_FILES) {
    const content = entries.get(required);
    if (!content) {
      errors.push(`missing required file: ${required}`);
    } else if (content.length === 0) {
      errors.push(`required file is empty: ${required}`);
    }
  }

  const html = entries.get('START_HERE.html');
  if (html) validateStartHtml(html.toString('utf8'), errors);

  const referencedAudio = html
    ? collectAudioReferences(html.toString('utf8'))
    : new Set();
  if (referencedAudio.size !== 44) {
    errors.push(`START_HERE.html must reference 44 distinct audio files (found ${referencedAudio.size})`);
  }

  for (const audioPath of referencedAudio) {
    const content = entries.get(audioPath);
    if (!content) {
      errors.push(`referenced audio is missing: ${audioPath}`);
    } else if (content.length === 0) {
      errors.push(`referenced audio is empty: ${audioPath}`);
    } else if (!isM4a(content)) {
      errors.push(`referenced audio is not an M4A/MP4 file: ${audioPath}`);
    }
  }

  const shippedAudio = new Set(
    [...entries.keys()].filter(name => name.startsWith('audio/'))
  );
  for (const audioPath of shippedAudio) {
    const content = entries.get(audioPath);
    if (!content || content.length === 0) {
      errors.push(`shipped audio is empty: ${audioPath}`);
    } else if (!isM4a(content)) {
      errors.push(`shipped audio is not an M4A/MP4 file: ${audioPath}`);
    }
    if (!referencedAudio.has(audioPath)) {
      errors.push(`unreferenced audio must not be shipped: ${audioPath}`);
    }
  }
  for (const audioPath of referencedAudio) {
    if (!shippedAudio.has(audioPath)) {
      errors.push(`referenced audio is absent from package: ${audioPath}`);
    }
  }

  for (const name of entries.keys()) {
    if (/\.wav$/i.test(name)) errors.push(`WAV master must not be shipped: ${name}`);
    if (/^(assets|data|js)\//.test(name)) {
      errors.push(`web source dependency must be inlined for offline use: ${name}`);
    }
  }

  const allowedFiles = new Set([...REQUIRED_TOP_LEVEL_FILES, ...referencedAudio]);
  for (const name of entries.keys()) {
    if (!allowedFiles.has(name)) errors.push(`unexpected offline package file: ${name}`);
  }

  if (options.sourceRoot && html) {
    validateAgainstSource(
      entries,
      html.toString('utf8'),
      path.resolve(options.sourceRoot),
      referencedAudio,
      errors
    );
  }

  return {
    valid: errors.length === 0,
    errors: unique(errors),
    files: [...entries.keys()].sort(),
    archiveRoot: loaded.archiveRoot || ''
  };
}

function inspectOnlinePackage(targetPath, options = {}) {
  const absoluteTarget = path.resolve(targetPath);
  const loaded = loadPackage(absoluteTarget);
  const errors = [...loaded.errors];
  const entries = loaded.entries;

  for (const required of REQUIRED_ONLINE_FILES) {
    const content = entries.get(required);
    if (!content) {
      errors.push(`missing required online file: ${required}`);
    } else if (content.length === 0) {
      errors.push(`required online file is empty: ${required}`);
    }
  }

  const itemsSource = entries.get('data/items.js');
  const referencedAudio = itemsSource
    ? collectAudioReferences(itemsSource.toString('utf8'))
    : new Set();
  if (referencedAudio.size !== 44) {
    errors.push(`data/items.js must reference 44 distinct audio files (found ${referencedAudio.size})`);
  }

  const shippedAudio = new Set(
    [...entries.keys()].filter(name => name.startsWith('audio/'))
  );
  for (const audioPath of shippedAudio) {
    const content = entries.get(audioPath);
    if (!content || content.length === 0) {
      errors.push(`shipped audio is empty: ${audioPath}`);
    } else if (!isM4a(content)) {
      errors.push(`shipped audio is not an M4A/MP4 file: ${audioPath}`);
    }
    if (!referencedAudio.has(audioPath)) {
      errors.push(`unreferenced audio must not be shipped: ${audioPath}`);
    }
  }
  for (const audioPath of referencedAudio) {
    if (!shippedAudio.has(audioPath)) {
      errors.push(`referenced audio is absent from package: ${audioPath}`);
    }
  }

  for (const name of entries.keys()) {
    if (/\.wav$/i.test(name)) errors.push(`WAV master must not be shipped: ${name}`);
  }

  for (const htmlName of ['index.html', 'participant.html']) {
    const html = entries.get(htmlName);
    if (html) validateLocalHtmlDependencies(htmlName, html.toString('utf8'), entries, errors);
  }

  if (options.sourceRoot) {
    const sourceRoot = path.resolve(options.sourceRoot);
    for (const relativePath of REQUIRED_ONLINE_FILES) {
      const packaged = entries.get(relativePath);
      const sourcePath = path.join(sourceRoot, ...relativePath.split('/'));
      if (!fs.existsSync(sourcePath)) {
        errors.push(`release source is missing: ${relativePath}`);
      } else if (packaged && !packaged.equals(fs.readFileSync(sourcePath))) {
        errors.push(`online package is stale or altered: ${relativePath}`);
      }
    }
    for (const audioPath of referencedAudio) {
      const packaged = entries.get(audioPath);
      const sourcePath = path.join(sourceRoot, ...audioPath.split('/'));
      if (!fs.existsSync(sourcePath)) {
        errors.push(`release source audio is missing: ${audioPath}`);
      } else if (packaged && !packaged.equals(fs.readFileSync(sourcePath))) {
        errors.push(`online audio differs from release source: ${audioPath}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: unique(errors),
    files: [...entries.keys()].sort(),
    archiveRoot: loaded.archiveRoot || ''
  };
}

function loadPackage(absoluteTarget) {
  return fs.statSync(absoluteTarget).isDirectory()
    ? readDirectory(absoluteTarget)
    : readZip(absoluteTarget);
}

function validateLocalHtmlDependencies(htmlName, source, entries, errors) {
  const attributes = [...source.matchAll(
    /<(?:script|link)\b[^>]*\b(?:src|href)\s*=\s*(["'])(.*?)\1/gi
  )].map(match => match[2]);

  for (const value of attributes) {
    if (/^(?:data:|https?:|#)/i.test(value)) continue;
    const withoutQuery = value.split(/[?#]/, 1)[0];
    if (!withoutQuery) continue;
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(htmlName), withoutQuery));
    if (resolved.startsWith('../') || !entries.has(resolved)) {
      errors.push(`${htmlName} references a missing local dependency: ${value}`);
    }
  }
}

function validateAgainstSource(entries, html, sourceRoot, referencedAudio, errors) {
  for (const [marker, relativePath, tag] of [
    ['assets/styles.css', 'assets/styles.css', 'style'],
    ['data/items.js', 'data/items.js', 'script'],
    ['data/conversion.js', 'data/conversion.js', 'script'],
    ['js/app.js', 'js/app.js', 'script']
  ]) {
    const sourcePath = path.join(sourceRoot, ...relativePath.split('/'));
    if (!fs.existsSync(sourcePath)) {
      errors.push(`release source is missing: ${relativePath}`);
      continue;
    }
    const expected = fs.readFileSync(sourcePath, 'utf8');
    const actual = extractInlineSource(html, marker, tag);
    if (actual === null) {
      errors.push(`inline source marker is missing: ${marker}`);
    } else if (actual !== expected) {
      errors.push(`offline HTML is stale or altered: ${relativePath}`);
    }
  }

  for (const [packagedName, sourceName] of [
    ['README_FIRST-ja.md', 'offline/README_FIRST-ja.md'],
    ['README_FIRST-en.md', 'offline/README_FIRST-en.md']
  ]) {
    const packaged = entries.get(packagedName);
    const sourcePath = path.join(sourceRoot, ...sourceName.split('/'));
    if (packaged && fs.existsSync(sourcePath) && !packaged.equals(fs.readFileSync(sourcePath))) {
      errors.push(`offline readme is stale or altered: ${packagedName}`);
    }
  }

  for (const audioPath of referencedAudio) {
    const packaged = entries.get(audioPath);
    const sourcePath = path.join(sourceRoot, ...audioPath.split('/'));
    if (!fs.existsSync(sourcePath)) {
      errors.push(`release source audio is missing: ${audioPath}`);
    } else if (packaged && !packaged.equals(fs.readFileSync(sourcePath))) {
      errors.push(`offline audio differs from release source: ${audioPath}`);
    }
  }
}

function extractInlineSource(html, marker, tag) {
  const opening = `<${tag} data-inline-source="${marker}">`;
  const openingIndex = html.indexOf(opening);
  if (openingIndex < 0) return null;
  const contentStart = openingIndex + opening.length;
  if (html[contentStart] !== '\n') return null;
  const closing = `  </${tag}>`;
  const closingIndex = html.indexOf(closing, contentStart + 1);
  if (closingIndex < 0) return null;
  return html.slice(contentStart + 1, closingIndex);
}

function validateStartHtml(source, errors) {
  const scriptSources = [...source.matchAll(/<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/gi)];
  if (scriptSources.length) {
    errors.push('START_HERE.html must inline JavaScript and must not use <script src>');
  }

  const stylesheets = [...source.matchAll(
    /<link\b(?=[^>]*\brel\s*=\s*(["'])stylesheet\1)[^>]*\bhref\s*=\s*(["'])(.*?)\2/gi
  )];
  if (stylesheets.length) {
    errors.push('START_HERE.html must inline CSS and must not link a stylesheet');
  }

  if (/script\.google\.com\/macros\//i.test(source)) {
    errors.push('offline HTML must not contain a Google Apps Script endpoint');
  }

  const submissionConfig = source.match(
    /(?:window\.)?LJT_SHORT_SUBMISSION\s*=\s*\{([\s\S]*?)\}\s*;?/
  );
  if (submissionConfig && /\benabled\s*:\s*true\b/.test(submissionConfig[1])) {
    errors.push('offline submission configuration must not be enabled');
  }
}

function collectAudioReferences(source) {
  return new Set(
    [...source.matchAll(/audio\/(?:main|practice)\/[A-Za-z0-9._-]+\.m4a/g)]
      .map(match => match[0])
  );
}

function isM4a(content) {
  return content.length >= 12 && content.subarray(4, 8).toString('ascii') === 'ftyp';
}

function readDirectory(directory) {
  const entries = new Map();
  walk(directory, directory, entries);
  return { entries, errors: [], archiveRoot: '' };
}

function walk(root, directory, entries) {
  for (const dirent of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, dirent.name);
    if (dirent.isDirectory()) {
      walk(root, absolute, entries);
    } else if (dirent.isFile()) {
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      entries.set(relative, fs.readFileSync(absolute));
    }
  }
}

function readZip(zipPath) {
  const buffer = fs.readFileSync(zipPath);
  const errors = [];
  const rawEntries = new Map();
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset < 0) throw new Error(`Not a supported ZIP archive: ${zipPath}`);

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory entry ${index}: ${zipPath}`);
    }

    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const crc = buffer.readUInt32LE(offset + 16);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    offset += 46 + nameLength + extraLength + commentLength;

    if (name.endsWith('/')) continue;
    if (!isSafeArchivePath(name)) {
      errors.push(`unsafe ZIP entry path: ${name}`);
      continue;
    }
    if ((flags & 0x1) !== 0) {
      errors.push(`encrypted ZIP entry is unsupported: ${name}`);
      continue;
    }
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      errors.push(`invalid local ZIP header: ${name}`);
      continue;
    }

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    let content;
    if (method === 0) {
      content = Buffer.from(compressed);
    } else if (method === 8) {
      content = zlib.inflateRawSync(compressed);
    } else {
      errors.push(`unsupported ZIP compression method ${method}: ${name}`);
      continue;
    }

    if (content.length !== uncompressedSize) {
      errors.push(`ZIP size mismatch: ${name}`);
    }
    if (crc32(content) !== crc) {
      errors.push(`ZIP CRC mismatch: ${name}`);
    }
    if (rawEntries.has(name)) errors.push(`duplicate ZIP entry: ${name}`);
    rawEntries.set(name, content);
  }

  const fileNames = [...rawEntries.keys()];
  const firstSegments = new Set(fileNames.map(name => name.split('/')[0]));
  let archiveRoot = '';
  if (firstSegments.size === 1 && fileNames.every(name => name.includes('/'))) {
    archiveRoot = `${firstSegments.values().next().value}/`;
  } else {
    errors.push('release ZIP must contain one top-level package directory');
  }

  const entries = new Map();
  for (const [name, content] of rawEntries) {
    const relative = archiveRoot && name.startsWith(archiveRoot)
      ? name.slice(archiveRoot.length)
      : name;
    if (entries.has(relative)) errors.push(`duplicate normalized ZIP entry: ${relative}`);
    entries.set(relative, content);
  }
  return { entries, errors, archiveRoot: archiveRoot.replace(/\/$/, '') };
}

function isSafeArchivePath(name) {
  const normalized = name.replaceAll('\\', '/');
  return normalized === name
    && !normalized.startsWith('/')
    && !normalized.split('/').includes('..');
}

function findEndOfCentralDirectory(buffer) {
  const minimum = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

const CRC_TABLE = makeCrcTable();

function makeCrcTable() {
  return Array.from({ length: 256 }, (_, value) => {
    let crc = value;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    return crc >>> 0;
  });
}

function crc32(content) {
  let crc = 0xffffffff;
  for (const byte of content) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function unique(values) {
  return [...new Set(values)];
}

module.exports = {
  collectAudioReferences,
  inspectOfflinePackage,
  inspectOnlinePackage,
  readZip
};
