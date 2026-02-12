const fs = require('fs');
const path = require('path');
const glob = require('glob');

function removeComments(content) {
  let result = '';
  let i = 0;
  let inString = false;
  let stringChar = '';
  let inRegex = false;

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (!inString && !inRegex) {
      if ((char === '"' || char === "'" || char === '`') && content[i - 1] !== '\\') {
        inString = true;
        stringChar = char;
        result += char;
        i++;
        continue;
      }

      if (char === '/' && nextChar === '/') {
        let j = i + 2;
        while (j < content.length && content[j] !== '\n') {
          j++;
        }
        i = j;
        continue;
      }

      if (char === '/' && nextChar === '*') {
        let j = i + 2;
        while (j < content.length - 1) {
          if (content[j] === '*' && content[j + 1] === '/') {
            i = j + 2;
            break;
          }
          j++;
        }
        if (j >= content.length - 1) {
          i = content.length;
        }
        continue;
      }
    } else if (inString) {
      result += char;
      if (char === stringChar && content[i - 1] !== '\\') {
        inString = false;
      }
      i++;
      continue;
    }

    result += char;
    i++;
  }

  return result;
}

function processFiles() {
  const patterns = [
    'src/**/*.{ts,tsx}',
    'electron/**/*.{js,cjs}',
    '*.{ts,cjs,js}'
  ];

  const files = [];
  patterns.forEach(pattern => {
    const matches = glob.sync(pattern, { cwd: __dirname });
    files.push(...matches);
  });

  const uniqueFiles = [...new Set(files)];

  uniqueFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const cleaned = removeComments(content);
      fs.writeFileSync(filePath, cleaned, 'utf-8');
      console.log(`✓ ${file}`);
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`);
    }
  });

  console.log(`\nProcessed ${uniqueFiles.length} files`);
}

processFiles();
