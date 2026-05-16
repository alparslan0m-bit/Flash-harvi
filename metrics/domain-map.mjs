import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Codebase Domain & Feature Mapper
 * 
 * This tool provides a high-level "Map" of your application.
 * It identifies core domains (Auth, Quiz, Stats, etc.) and measures their relative weight.
 */

const CONFIG = {
    ignoreDirs: new Set(['node_modules', '.git', 'dist', 'build', '.expo', 'ios', 'android']),
    rootDirs: ['artifacts/mobile/app', 'artifacts/mobile/components', 'artifacts/mobile/hooks'],
    extensions: new Set(['.tsx', '.ts', '.jsx', '.js']),
};

const domains = {};

async function analyzeFile(filePath, domainName, type) {
    const content = await fs.readFile(filePath, 'utf-8');
    const loc = content.split(/\r?\n/).filter(line => line.trim()).length;

    if (!domains[domainName]) {
        domains[domainName] = { files: 0, loc: 0, types: { app: 0, components: 0, hooks: 0 } };
    }

    domains[domainName].files++;
    domains[domainName].loc += loc;
    domains[domainName].types[type]++;
}

async function walk(dir, domainName = 'root', type = 'other') {
    const files = await fs.readdir(dir, { withFileTypes: true });
    
    for (const file of files) {
        if (CONFIG.ignoreDirs.has(file.name)) continue;
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
            // If we are at a root level, the next directory is the domain name
            let nextDomain = domainName;
            if (domainName === 'root') {
                nextDomain = file.name;
            }
            await walk(fullPath, nextDomain, type);
        } else if (CONFIG.extensions.has(path.extname(file.name))) {
            await analyzeFile(fullPath, domainName, type);
        }
    }
}

async function run() {
    console.log(`\n\x1b[32m>>> Codebase Domain & Feature Map <<<\x1b[0m\n`);

    for (const root of CONFIG.rootDirs) {
        const type = root.split('/').pop(); // 'app', 'components', or 'hooks'
        const fullRootPath = path.join(process.cwd(), root);
        try {
            await walk(fullRootPath, 'root', type);
        } catch (e) {
            // Root might not exist, skip
        }
    }

    const sortedDomains = Object.entries(domains)
        .sort((a, b) => b[1].loc - a[1].loc);

    const totalLOC = sortedDomains.reduce((acc, d) => acc + d[1].loc, 0);

    console.log(`${'Domain'.padEnd(20)} | ${'Files'.padStart(6)} | ${'LOC'.padStart(8)} | ${'Weight'.padStart(8)} | ${'Structure (A/C/H)'.padStart(18)}`);
    console.log('---------------------------------------------------------------------------------------');

    for (const [name, stats] of sortedDomains) {
        const weight = ((stats.loc / totalLOC) * 100).toFixed(1) + '%';
        const structure = `${stats.types.app}/${stats.types.components}/${stats.types.hooks}`;
        console.log(`${name.padEnd(20)} | ${String(stats.files).padStart(6)} | ${String(stats.loc).padStart(8)} | ${weight.padStart(8)} | ${structure.padStart(18)}`);
    }

    console.log('---------------------------------------------------------------------------------------');
    console.log(`Total Mapped LOC: ${totalLOC}\n`);
    console.log(`\x1b[1mKey Interpretations:\x1b[0m`);
    
    if (sortedDomains.length > 0) {
        const lead = sortedDomains[0];
        console.log(`- \x1b[36m${lead[0]}\x1b[0m is your largest domain, accounting for \x1b[1m${((lead[1].loc / totalLOC) * 100).toFixed(1)}%\x1b[0m of your app logic.`);
        
        const hooksRatio = sortedDomains.filter(d => d[1].types.hooks > 0).length / sortedDomains.length;
        if (hooksRatio < 0.3) {
            console.log(`- \x1b[33mRecommendation:\x1b[0m Low Hook-to-Component ratio. Consider abstracting more logic into custom hooks.`);
        }
    }
}

run().catch(console.error);
