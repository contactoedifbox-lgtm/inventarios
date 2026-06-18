// build.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔨 Iniciando build...');

// Verificar que las variables de entorno existen
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Error: Faltan variables de entorno SUPABASE_URL o SUPABASE_ANON_KEY');
  console.error('Asegúrate de tener un archivo .env con las credenciales');
  process.exit(1);
}

// Leer el archivo app.js
const appJsPath = path.join(__dirname, 'trajes_sg', 'app.js');
let appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Reemplazar las credenciales
appJsContent = appJsContent.replace(
  /const SUPABASE_URL = '.*';/,
  `const SUPABASE_URL = '${process.env.SUPABASE_URL}';`
);

appJsContent = appJsContent.replace(
  /const SUPABASE_ANON_KEY = '.*';/,
  `const SUPABASE_ANON_KEY = '${process.env.SUPABASE_ANON_KEY}';`
);

// Guardar el archivo modificado
fs.writeFileSync(appJsPath, appJsContent);

console.log('✅ Build completado - Credenciales inyectadas correctamente');
