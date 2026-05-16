import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Senior Codebase Quality & Complexity Analyzer
 */

const CONFIG = {
    ignoreDirs: new Set(['node_modules', '.git', 'dist', 'build', '.expo', 'ios', 'android']),
    ignoreFiles: new Set(['pnpm-lock.yaml', 'package-lock.json']),
    extensions: new Set(['.js', '.jsx', '.ts', '.tsx']),
    thresholds: { maxFileLOC: 300, maxDepth: 5 }
};

const metrics = {
    totalFiles: 0,
    techDebt: { todos: 0, fixmes: 0, hacks: 0 },
    complexity: { highComplexityFiles: [], largeFiles: [] }
};

async function analyzeFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    let fileLOC = 0;
    let maxDepth = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) continue;
        fileLOC++;
        const upperLine = line.toUpperCase();
        if (upperLine.includes('TODO')) metrics.techDebt.todos++;
        if (upperLine.includes('FIXME')) metrics.techDebt.fixmes++;
        if (upperLine.includes('HACK')) metrics.techDebt.hacks++;
        const indentation = line.match(/^(\s*)/)[0];
        const depth = indentation.replace(/\t/g, '    ').length / 4;
        if (depth > maxDepth) maxDepth = depth;
    }
    metrics.totalFiles++;
    const fileName = path.relative(process.cwd(), filePath);
    if (maxDepth > CONFIG.thresholds.maxDepth) metrics.complexity.highComplexityFiles.push({ file: fileName, depth: maxDepth });
    if (fileLOC > CONFIG.thresholds.maxFileLOC) metrics.complexity.largeFiles.push({ file: fileName, loc: fileLOC });
}

async function walk(dir) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
        if (CONFIG.ignoreDirs.has(file.name)) continue;
        if (CONFIG.ignoreFiles.has(file.name)) continue;
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) await walk(fullPath);
        else if (CONFIG.extensions.has(path.extname(file.name))) await analyzeFile(fullPath);
    }
}

async function run() {
    console.log(`\n\x1b[35m>>> Metric 2: Complexity & Debt <<<\x1b[0m`);
    await walk(process.cwd());
    console.log(`- TODOs:  ${metrics.techDebt.todos} | FIXMEs: ${metrics.techDebt.fixmes} | HACKs: ${metrics.techDebt.hacks}`);
    console.log(`\n\x1b[1mTop Refactoring Candidates:\x1b[0m`);
    metrics.complexity.largeFiles.sort((a, b) => b.loc - a.loc).slice(0, 3)
        .forEach(f => console.log(`- ${f.file.padEnd(50)} (\x1b[31m${f.loc} LOC\x1b[0m)`));
    console.log(`\n\x1b[1mDeepest Logic:\x1b[0m`);
    metrics.complexity.highComplexityFiles.sort((a, b) => b.depth - a.depth).slice(0, 3)
        .forEach(f => console.log(`- ${f.file.padEnd(50)} (\x1b[33mDepth: ${f.depth}\x1b[0m)`));
}

run().catch(console.error);
