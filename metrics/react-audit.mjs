import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * React Performance & Hook Audit
 * 
 * This metric identifies potential performance bottlenecks and "Effect Hell".
 * High numbers of useEffect or deep component trees lead to sluggish UI.
 */

const CONFIG = {
    ignoreDirs: new Set(['node_modules', '.git', 'dist', 'build', '.expo', 'ios', 'android']),
    extensions: new Set(['.tsx', '.jsx']), 
};

const results = [];

async function analyzeReactFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    
    const stats = {
        file: path.relative(process.cwd(), filePath),
        hooks: {
            useState: (content.match(/useState/g) || []).length,
            useEffect: (content.match(/useEffect/g) || []).length,
            useMemo: (content.match(/useMemo/g) || []).length,
            useCallback: (content.match(/useCallback/g) || []).length,
        },
        imports: (content.match(/^import /gm) || []).length,
        totalHooks: 0
    };

    stats.totalHooks = stats.hooks.useState + stats.hooks.useEffect + stats.hooks.useMemo + stats.hooks.useCallback;

    if (stats.totalHooks > 0 || stats.imports > 10) {
        results.push(stats);
    }
}

async function walk(dir) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
        if (CONFIG.ignoreDirs.has(file.name)) continue;
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            await walk(fullPath);
        } else if (CONFIG.extensions.has(path.extname(file.name))) {
            await analyzeReactFile(fullPath);
        }
    }
}

async function run() {
    console.log(`\n\x1b[34m>>> React Performance & Hook Audit <<<\x1b[0m\n`);
    await walk(process.cwd());

    // 1. Hook Heavyweights
    console.log(`\x1b[1m[1] Hook Heavyweights (Stateful Complexity)\x1b[0m`);
    const heavyHooks = results
        .sort((a, b) => b.totalHooks - a.totalHooks)
        .slice(0, 5);
    
    heavyHooks.forEach(r => {
        console.log(`- ${r.file.padEnd(50)} (\x1b[33m${r.totalHooks} hooks\x1b[0m: S:${r.hooks.useState} E:${r.hooks.useEffect} M:${r.hooks.useMemo})`);
    });
    console.log('');

    // 2. Dependency Density (Import count)
    console.log(`\x1b[1m[2] Dependency Density (Coupling Risk)\x1b[0m`);
    const highCoupling = results
        .sort((a, b) => b.imports - a.imports)
        .slice(0, 5);

    highCoupling.forEach(r => {
        console.log(`- ${r.file.padEnd(50)} (\x1b[31m${r.imports} imports\x1b[0m)`);
    });

    // 3. Effect Warning
    const effectHell = results.filter(r => r.hooks.useEffect > 3);
    if (effectHell.length > 0) {
        console.log(`\n\x1b[41m WARNING \x1b[0m Detected \x1b[1m${effectHell.length}\x1b[0m files with "Effect Hell" (>3 useEffects).`);
        effectHell.slice(0, 3).forEach(r => console.log(`  ! ${r.file} (${r.hooks.useEffect} effects)`));
    }

    console.log(`\n\x1b[32mAnalyzed ${results.length} React components.\x1b[0m\n`);
}

run().catch(console.error);
