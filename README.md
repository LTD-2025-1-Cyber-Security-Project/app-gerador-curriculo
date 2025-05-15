# CurriculoBot - Assistente Inteligente para Criação e Análise de Currículos
![alt text](<images/Captura de Tela 2025-05-14 às 12.30.19.png>)

**CurriculoBot** é um aplicativo móvel completo que ajuda usuários a criar, gerenciar e analisar currículos profissionais de forma intuitiva, utilizando Inteligência Artificial para gerar feedback personalizado.

## 📱 Visão Geral

O CurriculoBot transforma a experiência de criação de currículos através de uma interface conversacional (chatbot) que guia o usuário em cada etapa do processo. Além de criar o currículo, o aplicativo oferece análises detalhadas utilizando múltiplos modelos de IA para identificar pontos fortes, sugerir melhorias e recomendar oportunidades de carreira personalizadas.

## ✨ Principais Funcionalidades

- **Criação conversacional de currículos**: Interface de chat para criar seu currículo passo a passo
- **Gerenciamento de múltiplos currículos**: Salve, visualize e compartilhe diversos currículos
- **Análise de currículo por IA**: Receba feedback personalizado sobre seu currículo
- **Suporte a múltiplas IAs**: Escolha entre diferentes provedores de IA (Google Gemini, OpenAI, Claude, etc.)
- **Modo offline**: Funciona mesmo sem conexão com internet
- **Autenticação de usuários**: Sistema completo de login/cadastro
- **Visualização em tempo real**: Pré-visualização do currículo enquanto você o cria

## 🧠 Análises por IA

O aplicativo oferece 5 tipos de análise por IA:

1. **Pontuação**: Avaliação detalhada com notas para diferentes aspectos do currículo
2. **Melhorias**: Sugestões específicas para melhorar seu currículo
3. **Dicas**: Recomendações estratégicas para sua carreira
4. **Cursos**: Sugestões de cursos e certificações para complementar seu perfil
5. **Vagas**: Recomendações de tipos de vagas onde você teria boas chances

## 🔧 Tecnologias Utilizadas

- **React Native**: Framework para desenvolvimento móvel
- **Async Storage**: Armazenamento local de dados
- **React Navigation**: Gerenciamento de navegação entre telas
- **Axios**: Cliente HTTP para requisições a APIs
- **APIs de IA**: Integração com múltiplas plataformas de IA
- **React Native Markdown Display**: Renderização de conteúdo formatado

## 📋 Requisitos

- Node.js 14+
- npm ou yarn
- React Native CLI 
- Xcode (para iOS)
- Android Studio (para Android)
- Chaves API para provedores de IA (opcional)

## 🚀 Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/LTD-2025-1-Cyber-Security-Project/app-gerador-curriculo.git
   cd app-gerador-curriculo
   ```

2. Instale as dependências:
   ```bash
   npm install
   # ou
   yarn install
   ```

3. Instale os pods (iOS):
   ```bash
   cd ios && pod install && cd ..
   ```

4. Execute o projeto:
   ```bash
   # normal
   npx expo start --no-dev --minify
   
   # Para iOS
   npx react-native run-ios
   
   # Para Android
   npx react-native run-android
   ```

## 🔑 Configuração das APIs de IA

O CurriculoBot suporta múltiplos provedores de IA para análise de currículos. Para configurá-los:

1. **Google Gemini API**:
   - Obtenha uma chave em: https://ai.google.dev/tutorials/setup
   - Insira a chave na seção "Configurar IAs" do aplicativo

2. **OpenAI/ChatGPT**:
   - Obtenha uma chave em: https://platform.openai.com/api-keys
   - Insira a chave na seção "Configurar IAs" do aplicativo

3. **Claude (Anthropic)**:
   - Obtenha uma chave em: https://console.anthropic.com/settings/keys
   - Insira a chave na seção "Configurar IAs" do aplicativo

4. **Perplexity AI**:
   - Obtenha uma chave em: https://www.perplexity.ai/settings/api
   - Insira a chave na seção "Configurar IAs" do aplicativo

## 📲 Fluxo de Usuário

### Login e Registro
- Tela de splash ao iniciar o aplicativo
- Login com email e senha
- Opção de criar nova conta

### Tela Inicial (Home)
- Dashboard com acesso a todas as funcionalidades
- Atalhos para criar currículo, analisar com IA e gerenciar currículos existentes

### Criação de Currículo (Chatbot)
1. Conversa interativa guiando o usuário em cada etapa
2. Coleta de informações pessoais (nome, email, endereço)
3. Informações profissionais (experiências, formação, habilidades)
4. Pré-visualização em tempo real
5. Salvar e acessar o currículo posteriormente

### Gerenciamento de Currículos
- Visualizar todos os currículos salvos
- Compartilhar currículos
- Excluir currículos
- Acessar análise de cada currículo

### Análise de Currículo com IA
- Selecionar currículo para análise
- Escolher tipo de análise (pontuação, melhorias, dicas, cursos, vagas)
- Selecionar provedor de IA preferido
- Visualizar análise formatada
- Compartilhar resultados da análise

### Configuração de IAs
- Gerenciar provedores de IA
- Configurar chaves de API
- Definir IA padrão

## 🧩 Estrutura das Pastas

```
app-gerador-curriculo/
├── App.js                # Componente principal do aplicativo
├── README.md             # Documentação do projeto
├── app.json              # Configuração do expo/react-native
├── assets/               # Recursos estáticos (fontes, etc.)
├── docs/                 # Documentação adicional
├── eas.json              # Configuração do EAS Build (Expo)
├── generate-apk.js       # Script para gerar APK
├── images/               # Imagens e recursos visuais
├── index.js              # Ponto de entrada do aplicativo
├── node_modules/         # Dependências instaladas
├── package-lock.json     # Versões exatas das dependências
└── package.json          # Dependências e scripts do projeto
```

## 📱 Detalhes das Telas

### Tela de Login/Registro
- Autenticação de usuários
- Armazenamento local de credenciais
- Validação de formulários

### Home
- Dashboard com cards para cada funcionalidade principal
- Acesso a criação, visualização e análise de currículos
- Botão de logout

### Chatbot (Criação de Currículo)
- Interface conversacional
- Sugestões e opções predefinidas
- Preenchimento intuitivo de seções do currículo
- Visualização em tempo real

### Meus Currículos
- Lista de currículos salvos
- Ações: visualizar, analisar, excluir
- Data de criação e informações básicas

### Visualização de Currículo
- Layout profissional do currículo
- Opções para compartilhar
- Acesso direto à análise

### Análise de Currículo
- Seleção de tipo de análise
- Escolha de IA para realizar a análise
- Resultados formatados em estilo profissional
- Toggle para modo offline

### Configuração de IAs
- Lista de provedores disponíveis
- Interface para adicionar chaves de API
- Seleção de IA padrão

## 🔧 Funcionalidades Técnicas

### Sistema de Cache para Análises
O aplicativo armazena análises já realizadas para evitar chamadas repetidas às APIs, economizando recursos e permitindo o acesso offline às análises anteriores.

### Retry e Fallback System
Implementação robusta para lidar com falhas de API:
- Sistema de retry com backoff exponencial
- Tentativa de múltiplos endpoints e formatos de API
- Fallback para outros provedores de IA
- Modo offline como último recurso

### Formatação de Markdown
Visualização formatada de análises usando renderização markdown para melhor experiência de usuário.

### Gerenciamento de Estado
- Contexto de autenticação para gerenciar sessões de usuário
- Estados locais para UI responsiva
- AsyncStorage para persistência de dados

## 🐛 Resolução de Problemas

### API Key Inválida
Se encontrar erros de autenticação com as APIs de IA, verifique:
- Se a chave API foi inserida corretamente
- Se a chave ainda é válida (não expirou)
- Se você tem créditos suficientes na plataforma da IA

### Erro 404 no Google Gemini
O endpoint da API Gemini pode mudar. O aplicativo tenta múltiplos endpoints, mas se continuar enfrentando problemas:
- Verifique a documentação mais recente do Gemini API
- Atualize para a versão mais recente do aplicativo
- Use outra IA temporariamente

### Modo Offline
Se estiver sem conexão, o aplicativo automaticamente usará:
- Análises em cache de solicitações anteriores
- Analisador local para gerar feedback básico
- Você pode forçar o modo offline através da interface

## 🌐 Integração de Novas IAs

Para adicionar um novo provedor de IA, siga estes passos:

1. Adicione uma nova entrada na constante `IA_APIS`
2. Implemente o caso correspondente na função `chamarIAAPI`
3. Adicione a função de obtenção da fonte da API key em `getApiKeySourceForIA`

## 🔮 Desenvolvimentos Futuros

- **Templates de currículo**: Modelos predefinidos para diferentes setores
- **Exportação para PDF/DOCX**: Salvar currículo em formatos profissionais
- **Sincronização na nuvem**: Backup de currículos em serviços na nuvem
- **Marketplace de análises**: Acesso a análises especializadas por setor
- **Integração com plataformas de emprego**: Envio direto para sites de vagas

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.

## 👥 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua funcionalidade (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📞 Suporte
Para reportar bugs ou solicitar funcionalidades, utilize a seção de Issues do repositório.

---

Desenvolvido com ❤️ usando React Native.
