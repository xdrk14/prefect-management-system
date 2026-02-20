const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const authDir = path.join(__dirname, '../public/auth');

// Options for maximum "unreadability"
const obfuscationOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    numbersToExpressions: true,
    simplify: true,
    stringArrayEncoding: ['base64'],
    splitStrings: true,
    splitStringsChunkLength: 3,
    unicodeEscapeSequence: true,
    // This makes it harder to debug/run in console
    debugProtection: true,
    debugProtectionInterval: 2000,
    disableConsoleOutput: false, // Keep logs for now but could disable
    identifierNamesGenerator: 'hexadecimal'
};

function obfuscateFiles() {
    console.log('🔒 Starting Auth Source Protection...');

    if (!fs.existsSync(authDir)) {
        console.error('Directory not found:', authDir);
        return;
    }

    const files = fs.readdirSync(authDir);

    files.forEach(file => {
        if (file.endsWith('.js') && !file.includes('.min.js')) {
            const filePath = path.join(authDir, file);
            const sourceCode = fs.readFileSync(filePath, 'utf8');

            console.log(`🛡️  Protecting: ${file}...`);

            const obfuscatedCode = JavaScriptObfuscator.obfuscate(
                sourceCode,
                obfuscationOptions
            ).getObfuscatedCode();

            fs.writeFileSync(filePath, obfuscatedCode);
            console.log(`✅ ${file} is now protected.`);
        }
    });

    console.log('\n✨ All authentication sources have been obfuscated and protected from casual inspection.');
}

obfuscateFiles();
