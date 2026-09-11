const fs = require('fs');
const path = require('path');
const { generateImageAsync } = require('@expo/image-utils');

const projectRoot = path.resolve(__dirname, '..');
const iconSrc = path.join(projectRoot, 'assets', 'icon.jpeg');
const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');

const sizes = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

async function main() {
  console.log('Generando iconos nativos de Android desde:', iconSrc);

  for (const { folder, size } of sizes) {
    const targetFolder = path.join(resDir, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const { source: buffer } = await generateImageAsync(
      { projectRoot },
      {
        src: iconSrc,
        width: size,
        height: size,
        resizeMode: 'cover',
        backgroundColor: '#ffffff',
      }
    );

    const files = ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'];
    for (const file of files) {
      const targetPath = path.join(targetFolder, file);
      fs.writeFileSync(targetPath, buffer);
      console.log(`Generado: ${folder}/${file} (${size}x${size})`);
    }
  }

  console.log('¡Iconos Android generados exitosamente!');
}

main().catch((err) => {
  console.error('Error generando iconos:', err);
  process.exit(1);
});