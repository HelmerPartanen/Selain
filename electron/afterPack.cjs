const fs = require('fs');
const path = require('path');

/**
 * afterPack hook for electron-builder.
 * Removes unnecessary locales and files to reduce the final build size.
 */
exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir;

  // Remove unnecessary Electron locales (keep only English)
  const keepLocales = (process.env.KEEP_LOCALES || 'en-US').split(',').map(l => l.trim());
  const localesDir = path.join(appOutDir, 'locales');

  if (fs.existsSync(localesDir)) {
    const files = fs.readdirSync(localesDir);
    for (const file of files) {
      const locale = file.replace('.pak', '');
      if (!keepLocales.includes(locale)) {
        fs.unlinkSync(path.join(localesDir, file));
      }
    }
  }

  console.log('afterPack: cleaned up locales');
};
