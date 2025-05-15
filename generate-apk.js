// generate-apk.js
const { execSync } = require('child_process');

console.log('🚀 Iniciando geração do APK para CurriculoBot Premium...');

// Verificar se eas-cli está instalado
try {
  execSync('eas --version');
  console.log('✅ EAS CLI encontrado!');
} catch (error) {
  console.log('⚠️ EAS CLI não encontrado. Instalando...');
  execSync('npm install -g eas-cli');
}

// Configurar o projeto para build
console.log('📝 Configurando projeto para build...');

// Criar eas.json
const easConfig = {
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
};

const fs = require('fs');
fs.writeFileSync('eas.json', JSON.stringify(easConfig, null, 2));
console.log('✅ Arquivo eas.json criado!');

// Verificar login no Expo
console.log('🔑 Verificando login no Expo...');
try {
  execSync('eas whoami');
  console.log('✅ Usuário já está logado no Expo!');
} catch (error) {
  console.log('⚠️ Necessário fazer login no Expo...');
  execSync('eas login', { stdio: 'inherit' });
}

// Iniciar o build
console.log('🏗️ Iniciando build do APK...');
execSync('eas build -p android --profile preview', { stdio: 'inherit' });

console.log('🎉 Processo de build iniciado!');
console.log('ℹ️ Quando o build for concluído, você receberá um link para download do APK.');