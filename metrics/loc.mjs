import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Senior Codebase LOC Analyzer
 */

const CONFIG = {
    ignoreDirs: new Set(['node_modules', '.git', 'dist', 'build', '.expo', 'ios', 'android', 'coverage']),
    ignoreFiles: new Set(['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock']),
    extensions: new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.html', '.md', '.json', '.yaml', '.yml']),
};

const stats = {};

function initStatsForExt(ext) {
    if (!stats[ext]) {
        stats[ext] = { files: 0, total: 0, code: 0, comment: 0, blank: 0 };
    }
}

async function analyzeFile(filePath, ext) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split(/\r?\n/);
        initStatsForExt(ext);
        const s = stats[ext];
        s.files++;
        s.total += lines.length;
        let inBlockComment = false;
        for (let line of lines) {
            const trimmed = line.trim();
            if (!trimmed) { s.blank++; continue; }
            if (['.js', '.jsx', '.ts', '.tsx', '.css'].includes(ext)) {
                if (inBlockComment) { s.comment++; if (trimmed.includes('*/')) inBlockComment = false; continue; }
                if (trimmed.startsWith('/*')) { s.comment++; if (!trimmed.includes('*/')) inBlockComment = true; continue; }
                if (trimmed.startsWith('//')) { s.comment++; continue; }
            }
            if (['.yaml', '.yml', '.sh', '.py'].includes(ext)) { if (trimmed.startsWith('#')) { s.comment++; continue; } }
            if (['.html', '.md'].includes(ext)) { if (trimmed.startsWith('<!--')) { s.comment++; continue; } }
            s.code++;
        }
    } catch (err) {}
}

async function walk(dir) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
        if (CONFIG.ignoreDirs.has(file.name)) continue;
        if (CONFIG.ignoreFiles.has(file.name)) continue;
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) { await walk(fullPath); }
        else {
            const ext = path.extname(file.name).toLowerCase();
            if (CONFIG.extensions.has(ext)) await analyzeFile(fullPath, ext);
        }
    }
}

async function run() {
    console.log(`\n\x1b[36m>>> Metric 1: Volume (Lines of Code) <<<\x1b[0m`);
    await walk(process.cwd());
    const sortedExts = Object.keys(stats).sort((a, b) => stats[b].code - stats[a].code);
    console.log(`${'Ext'.padEnd(8)} | ${'Files'.padStart(6)} | ${'Code'.padStart(10)} | ${'Comments'.padStart(10)} | ${'Blanks'.padStart(8)} | ${'Total'.padStart(10)}`);
    console.log('--------------------------------------------------------------------------------');
    let total = { files: 0, code: 0, comment: 0, blank: 0, total: 0 };
    for (const ext of sortedExts) {
        const s = stats[ext];
        console.log(`${ext.padEnd(8)} | ${String(s.files).padStart(6)} | ${String(s.code).padStart(10)} | ${String(s.comment).padStart(10)} | ${String(s.blank).padStart(8)} | ${String(s.total).padStart(10)}`);
        total.files += s.files; total.code += s.code; total.comment += s.comment; total.blank += s.blank; total.total += s.total;
    }
    console.log('--------------------------------------------------------------------------------');
    console.log(`${'TOTAL'.padEnd(8)} | ${String(total.files).padStart(6)} | ${String(total.code).padStart(10)} | ${String(total.comment).padStart(10)} | ${String(total.blank).padStart(8)} | ${String(total.total).padStart(10)}\n`);
}

run().catch(console.error);
