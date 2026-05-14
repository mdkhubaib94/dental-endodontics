import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(process.cwd());
const clientSrc = path.join(projectRoot, 'client', 'src');

const codeExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.json']);

const walk = (dir, out = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, out);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (codeExtensions.has(ext)) out.push(fullPath);
    }
  }
  return out;
};

const importRegex = /(?:import\s+[^'"\n]+\s+from\s+|import\s*\(\s*|require\s*\(\s*)['"](\.[^'"]+)['"]/g;

const listDir = (dir) => {
  try {
    return fs.readdirSync(dir);
  } catch {
    return null;
  }
};

const resolveWithExtensions = (basePath) => {
  // Exact file
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) return basePath;

  // Try extensions
  for (const ext of ['.js', '.jsx', '.ts', '.tsx', '.css', '.json']) {
    const candidate = basePath + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }

  // Directory index
  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const ext of ['.js', '.jsx', '.ts', '.tsx']) {
      const indexCandidate = path.join(basePath, 'index' + ext);
      if (fs.existsSync(indexCandidate) && fs.statSync(indexCandidate).isFile()) return indexCandidate;
    }
  }

  return null;
};

const findCaseMismatch = (absPath) => {
  // If path does not exist, return null (handled separately)
  if (!fs.existsSync(absPath)) return null;

  const rel = path.relative(projectRoot, absPath);
  const parts = rel.split(path.sep);
  let current = projectRoot;
  const mismatches = [];

  for (const part of parts) {
    const entries = listDir(current);
    if (!entries) break;

    const exact = entries.find((e) => e === part);
    if (exact) {
      current = path.join(current, exact);
      continue;
    }

    const ci = entries.find((e) => e.toLowerCase() === part.toLowerCase());
    if (ci) {
      mismatches.push({ expected: part, actual: ci, at: path.relative(projectRoot, current) || '.' });
      current = path.join(current, ci);
      continue;
    }

    // Not found
    break;
  }

  return mismatches.length ? mismatches : null;
};

const files = walk(clientSrc);
const issues = [];

for (const filePath of files) {
  const text = fs.readFileSync(filePath, 'utf8');
  const dir = path.dirname(filePath);

  for (const match of text.matchAll(importRegex)) {
    const spec = match[1];
    if (!spec.startsWith('.')) continue;

    const absCandidate = path.resolve(dir, spec);
    const resolved = resolveWithExtensions(absCandidate);

    if (!resolved) {
      issues.push({
        type: 'missing',
        file: path.relative(projectRoot, filePath),
        spec,
      });
      continue;
    }

    const mismatches = findCaseMismatch(resolved);
    if (mismatches) {
      issues.push({
        type: 'casing',
        file: path.relative(projectRoot, filePath),
        spec,
        resolved: path.relative(projectRoot, resolved),
        mismatches,
      });
    }
  }
}

if (issues.length === 0) {
  console.log('OK: No missing imports or case mismatches found.');
  process.exit(0);
}

console.log(`Found ${issues.length} potential import issues:\n`);
for (const issue of issues) {
  if (issue.type === 'missing') {
    console.log(`- MISSING  ${issue.file}  ->  ${issue.spec}`);
  } else {
    console.log(`- CASING   ${issue.file}  ->  ${issue.spec}`);
    console.log(`           resolves to ${issue.resolved}`);
    for (const m of issue.mismatches) {
      console.log(`           in ${m.at}: expected '${m.expected}', actual '${m.actual}'`);
    }
  }
}

process.exit(1);
