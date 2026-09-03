const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const vm = require('vm');

const TIMEOUT_MS = 5000;

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, { cwd: options.cwd });
    } catch (err) {
      return resolve({ success: false, stdout: '', stderr: err.message, timedOut: false });
    }

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const killer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, TIMEOUT_MS);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    if (options.stdin !== undefined) {
      child.stdin.write(options.stdin);
    }
    child.stdin.end();

    child.on('error', (err) => {
      clearTimeout(killer);
      resolve({ success: false, stdout, stderr: err.message, timedOut: false });
    });

    child.on('close', (code) => {
      clearTimeout(killer);
      resolve({
        success: !timedOut && code === 0,
        stdout,
        stderr: timedOut ? 'Execution timed out.' : stderr,
        timedOut
      });
    });
  });
}

function formatResult(result) {
  if (result.success) {
    return { success: true, output: result.stdout.trim() || 'Program finished with no output.' };
  }
  return { success: false, output: result.stdout.trim(), error: result.stderr || 'Execution failed.' };
}

async function withTempDir(fn) {
  const dir = path.join(os.tmpdir(), 'coderun-' + crypto.randomUUID());
  await fs.mkdir(dir, { recursive: true });
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function runJavaScript(code, stdin = '') {
  let output = '';
  try {
    const sandbox = {
      console: {
        log: (...args) => { output += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n'; },
        error: (...args) => { output += args.map(String).join(' ') + '\n'; }
      },
      require: (mod) => {
        if (mod === 'fs') return { readFileSync: () => stdin };
        throw new Error(`Module '${mod}' is not available.`);
      }
    };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox, { timeout: TIMEOUT_MS });
    return { success: true, output: output.trim() || 'Program finished with no output.' };
  } catch (error) {
    return { success: false, output: output.trim(), error: error.message };
  }
}

async function runPython(code, stdin = '') {
  return withTempDir(async (dir) => {
    const file = path.join(dir, 'main.py');
    await fs.writeFile(file, code);
    const result = await runProcess('python', [file], { cwd: dir, stdin });;
    return formatResult(result);
  });
}

// async function runC(code, stdin = '') {
//   return withTempDir(async (dir) => {
//     const src = path.join(dir, 'main.c');
//     const bin = path.join(dir, 'main');
//     await fs.writeFile(src, code);
//     const compile = await runProcess('gcc', [src, '-o', bin], { cwd: dir });
//     if (!compile.success) {
//       return { success: false, output: '', error: compile.stderr || 'Compilation failed.' };
//     }
//     const result = await runProcess(bin, [], { cwd: dir, stdin });
//     return formatResult(result);
//   });
// }

async function runJava(code, stdin = '') {
  return withTempDir(async (dir) => {
    const match = code.match(/public\s+class\s+(\w+)/);
    const className = match ? match[1] : 'Main';
    const src = path.join(dir, `${className}.java`);
    await fs.writeFile(src, code);
    const compile = await runProcess('javac', [src], { cwd: dir });
    if (!compile.success) {
      return { success: false, output: '', error: compile.stderr || 'Compilation failed.' };
    }
    const result = await runProcess('java', ['-cp', dir, className], { cwd: dir, stdin });
    return formatResult(result);
  });
}

async function runBash(code, stdin = '') {
  return withTempDir(async (dir) => {
    const file = path.join(dir, 'script.sh');
    await fs.writeFile(file, code, { mode: 0o755 });
    const result = await runProcess('bash', [file], { cwd: dir, stdin });
    return formatResult(result);
  });
}

async function runCode({ code, language, stdin = '' }) {
  switch (language) {
    case 'javascript': return runJavaScript(code, stdin);
    case 'python': return runPython(code, stdin);
    case 'java': return runJava(code, stdin);
    case 'bash': return runBash(code, stdin);
    default: return { success: false, output: '', error: `Execution for ${language} is not supported.` };
  }
}

module.exports = { runCode };