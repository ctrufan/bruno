const fs = require('fs');
const os = require('os');
const path = require('path');
const AdmZip = require('adm-zip');
const { extractZip } = require('./zip');

const SYMLINK_ATTR = (0o120777 << 16) >>> 0;

describe('extractZip', () => {
  let workDir;
  let targetDir;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-zip-spec-'));
    targetDir = path.join(workDir, 'out');
    fs.mkdirSync(targetDir);
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  // adm-zip sanitizes names passed to addFile, so hostile names are set on the
  // entry afterwards to reproduce what a crafted archive contains.
  const writeZip = (entries) => {
    const zip = new AdmZip();
    entries.forEach(({ name, content = '', attr }, index) => {
      const entry = zip.addFile(name.endsWith('/') ? name : `placeholder-${index}`, Buffer.from(content));
      entry.entryName = name;
      if (attr !== undefined) entry.attr = attr;
    });
    const zipPath = path.join(workDir, 'archive.zip');
    fs.writeFileSync(zipPath, zip.toBuffer());
    return zipPath;
  };

  it('extracts files and directories, including empty files', async () => {
    const zipPath = writeZip([
      { name: 'collection/' },
      { name: 'collection/bruno.json', content: '{"name":"c"}' },
      { name: 'collection/folder/request.bru', content: 'meta {}' },
      { name: 'collection/empty.txt' }
    ]);

    await extractZip(zipPath, targetDir);

    expect(fs.readFileSync(path.join(targetDir, 'collection/bruno.json'), 'utf8')).toBe('{"name":"c"}');
    expect(fs.readFileSync(path.join(targetDir, 'collection/folder/request.bru'), 'utf8')).toBe('meta {}');
    expect(fs.readFileSync(path.join(targetDir, 'collection/empty.txt'), 'utf8')).toBe('');
  });

  it.each([
    ['a parent-directory traversal', '../evil.txt'],
    ['a nested traversal', 'collection/../../evil.txt'],
    ['a backslash traversal', '..\\evil.txt'],
    ['an absolute POSIX path', '/tmp/evil.txt'],
    ['a Windows drive path', 'C:/evil.txt']
  ])('rejects %s without writing anything', async (_label, name) => {
    const zipPath = writeZip([{ name: 'safe.txt', content: 'ok' }, { name, content: 'pwned' }]);

    await expect(extractZip(zipPath, targetDir)).rejects.toThrow(/Invalid ZIP file/);
    expect(fs.readdirSync(targetDir)).toEqual([]);
    expect(fs.existsSync(path.join(workDir, 'evil.txt'))).toBe(false);
  });

  it('rejects symbolic link entries instead of writing them as files', async () => {
    const zipPath = writeZip([
      { name: 'bruno.json', content: '{}' },
      { name: 'link', content: '/etc/passwd', attr: SYMLINK_ATTR }
    ]);

    await expect(extractZip(zipPath, targetDir)).rejects.toThrow(/symbolic links are not supported/);
    expect(fs.readdirSync(targetDir)).toEqual([]);
  });

  it('rejects a file that is not a ZIP archive', async () => {
    const zipPath = path.join(workDir, 'not-a.zip');
    fs.writeFileSync(zipPath, 'definitely not a zip');

    await expect(extractZip(zipPath, targetDir)).rejects.toThrow();
  });

  it('rejects a corrupt entry', async () => {
    const zipPath = writeZip([{ name: 'bruno.json', content: 'x'.repeat(4096) }]);
    const bytes = fs.readFileSync(zipPath);
    // Flip bytes inside the compressed payload, which starts after the 30-byte
    // local header and the entry name.
    for (let i = 40; i < 60; i++) bytes[i] ^= 0xff;
    fs.writeFileSync(zipPath, bytes);

    await expect(extractZip(zipPath, targetDir)).rejects.toThrow(/Invalid ZIP file/);
  });
});
