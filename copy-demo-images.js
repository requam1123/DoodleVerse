const fs = require('fs');
const path = require('path');

const srcDir = '/Users/quam1123/.gemini/antigravity-cli/brain/9b7a75ec-7cee-45ab-a3d9-213ea3fbce8d';
const destDir = '/Users/quam1123/DO/cb/public/demo';

const files = [
  { src: 'claymation_style_1779514271193.png', dest: 'claymation.png' },
  { src: 'woolfelt_style_1779514292394.png', dest: 'woolfelt.png' },
  { src: 'crayon_style_1779514313486.png', dest: 'crayon.png' }
];

files.forEach(f => {
  const srcPath = path.join(srcDir, f.src);
  const destPath = path.join(destDir, f.dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${f.src} to ${f.dest}`);
  } else {
    console.error(`Source file not found: ${srcPath}`);
  }
});
