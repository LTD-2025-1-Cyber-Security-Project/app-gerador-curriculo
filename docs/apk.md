# Guia Completo: Gerando APK e Publicando o CurriculoBot na Google Play Store

Este guia cobre o processo completo de preparação, geração e publicação do aplicativo CurriculoBot Premium para a Play Store, desde a configuração do projeto até o lançamento e atualizações.

**Índice:**
- [1. Pré-requisitos](#1-pré-requisitos)
- [2. Preparação do Projeto](#2-preparação-do-projeto)
- [3. Gerando APK para Testes](#3-gerando-apk-para-testes)
- [4. Configuração da Conta na Play Store](#4-configuração-da-conta-na-play-store)
- [5. Publicação na Google Play Store](#5-publicação-na-google-play-store)
- [6. Atualizações do Aplicativo](#6-atualizações-do-aplicativo)
- [7. Solução de Problemas](#7-solução-de-problemas)
- [8. Recursos Adicionais](#8-recursos-adicionais)

## 1. Pré-requisitos

### 1.1. Requisitos de Ambiente
- Node.js (versão 14 ou superior)
- npm (versão 6 ou superior)
- Conta no Expo (https://expo.dev/)
- Conta Google Play Developer ($25 USD taxa única)
- Git (opcional, mas recomendado)

### 1.2. Instalação do EAS CLI
```bash
# Instalar EAS CLI globalmente
npm install -g eas-cli

# Verificar instalação
eas --version
```

### 1.3. Login no Expo
```bash
eas login
```

## 2. Preparação do Projeto

### 2.1. Configuração do app.json
Certifique-se de que seu arquivo `app.json` contém todas as informações necessárias:

```json
{
  "expo": {
    "name": "CurriculoBot Premium",
    "slug": "curriculobot-premium",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#00BCD4"
    },
    "updates": {
      "fallbackToCacheTimeout": 0
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.sua_empresa.curriculobotpremium"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#00BCD4"
      },
      "package": "com.sua_empresa.curriculobotpremium",
      "versionCode": 1,
      "permissions": []
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "seu-id-de-projeto-expo"
      }
    }
  }
}
```

> **Importante:** Substitua `com.sua_empresa.curriculobotpremium` por um identificador único para seu aplicativo. O padrão é `com.nome_da_empresa.nome_do_app` em minúsculas e sem caracteres especiais.

### 2.2. Criar arquivos de ícones e splash
Os ícones do aplicativo e da tela de splash devem estar no local correto:

```
assets/
  ├── icon.png (1024×1024 px)
  ├── splash.png (2048×2048 px)
  ├── adaptive-icon.png (1024×1024 px)
  └── favicon.png (48×48 px)
```

> **Dica:** Você pode usar ferramentas como o [Canva](https://www.canva.com/) ou [Adobe Express](https://www.adobe.com/express/) para criar esses arquivos.

### 2.3. Configurar o eas.json
Crie um arquivo `eas.json` na raiz do projeto:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "track": "production"
      }
    }
  }
}
```

### 2.4. Inicializar EAS Build (opcional)
Executar o comando para inicializar a configuração de build (pode substituir alguns arquivos):

```bash
eas build:configure
```

## 3. Gerando APK para Testes

### 3.1. Criar um Build de Teste (APK)
Este build pode ser instalado diretamente em dispositivos Android para teste:

```bash
eas build -p android --profile preview
```

Este comando inicia o processo de build na nuvem da Expo e não requer ferramentas de desenvolvimento Android locais. O processo pode demorar alguns minutos. 

Ao finalizar, você receberá um link para baixar o APK. Este arquivo pode ser compartilhado diretamente com testadores.

### 3.2. Testar o APK
Antes de publicar na Play Store:
- Teste o APK em diferentes dispositivos Android
- Verifique todas as funcionalidades
- Teste em diferentes tamanhos de tela
- Verifique o desempenho e uso de memória

## 4. Configuração da Conta na Play Store

### 4.1. Criar Conta de Desenvolvedor
1. Acesse o [Google Play Console](https://play.google.com/console/signup)
2. Faça login com sua conta Google
3. Pague a taxa única de $25 USD
4. Complete as informações do perfil de desenvolvedor:
   - Nome do desenvolvedor (aparecerá na Play Store)
   - Informações de contato
   - Endereço físico

### 4.2. Preparar Materiais de Marketing
Prepare os seguintes itens necessários para a publicação:

| Item | Especificações | Notas |
|------|----------------|-------|
| Ícone de alta resolução | 512×512 px (32-bit PNG) | Será exibido na Play Store |
| Feature Graphic | 1024×500 px (JPG/PNG) | Imagem de destaque no topo da listagem |
| Screenshots | Min. 2, Max. 8 (JPG/PNG) | Screenshots do aplicativo em uso |
| Vídeo promocional | Link YouTube (opcional) | Demonstração do aplicativo |
| Descrição curta | 80 caracteres máx. | Resumo do aplicativo |
| Descrição completa | 4000 caracteres máx. | Detalhes do aplicativo |
| Política de privacidade | URL | Obrigatório para todos os apps |

### 4.3. Criar Política de Privacidade
Uma política de privacidade é **obrigatória** para todos os aplicativos na Play Store. Ela deve incluir:

- Quais dados pessoais são coletados
- Como os dados são usados
- Se os dados são compartilhados com terceiros
- Direitos do usuário sobre seus dados
- Informações de contato

> **Dica:** Você pode hospedar sua política de privacidade em um serviço gratuito como [GitHub Pages](https://pages.github.com/), [Netlify](https://www.netlify.com/) ou [Vercel](https://vercel.com/).

## 5. Publicação na Google Play Store

### 5.1. Criar APP na Play Console
1. Acesse o [Google Play Console](https://play.google.com/console/)
2. Clique em "Criar app"
3. Preencha as informações iniciais:
   - Nome do aplicativo
   - Idioma padrão
   - Tipo de aplicativo (App ou Game)
   - Gratuito ou Pago
   - Declaração de conteúdo confidencial

### 5.2. Configurar a Página da Play Store
Configure todas as seções da ficha do aplicativo:

1. **Ficha da Play Store**
   - Nome do aplicativo
   - Descrição curta
   - Descrição completa
   - Ícone
   - Feature Graphic
   - Screenshots
   - Categoria do aplicativo
   - Tags (palavras-chave)
   - URL da política de privacidade

2. **Classificação de Conteúdo**
   - Preencher o questionário de classificação
   - Solicitar classificação

3. **Declarações do App**
   - Informar qualquer anúncio ou compra no aplicativo
   - Declarar conformidade com regulamentos

4. **Configurações do APP**
   - Android App Bundle (configuração avançada)
   - Controle de países para distribuição

### 5.3. Gerar o Bundle para Produção
Este é o formato preferido pela Google Play Store:

```bash
eas build -p android --profile production
```

O processo irá gerar um arquivo `.aab` (Android App Bundle).

### 5.4. Criar Lançamento
1. Na Play Console, navegue até Produção > Versões
2. Clique em "Criar nova versão"
3. Faça upload do arquivo `.aab` gerado
4. Preencha as notas da versão (O que há de novo?)
5. Revise e iniciar o lançamento

### 5.5. Processo de Revisão
- A Google revisará seu aplicativo (geralmente 1-3 dias)
- Você receberá notificações por e-mail sobre o status
- Se aprovado, seu aplicativo estará disponível na Play Store

## 6. Atualizações do Aplicativo

### 6.1. Preparar Atualização
1. Faça suas modificações no código do aplicativo
2. Atualize a versão no arquivo `app.json`:
   ```json
   {
     "expo": {
       "version": "1.0.1",
       "android": {
         "versionCode": 2
       }
     }
   }
   ```
   > **Importante:** `versionCode` deve ser incrementado sequencialmente para cada atualização (1, 2, 3, etc.)

### 6.2. Gerar Nova Versão do Bundle
```bash
eas build -p android --profile production
```

### 6.3. Publicar Atualização
1. Na Play Console, crie uma nova versão
2. Faça upload do novo `.aab`
3. Preencha as notas da versão
4. Envie para revisão

## 7. Solução de Problemas

### 7.1. Erros comuns na geração do APK/AAB

| Erro | Solução |
|------|---------|
| "Failed to install the app" | Verifique se o `app.json` está configurado corretamente |
| "Failed to compile resources" | Verifique se os arquivos de recursos (ícones, splash) estão no formato correto |
| "Error: Command failed: gradlew" | Problema com o Gradle. Tente limpar o cache (`expo r -c`) |
| "Keystore error" | Problema com a keystore. Reconfigure com `eas credentials` |
| "versionCode not incremented" | Certifique-se de incrementar o `versionCode` para atualizações |

### 7.2. Erros comuns na Play Store

| Erro | Solução |
|------|---------|
| "App doesn't comply with Families policy" | Revise a classificação de conteúdo |
| "Violation of Privacy Policy Requirements" | Atualize sua política de privacidade |
| "Your app currently targets API level XX" | Atualize suas configurações de SDK no `app.json` |
| "Your app contains deceptive ads" | Remova ou modifique os anúncios problemáticos |
| "Missing prominent disclosure" | Adicione divulgações sobre coleta de dados |

## 8. Recursos Adicionais

### 8.1. Ferramentas Úteis
- [Expo Image Maker](https://expo.github.io/image-maker/) - Gera automaticamente ícones e splash screens
- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/) - Cria ícones adaptáveis
- [App Privacy Policy Generator](https://app-privacy-policy-generator.firebaseapp.com/) - Gera política de privacidade

### 8.2. Documentações Oficiais
- [Documentação do Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [Documentação da Google Play](https://developer.android.com/distribute/console)
- [Políticas do Desenvolvedor Google Play](https://play.google.com/about/developer-content-policy/)

### 8.3. Script para Automação da Geração de APK
Você pode criar um script para automatizar o processo de geração de APK.

Crie um arquivo `generate-apk.js`:

```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

console.log(`${colors.blue}🚀 Iniciando geração do APK para CurriculoBot Premium...${colors.reset}`);

// Verificar se eas-cli está instalado
try {
  execSync('eas --version');
  console.log(`${colors.green}✅ EAS CLI encontrado!${colors.reset}`);
} catch (error) {
  console.log(`${colors.yellow}⚠️ EAS CLI não encontrado. Instalando...${colors.reset}`);
  execSync('npm install -g eas-cli');
}

// Verificar se app.json e eas.json existem
if (!fs.existsSync('app.json')) {
  console.log(`${colors.red}❌ app.json não encontrado. Abortando.${colors.reset}`);
  process.exit(1);
}

// Criar eas.json se não existir
if (!fs.existsSync('eas.json')) {
  console.log(`${colors.yellow}⚠️ eas.json não encontrado. Criando...${colors.reset}`);
  
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
  
  fs.writeFileSync('eas.json', JSON.stringify(easConfig, null, 2));
  console.log(`${colors.green}✅ Arquivo eas.json criado!${colors.reset}`);
}

// Verificar login no Expo
console.log(`${colors.blue}🔑 Verificando login no Expo...${colors.reset}`);
try {
  execSync('eas whoami');
  console.log(`${colors.green}✅ Usuário já está logado no Expo!${colors.reset}`);
} catch (error) {
  console.log(`${colors.yellow}⚠️ Necessário fazer login no Expo...${colors.reset}`);
  execSync('eas login', { stdio: 'inherit' });
}

// Perguntar qual tipo de build fazer
console.log(`${colors.blue}📦 Qual tipo de build deseja fazer?${colors.reset}`);
console.log(`${colors.yellow}1) APK para teste (preview)${colors.reset}`);
console.log(`${colors.yellow}2) AAB para Google Play (production)${colors.reset}`);

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Escolha (1 ou 2): ', async (choice) => {
  readline.close();
  
  if (choice === '1') {
    console.log(`${colors.blue}🏗️ Iniciando build do APK para testes...${colors.reset}`);
    execSync('eas build -p android --profile preview', { stdio: 'inherit' });
  } else if (choice === '2') {
    console.log(`${colors.blue}🏗️ Iniciando build do AAB para Google Play...${colors.reset}`);
    execSync('eas build -p android --profile production', { stdio: 'inherit' });
  } else {
    console.log(`${colors.red}❌ Opção inválida. Abortando.${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.green}🎉 Processo de build iniciado!${colors.reset}`);
  console.log(`${colors.blue}ℹ️ Quando o build for concluído, você receberá um link para download.${colors.reset}`);
});
```

Para executar o script:
```bash
node generate-apk.js
```

### 8.4. Checklist Final antes da Publicação
- [ ] Aplicativo testado em múltiplos dispositivos
- [ ] Todos os crashes e bugs conhecidos corrigidos
- [ ] Política de privacidade criada e hospedada
- [ ] Materiais de marketing preparados
- [ ] Informações do aplicativo completas
- [ ] versionCode e version corretos
- [ ] Arquivo AAB gerado corretamente
- [ ] Requisitos da Google Play atendidos

## Notas Finais

Este guia fornece todos os passos necessários para gerar um APK e publicar seu aplicativo CurriculoBot Premium na Google Play Store. Siga cada etapa cuidadosamente e mantenha seu aplicativo atualizado para garantir uma boa experiência do usuário.

A publicação na loja de aplicativos é um processo contínuo. Depois que seu aplicativo for publicado, continue monitorando seu desempenho, coletando feedback dos usuários e lançando atualizações para melhorar a experiência.