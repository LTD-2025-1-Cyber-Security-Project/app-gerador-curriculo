const IA_APIS = {
  GEMINI: {
    nome: 'Google Gemini',
    chaveNecessaria: true,
    chaveDefault: 'AIzaSyDCAepi3dUF78ef0-735Z6g1occ31fF7Pg', // Nova API key padrão
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
  },
  OPENAI: {
    nome: 'ChatGPT',
    chaveNecessaria: true,
    chaveDefault: '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',
    endpoint: 'https://api.openai.com/v1/chat/completions'
  },
  CLAUDE: {
    nome: 'Claude',
    chaveNecessaria: true,
    chaveDefault: '',
    endpoint: 'https://api.anthropic.com/v1/messages'
  },
  PERPLEXITY: {
    nome: 'Perplexity',
    chaveNecessaria: true,
    chaveDefault: '',
    endpoint: 'https://api.perplexity.ai/chat/completions'
  },
  BING: {
    nome: 'Bing AI',
    chaveNecessaria: true,
    chaveDefault: '',
    endpoint: 'https://api.bing.microsoft.com/v7.0/search'
  },
  DEEPSEEK: {
    nome: 'DeepSeek',
    chaveNecessaria: true,
    chaveDefault: '',
    endpoint: 'https://api.deepseek.com/v1/chat/completions'
  },
  BLACKBOX: {
    nome: 'Blackbox AI',
    chaveNecessaria: true,
    chaveDefault: '',
    endpoint: 'https://api.useblackbox.io/v1/chat/completions'
  },
  GROK: {
    nome: 'Grok',
    chaveNecessaria: true,
    chaveDefault: '',
    endpoint: 'https://api.grok.x.ai/v1/chat/completions'
  },
  OFFLINE: {
    nome: 'Modo Offline',
    chaveNecessaria: false,
    offline: true
  }
};

export default IA_APIS;