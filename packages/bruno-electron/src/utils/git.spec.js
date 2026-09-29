const { parseRemoteBranches } = require('./git');

describe('parseRemoteBranches', () => {
  it('reads the branch names and the default branch out of ls-remote output', () => {
    const output = [
      'ref: refs/heads/main\tHEAD',
      '9c1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f\tHEAD',
      '9c1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f\trefs/heads/main',
      '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b\trefs/heads/feature/branch-selector'
    ].join('\n');

    expect(parseRemoteBranches(output)).toEqual({
      branches: ['main', 'feature/branch-selector'],
      defaultBranch: 'main'
    });
  });

  it('reads output written with CRLF line endings', () => {
    const output = ['ref: refs/heads/main\tHEAD', '9c1f2a3\trefs/heads/main', '1a2b3c4\trefs/heads/develop'].join('\r\n');

    expect(parseRemoteBranches(output)).toEqual({
      branches: ['main', 'develop'],
      defaultBranch: 'main'
    });
  });

  it('reports no default branch when the remote sends no symref line', () => {
    const output = ['9c1f2a3\trefs/heads/main', '1a2b3c4\trefs/heads/develop'].join('\n');

    expect(parseRemoteBranches(output)).toEqual({
      branches: ['main', 'develop'],
      defaultBranch: null
    });
  });

  it('ignores refs that are not branches', () => {
    const output = ['9c1f2a3\trefs/heads/main', '1a2b3c4\trefs/tags/v1.0.0', '2b3c4d5\trefs/pull/12/head'].join('\n');

    expect(parseRemoteBranches(output).branches).toEqual(['main']);
  });

  it('returns an empty listing for empty output', () => {
    expect(parseRemoteBranches('')).toEqual({ branches: [], defaultBranch: null });
    expect(parseRemoteBranches(undefined)).toEqual({ branches: [], defaultBranch: null });
  });
});

describe('listBranchesForRemoteUrl', () => {
  const { execFileSync } = require('child_process');
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { listBranchesForRemoteUrl } = require('./git');

  const userEnv = {
    EDITOR: 'vim',
    PAGER: 'less',
    GIT_ASKPASS: '/usr/bin/true',
    SSH_ASKPASS: '/usr/bin/true',
    GIT_SSH_COMMAND: 'ssh',
    GIT_CONFIG_COUNT: '0'
  };
  let workDir;
  let savedEnv;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-git-spec-'));
    const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' });
    const source = path.join(workDir, 'source');
    fs.mkdirSync(source);
    git(source, 'init', '-q', '-b', 'main');
    git(source, '-c', 'user.name=Bruno', '-c', 'user.email=bruno@example.com', 'commit', '-q', '--allow-empty', '-m', 'init');
    git(source, 'branch', 'develop');
    git(workDir, 'clone', '-q', '--bare', source, 'remote.git');

    savedEnv = { ...process.env };
    Object.assign(process.env, userEnv);
  });

  afterEach(() => {
    for (const key of Object.keys(userEnv)) {
      if (key in savedEnv) process.env[key] = savedEnv[key];
      else delete process.env[key];
    }
    fs.rmSync(workDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('lists branches when the user environment sets editor, pager, askpass or ssh variables', async () => {
    const result = await listBranchesForRemoteUrl({ url: path.join(workDir, 'remote.git') });

    expect(result.defaultBranch).toBe('main');
    expect(result.branches.sort()).toEqual(['develop', 'main']);
  });
});
