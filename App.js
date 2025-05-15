import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Share,
  ActivityIndicator,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import axios from 'axios';

// Adicione no início do arquivo, junto com os imports
axios.interceptors.request.use(request => {
  console.log('Starting Request', JSON.stringify(request, null, 2));
  return request;
});

axios.interceptors.response.use(response => {
  console.log('Response:', JSON.stringify(response.status, null, 2));
  return response;
}, error => {
  console.log('Response Error:', error.message);
  console.log('Error Config:', JSON.stringify(error.config, null, 2));
  console.log('Error Data:', error.response?.data);
  return Promise.reject(error);
});

// Definição de cores e estilos globais
const Colors = {
  primary: '#00BCD4',
  secondary: '#3F51B5',
  dark: '#263238',
  light: '#ECEFF1',
  white: '#FFFFFF',
  lightText: '#757575',
  danger: '#F44336',
  success: '#4CAF50',
  warning: '#FFC107',
  info: '#2196F3',
  lightGray: '#f5f5f5',
  mediumGray: '#e0e0e0',
  divider: 'rgba(0, 0, 0, 0.1)'
};

// Constantes para APIs de IAs
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
    chaveDefault: '',
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

// Funções para gerenciar API keys das IAs
const getIAAPIKey = async (tipoIA) => {
  try {
    const savedKey = await AsyncStorage.getItem(`ia_api_key_${tipoIA}`);
    if (savedKey) return savedKey;
    return IA_APIS[tipoIA]?.chaveDefault || '';
  } catch (error) {
    console.error('Erro ao obter chave da API:', error);
    return IA_APIS[tipoIA]?.chaveDefault || '';
  }
};

const salvarIAAPIKey = async (tipoIA, apiKey) => {
  try {
    await AsyncStorage.setItem(`ia_api_key_${tipoIA}`, apiKey);
    return true;
  } catch (error) {
    console.error('Erro ao salvar chave da API:', error);
    return false;
  }
};

// Função auxiliar para obter fonte da API key
const getApiKeySourceForIA = async (tipoIA) => {
  switch (tipoIA) {
    // No caso do Gemini dentro da função chamarIAAPI
  case 'GEMINI':
  return await tentarComRetry(async () => {
    // Lista de modelos disponíveis em ordem de preferência
    const modelos = [
      'gemini-2.0-flash',       // Mais rápido, nova versão
      'gemini-2.0-pro',         // Mais capacidade, nova versão
      'gemini-1.5-flash',       // Fallback
      'gemini-1.5-pro',         // Fallback
      'gemini-pro'              // Versão original, para compatibilidade
    ];
    
    // Construir URLs para todos os modelos e versões da API
    const endpoints = [];
    
    // Adicionar endpoints v1beta (mais recentes)
    modelos.forEach(modelo => {
      endpoints.push(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`);
    });
    
    // Adicionar endpoints v1 (estáveis)
    modelos.forEach(modelo => {
      endpoints.push(`https://generativelanguage.googleapis.com/v1/models/${modelo}:generateContent?key=${apiKey}`);
    });
    
    let lastError = null;
    
    // Tentar cada endpoint até encontrar um que funcione
    for (const endpoint of endpoints) {
      try {
        console.log(`Tentando endpoint Gemini: ${endpoint}`);
        
        // Preparar requisição no formato correto conforme documentação
        const requestBody = {
          contents: [
            {
              parts: [
                { text: promptText }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
            topK: 40,
            topP: 0.95
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        };
        
        // Configurar requisição com headers adequados
        const config = {
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 15000
        };
        
        // Fazer a requisição
        const response = await axios.post(endpoint, requestBody, config);
        
        // Verificar resposta corretamente
        if (response.status === 200) {
          // Checar cada possível caminho de resposta (algumas APIs têm formatos ligeiramente diferentes)
          if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.log('Resposta do Gemini obtida via caminho normal');
            return response.data.candidates[0].content.parts[0].text;
          } 
          
          if (response.data?.candidates?.[0]?.output) {
            console.log('Resposta do Gemini obtida via caminho alternativo');
            return response.data.candidates[0].output;
          }
          
          if (response.data?.candidates?.[0]?.text) {
            console.log('Resposta do Gemini obtida via caminho simplificado');
            return response.data.candidates[0].text;
          }
          
          // Se chegamos aqui, encontramos um endpoint que funciona mas formato inesperado
          console.log('Formato de resposta inesperado do Gemini, mas status 200');
          console.log('Resposta completa:', JSON.stringify(response.data));
          
          // Tente extrair algum texto útil como fallback
          const respString = JSON.stringify(response.data);
          if (respString.length > 0) {
            return `Análise recebida em formato não reconhecido. Dados brutos: ${respString.substring(0, 500)}...`;
          }
        }
      } catch (error) {
        console.log(`Erro no endpoint ${endpoint}:`, error.message);
        if (error.response) {
          console.log('Detalhes do erro:', error.response.status, error.response.data);
        }
        lastError = error;
        // Continue tentando o próximo endpoint
      }
    }
    
    // Se chegou aqui, nenhum endpoint funcionou
    throw lastError || new Error('Todos os endpoints do Gemini falharam');
  });
    case 'OPENAI':
      return 'https://platform.openai.com/api-keys';
    case 'CLAUDE':
      return 'https://console.anthropic.com/settings/keys';
    case 'PERPLEXITY':
      return 'https://www.perplexity.ai/settings/api';
    default:
      return 'Site oficial da IA';
  }
};

// Contexto de Autenticação
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há usuário logado
    const checkUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('currentUser');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const login = async (email, password) => {
    try {
      // Buscar usuários
      const usuarios = await AsyncStorage.getItem('usuarios');
      const usuariosArray = usuarios ? JSON.parse(usuarios) : [];
      
      // Verificar credenciais
      const usuarioEncontrado = usuariosArray.find(
        u => u.email === email && u.password === password
      );
      
      if (usuarioEncontrado) {
        setUser(usuarioEncontrado);
        await AsyncStorage.setItem('currentUser', JSON.stringify(usuarioEncontrado));
        return { success: true };
      } else {
        return { success: false, message: 'Email ou senha incorretos' };
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return { success: false, message: 'Erro ao fazer login' };
    }
  };

  const register = async (nome, email, password) => {
    try {
      // Verificar se o email já está em uso
      const usuarios = await AsyncStorage.getItem('usuarios');
      const usuariosArray = usuarios ? JSON.parse(usuarios) : [];
      
      if (usuariosArray.some(u => u.email === email)) {
        return { success: false, message: 'Email já cadastrado' };
      }
      
      // Criar novo usuário
      const novoUsuario = {
        id: Date.now().toString(),
        nome,
        email,
        password,
        dataCadastro: new Date().toISOString()
      };
      
      // Salvar usuário
      const novosUsuarios = [...usuariosArray, novoUsuario];
      await AsyncStorage.setItem('usuarios', JSON.stringify(novosUsuarios));
      
      // Fazer login automático
      setUser(novoUsuario);
      await AsyncStorage.setItem('currentUser', JSON.stringify(novoUsuario));
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      return { success: false, message: 'Erro ao cadastrar' };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('currentUser');
      setUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// Função para chamar diferentes APIs de IA
const chamarIAAPI = async (tipoIA, apiKey, promptText) => {
  const MAX_RETRIES = 2;
  
  // Implementação de backoff exponencial para retries
  const tentarComRetry = async (funcaoRequest) => {
    for (let tentativa = 0; tentativa <= MAX_RETRIES; tentativa++) {
      try {
        if (tentativa > 0) {
          const tempoEspera = Math.pow(2, tentativa) * 1000;
          console.log(`chamarIAAPI: Aguardando ${tempoEspera}ms antes da tentativa ${tentativa+1}`);
          await new Promise(resolve => setTimeout(resolve, tempoEspera));
        }
        
        return await funcaoRequest();
      } catch (error) {
        console.log(`chamarIAAPI: Erro na tentativa ${tentativa+1}:`, error.message);
        
        // Se é a última tentativa, propagar o erro
        if (tentativa === MAX_RETRIES) throw error;
        
        // Se não é erro de rate limit (429), não tente novamente
        if (error.response?.status !== 429) throw error;
      }
    }
  };
  
  // Handlers específicos para cada IA
  switch (tipoIA) {
    case 'GEMINI':
      return await tentarComRetry(async () => {
        const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
        const requestBody = {
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          }
        };
        
        const response = await axios.post(endpoint, requestBody, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        });
        
        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return response.data.candidates[0].content.parts[0].text;
        } else {
          throw new Error('Formato de resposta inesperado do Gemini');
        }
      });
      
    case 'OPENAI':
      return await tentarComRetry(async () => {
        const endpoint = IA_APIS.OPENAI.endpoint;
        const requestBody = {
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "Você é um consultor especializado em análise de currículos." },
            { role: "user", content: promptText }
          ],
          temperature: 0.7,
          max_tokens: 800
        };
        
        const response = await axios.post(endpoint, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 15000
        });
        
        if (response.data?.choices?.[0]?.message?.content) {
          return response.data.choices[0].message.content;
        } else {
          throw new Error('Formato de resposta inesperado do ChatGPT');
        }
      });
      
    case 'CLAUDE':
      return await tentarComRetry(async () => {
        const endpoint = IA_APIS.CLAUDE.endpoint;
        const requestBody = {
          model: "claude-3-sonnet-20240229",
          max_tokens: 800,
          messages: [
            { role: "user", content: promptText }
          ]
        };
        
        const response = await axios.post(endpoint, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          timeout: 20000
        });
        
        if (response.data?.content?.[0]?.text) {
          return response.data.content[0].text;
        } else {
          throw new Error('Formato de resposta inesperado do Claude');
        }
      });
    
    case 'PERPLEXITY':
      return await tentarComRetry(async () => {
        const endpoint = IA_APIS.PERPLEXITY.endpoint;
        const requestBody = {
          model: "llama-3-8b-instruct",
          messages: [
            { role: "user", content: promptText }
          ],
          temperature: 0.7,
          max_tokens: 800
        };
        
        const response = await axios.post(endpoint, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 20000
        });
        
        if (response.data?.choices?.[0]?.message?.content) {
          return response.data.choices[0].message.content;
        } else {
          throw new Error('Formato de resposta inesperado do Perplexity');
        }
      });
    
    case 'DEEPSEEK':
      return await tentarComRetry(async () => {
        const endpoint = IA_APIS.DEEPSEEK.endpoint;
        const requestBody = {
          model: "deepseek-chat",
          messages: [
            { role: "user", content: promptText }
          ],
          temperature: 0.7,
          max_tokens: 800
        };
        
        const response = await axios.post(endpoint, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 20000
        });
        
        if (response.data?.choices?.[0]?.message?.content) {
          return response.data.choices[0].message.content;
        } else {
          throw new Error('Formato de resposta inesperado do DeepSeek');
        }
      });
    
    case 'BLACKBOX':
      return await tentarComRetry(async () => {
        const endpoint = IA_APIS.BLACKBOX.endpoint;
        const requestBody = {
          messages: [
            { role: "user", content: promptText }
          ],
          temperature: 0.7,
          max_tokens: 800
        };
        
        const response = await axios.post(endpoint, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 20000
        });
        
        if (response.data?.message?.content) {
          return response.data.message.content;
        } else {
          throw new Error('Formato de resposta inesperado do Blackbox');
        }
      });
      
    case 'BING':
      return await tentarComRetry(async () => {
        const endpoint = IA_APIS.BING.endpoint;
        const params = {
          q: promptText,
          count: 5,
          responseFilter: 'Computation,Entities,Places,Webpages'
        };
        
        const response = await axios.get(endpoint, {
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey
          },
          params: params,
          timeout: 15000
        });
        
        if (response.data?.webPages?.value) {
          // Construa um texto resumindo os resultados
          let resultado = "Análise baseada em resultados da busca Bing:\n\n";
          response.data.webPages.value.forEach((item, index) => {
            resultado += `${index + 1}. ${item.name}\n${item.snippet}\n\n`;
          });
          
          return resultado;
        } else {
          throw new Error('Formato de resposta inesperado do Bing');
        }
      });
    
    case 'GROK':
      return await tentarComRetry(async () => {
        const endpoint = IA_APIS.GROK.endpoint;
        const requestBody = {
          messages: [
            { role: "user", content: promptText }
          ],
          temperature: 0.7,
          max_tokens: 800
        };
        
        const response = await axios.post(endpoint, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 20000
        });
        
        if (response.data?.choices?.[0]?.message?.content) {
          return response.data.choices[0].message.content;
        } else {
          throw new Error('Formato de resposta inesperado do Grok');
        }
      });
      
    default:
      throw new Error(`IA não implementada: ${tipoIA}`);
  }
};

// Função de geração de análise local (fallback)
const gerarAnaliseLocal = (curriculoData, tipoAnalise) => {
  try {
    // Extrair dados relevantes para personalizar a análise
    const nome = curriculoData.informacoes_pessoais?.nome || '';
    const sobrenome = curriculoData.informacoes_pessoais?.sobrenome || '';
    const nomeCompleto = `${nome} ${sobrenome}`.trim();
    const area = curriculoData.informacoes_pessoais?.area || 'profissional';
    
    // Verificar completude das seções para pontuação
    const temFormacao = curriculoData.formacoes_academicas?.length > 0;
    const temExperiencia = curriculoData.experiencias?.length > 0;
    const temCursos = curriculoData.cursos?.length > 0;
    const temProjetos = curriculoData.projetos?.length > 0;
    const temIdiomas = curriculoData.idiomas?.length > 0;
    
    // Calcular pontuação básica
    let pontuacaoBase = 5; // Base média
    
    // Adicionar pontos para cada seção preenchida
    if (temFormacao) pontuacaoBase += 1;
    if (temExperiencia) pontuacaoBase += 1.5;
    if (temCursos) pontuacaoBase += 0.5;
    if (temProjetos) pontuacaoBase += 1;
    if (temIdiomas) pontuacaoBase += 0.5;
    
    // Limitar a 10
    const pontuacaoFinal = Math.min(10, pontuacaoBase);
    
    // Gerar análise baseada no tipo
    let analiseTexto = '';
    
    switch (tipoAnalise) {
      case 'pontuacao':
        analiseTexto = `# Análise de Pontuação do Currículo

## Pontuação Geral: ${pontuacaoFinal.toFixed(1)}/10

### Detalhamento:

1. **Conteúdo (30%)**: ${Math.min(10, pontuacaoBase + 0.5).toFixed(1)}/10
   - ${temExperiencia ? 'Apresenta experiência profissional relevante' : 'Falta detalhar experiência profissional'}
   - ${temFormacao ? 'Formação acadêmica bem estruturada' : 'Precisa incluir formação acadêmica'}

2. **Estrutura (20%)**: ${Math.min(10, pontuacaoBase).toFixed(1)}/10
   - Organização ${temFormacao && temExperiencia ? 'lógica e clara' : 'pode ser melhorada'}
   - ${temProjetos || temCursos ? 'Boa separação das seções' : 'Pode adicionar mais seções para melhorar a estrutura'}

3. **Apresentação (20%)**: ${Math.min(10, pontuacaoBase - 0.5).toFixed(1)}/10
   - Formatação ${temFormacao && temExperiencia && temCursos ? 'consistente' : 'inconsistente em algumas seções'}
   - ${temIdiomas ? 'Habilidades linguísticas bem apresentadas' : 'Considere adicionar seção de idiomas'}

4. **Impacto (30%)**: ${Math.min(10, pontuacaoBase - 0.3).toFixed(1)}/10
   - O currículo ${pontuacaoBase > 7 ? 'causa uma boa primeira impressão' : 'precisa de mais impacto visual e de conteúdo'}
   - ${temProjetos ? 'Os projetos adicionam valor diferencial' : 'Adicionar projetos pode aumentar o impacto'}

*Esta análise foi gerada automaticamente com base nos dados fornecidos.*`;
        break;
        
      case 'melhorias':
        analiseTexto = `# 5 Melhorias para o Currículo

1. **${!temExperiencia ? 'Adicionar experiências profissionais detalhadas' : 'Detalhar mais os resultados nas experiências profissionais'}**
   - ${!temExperiencia ? 'Inclua experiências prévias com datas, funções e responsabilidades' : 'Quantifique realizações com números e resultados tangíveis'}
   - Exemplo: "Aumentou vendas em 27%" ou "Liderou equipe de 5 pessoas no desenvolvimento de novo produto"

2. **${!temFormacao ? 'Incluir formação acadêmica' : 'Destacar competências específicas adquiridas na formação'}**
   - ${!temFormacao ? 'Adicione sua formação com período, instituição e área' : 'Relacione disciplinas chave ou projetos acadêmicos relevantes'}
   - Importante para validar conhecimentos técnicos e teóricos

3. **${!temIdiomas ? 'Adicionar seção de idiomas' : 'Especificar níveis de proficiência em idiomas'}**
   - ${!temIdiomas ? 'Inclua todos os idiomas que conhece com nível de proficiência' : 'Use padrões internacionais como A1-C2 ou descritores claros (fluente, intermediário)'}
   - Competências linguísticas são diferenciais importantes

4. **${!temProjetos ? 'Criar seção de projetos relevantes' : 'Aprimorar descrição dos projetos'}**
   - ${!temProjetos ? 'Adicione projetos pessoais ou profissionais relacionados à sua área' : 'Descreva tecnologias e metodologias utilizadas em cada projeto'}
   - Demonstre aplicação prática de suas habilidades

5. **Personalizar o currículo para cada vaga**
   - Adapte palavras-chave de acordo com a descrição da vaga
   - Priorize experiências e habilidades mais relevantes para cada posição

*Implementar estas melhorias pode aumentar significativamente suas chances de ser chamado para entrevistas.*`;
        break;
        
      case 'dicas':
        analiseTexto = `# Dicas Estratégicas de Carreira

## Com base no seu perfil na área de ${area}, recomendamos:

1. **Especialização Técnica**
   - Invista em conhecimentos específicos de ${area}
   - Considere certificações reconhecidas pelo mercado
   - Motivo: Profissionais especializados têm 42% mais chances de serem contratados

2. **Presença Digital Profissional**
   - Crie ou atualize seu perfil no LinkedIn destacando palavras-chave da área
   - Compartilhe conteúdo relevante sobre ${area}
   - Conecte-se com profissionais e empresas de referência no setor

3. **Networking Estratégico**
   - Participe de eventos, webinars e comunidades de ${area}
   - Associe-se a grupos profissionais do seu segmento
   - Busque mentoria de profissionais mais experientes

4. **Desenvolvimento de Soft Skills**
   - Além de habilidades técnicas, desenvolva comunicação e trabalho em equipe
   - Pratique liderança e resolução de problemas em projetos paralelos
   - Estas competências são cada vez mais valorizadas por recrutadores

5. **Aprendizado Contínuo**
   - Estabeleça uma rotina de atualização sobre tendências em ${area}
   - Reserve tempo semanal para cursos, leituras e experimentação
   - Mantenha-se relevante em um mercado que evolui rapidamente

*Estas recomendações foram personalizadas com base nas informações do seu currículo.*`;
        break;
        
      case 'cursos':
        analiseTexto = `# Cursos Recomendados para Seu Perfil

Com base no seu currículo na área de ${area}, recomendamos os seguintes cursos:

1. **${area === 'Tecnologia da Informação' ? 'AWS Certified Solutions Architect' : 
          area === 'Marketing' ? 'Google Analytics Certification' : 
          area === 'Administração' ? 'Gestão Ágil de Projetos (PMI-ACP)' : 
          'Especialização em ' + area}**
   - Plataforma: ${area === 'Tecnologia da Informação' ? 'AWS Training' : 
                 area === 'Marketing' ? 'Google Skillshop' : 
                 area === 'Administração' ? 'PMI ou Coursera' : 
                 'EdX ou Coursera'}
   - Por que fazer: Certificação reconhecida globalmente que comprova competências avançadas
   - Como agregaria: Abre portas para posições sênior com remuneração até 30% maior

2. **${area === 'Tecnologia da Informação' ? 'Data Science Specialization' : 
          area === 'Marketing' ? 'Digital Marketing Specialization' : 
          area === 'Administração' ? 'Liderança e Gestão de Equipes' : 
          'Fundamentos de ' + area}**
   - Plataforma: Coursera (em parceria com universidades)
   - Por que fazer: Complementa sua formação com habilidades analíticas fundamentais
   - Como agregaria: Amplia o perfil para funções que exigem tomada de decisão baseada em dados

3. **${temIdiomas ? 'Business English Communication' : 'Inglês para Profissionais'}**
   - Plataforma: Duolingo, EF English Live ou Cambly
   - Por que fazer: Comunicação em inglês é requisito para empresas multinacionais
   - Como agregaria: Aumenta empregabilidade em 65% e possibilidade de aumento salarial

4. **${area === 'Tecnologia da Informação' ? 'DevOps for Professionals' : 
          area === 'Marketing' ? 'Growth Hacking Masterclass' : 
          area === 'Administração' ? 'Financial Management' : 
          'Inovação em ' + area}**
   - Plataforma: Udemy ou LinkedIn Learning
   - Por que fazer: Conhecimentos emergentes com alta demanda no mercado atual
   - Como agregaria: Posiciona você como profissional atualizado com tendências recentes

5. **${area === 'Tecnologia da Informação' ? 'UI/UX Design Fundamentals' : 
          area === 'Marketing' ? 'Content Marketing Strategy' : 
          area === 'Administração' ? 'Business Analytics' : 
          'Gestão de Projetos para ' + area}**
   - Plataforma: Alura, Udacity ou Domestika
   - Por que fazer: Complementa habilidades técnicas com visão de experiência do usuário
   - Como agregaria: Diferencial competitivo para posições que exigem múltiplas competências

*Esta lista foi personalizada com base no seu perfil atual e tendências de mercado para 2024. Atualizar estas competências pode aumentar significativamente sua empregabilidade.*`;
        break;
        
      case 'vagas':
        analiseTexto = `# Vagas Recomendadas para Seu Perfil

Com base no seu currículo na área de ${area}, você teria boas chances nas seguintes vagas:

1. **${area === 'Tecnologia da Informação' ? 'Desenvolvedor Full-Stack' : 
          area === 'Marketing' ? 'Especialista em Marketing Digital' : 
          area === 'Administração' ? 'Analista de Projetos' : 
          'Especialista em ' + area}**
   - Por que combina: ${temExperiencia ? 'Sua experiência anterior demonstra as competências necessárias' : 'Seu perfil de formação se alinha com os requisitos típicos'}
   - Competências valorizadas: ${temProjetos ? 'Experiência prática em projetos' : 'Conhecimentos teóricos'}, ${temIdiomas ? 'domínio de idiomas' : 'habilidades analíticas'}
   - Empresas/setores: ${area === 'Tecnologia da Informação' ? 'Fintechs, agências digitais' : 
                        area === 'Marketing' ? 'E-commerces, agências' : 
                        area === 'Administração' ? 'Multinacionais, consultorias' : 
                        'Empresas de médio e grande porte'}
   - Palavras-chave: ${area.toLowerCase()}, especialista, ${temFormacao ? 'graduação' : 'experiência'}, análise

2. **${area === 'Tecnologia da Informação' ? 'Analista de Dados' : 
          area === 'Marketing' ? 'Coordenador de Mídia Social' : 
          area === 'Administração' ? 'Gerente de Operações' : 
          'Consultor em ' + area}**
   - Por que combina: Aproveita suas competências em ${temProjetos ? 'projetos' : 'análise'} e ${temCursos ? 'conhecimentos específicos' : 'formação'}
   - Competências valorizadas: Análise crítica, conhecimentos técnicos, ${temIdiomas ? 'comunicação multilíngue' : 'comunicação eficaz'}
   - Empresas/setores: Consultorias, startups em crescimento, empresas de tecnologia
   - Palavras-chave: análise, ${area.toLowerCase()}, consultoria, projetos, ${temExperiencia ? 'experiência comprovada' : 'potencial'}

3. **${area === 'Tecnologia da Informação' ? 'Gerente de Produto Técnico' : 
          area === 'Marketing' ? 'Brand Manager' : 
          area === 'Administração' ? 'Analista de Negócios' : 
          'Analista de ' + area}**
   - Por que combina: Mescla ${temFormacao ? 'formação acadêmica' : 'visão prática'} com ${temProjetos ? 'experiência em projetos' : 'capacidade analítica'}
   - Competências valorizadas: Visão estratégica, conhecimento de mercado, ${temIdiomas ? 'habilidades de comunicação internacional' : 'comunicação clara'}
   - Empresas/setores: Empresas de médio e grande porte, multinacionais, consultorias especializadas
   - Palavras-chave: gerenciamento, estratégia, ${area.toLowerCase()}, análise, ${temFormacao ? 'qualificação acadêmica' : 'experiência prática'}

4. **${area === 'Tecnologia da Informação' ? 'Arquiteto de Soluções' : 
          area === 'Marketing' ? 'Gerente de Growth Marketing' : 
          area === 'Administração' ? 'Coordenador de Projetos' : 
          'Gerente de ' + area}**
   - Por que combina: Utiliza ${temFormacao ? 'conhecimento teórico' : 'visão prática'} combinado com ${temExperiencia ? 'experiência no mercado' : 'potencial de liderança'}
   - Competências valorizadas: Visão holística, capacidade de coordenação, ${temCursos ? 'especialização técnica' : 'adaptabilidade'}
   - Empresas/setores: Empresas inovadoras, líderes de mercado, organizações em transformação
   - Palavras-chave: coordenação, ${area.toLowerCase()}, gerenciamento, ${temIdiomas ? 'internacional' : 'nacional'}, estratégia

5. **${area === 'Tecnologia da Informação' ? 'Especialista em Segurança da Informação' : 
          area === 'Marketing' ? 'Customer Success Manager' : 
          area === 'Administração' ? 'Analista de Processos' : 
          'Especialista em ' + area} ${temIdiomas ? 'Internacional' : 'Sênior'}**
   - Por que combina: Aproveita ${temFormacao && temExperiencia ? 'combinação de teoria e prática' : temFormacao ? 'sólida formação acadêmica' : 'experiência prática'}
   - Competências valorizadas: Especialização técnica, ${temIdiomas ? 'comunicação multilíngue' : 'comunicação eficaz'}, resolução de problemas
   - Empresas/setores: Empresas de tecnologia, multinacionais, consultorias especializadas
   - Palavras-chave: especialista, ${area.toLowerCase()}, ${temFormacao ? 'graduação' : 'experiência'}, ${temIdiomas ? 'internacional' : 'nacional'}, técnico

*Esta lista foi personalizada com base no seu perfil atual. Adapte seu currículo para destacar as competências relevantes para cada tipo de vaga.*`;
        break;
        
      default:
        analiseTexto = `# Análise Geral do Currículo

## Pontos Fortes
- ${temFormacao ? 'Formação acadêmica na área de atuação' : 'Perfil com potencial de desenvolvimento'}
- ${temExperiencia ? 'Experiência profissional demonstrada' : 'Oportunidade para destacar projetos e outras atividades'}
- ${temIdiomas ? 'Conhecimento de idiomas' : 'Foco em competências técnicas'}

## Áreas de Melhoria
- ${!temProjetos ? 'Adicionar seção de projetos para demonstrar habilidades práticas' : 'Detalhar melhor os projetos apresentados'}
- ${!temCursos ? 'Incluir cursos e certificações para complementar formação' : 'Relacionar cursos com objetivos profissionais'}
- Personalizar o currículo para cada oportunidade específica

## Impressão Geral
O currículo apresenta um profissional ${pontuacaoFinal > 7 ? 'bem qualificado' : 'com potencial'} na área de ${area}. ${pontuacaoFinal > 7 ? 'Possui boa estrutura' : 'Precisa de ajustes na estrutura'} e ${temExperiencia && temFormacao ? 'apresenta informações relevantes' : 'pode ser enriquecido com mais informações relevantes'}.

## Nota Geral: ${pontuacaoFinal.toFixed(1)}/10

*Esta análise foi gerada pelo sistema de análise local e representa uma avaliação baseada nos dados fornecidos.*`;
    }
    
    // Informar que estamos usando análise local
    return {
      success: true,
      analise: analiseTexto,
      offline: true,
      provider: 'Sistema Local'
    };
  } catch (error) {
    console.error('Erro na análise local:', error);
    
    // Em caso de erro, retornar uma análise genérica
    return {
      success: true,
      analise: `# Análise de Currículo\n\nSeu currículo apresenta um bom equilíbrio entre formação e experiência. Continue aprimorando com cursos e projetos relevantes para sua área.\n\n*Nota: Esta é uma análise básica gerada pelo sistema.*`,
      offline: true,
      provider: 'Sistema Local'
    };
  }
};

// Função atualizada para analisar currículo com múltiplas IAs
const analisarCurriculoComIA = async (curriculoData, tipoAnalise, tipoIA = 'GEMINI', forceOffline = false) => {
  // Validação de entrada
  if (!curriculoData) {
    console.error('analisarCurriculoComIA: Dados do currículo não fornecidos');
    return {
      success: false,
      analise: 'Não foi possível analisar o currículo: dados ausentes.',
      offline: true
    };
  }
  
  if (!tipoAnalise) {
    tipoAnalise = 'geral'; // Valor padrão
  }
  
  // Verificar se a IA selecionada existe
  if (!IA_APIS[tipoIA]) {
    console.error(`analisarCurriculoComIA: Tipo de IA inválido: ${tipoIA}`);
    tipoIA = 'GEMINI'; // Fallback para Gemini
  }
  
  // Se a IA selecionada é offline ou forceOffline, usar análise local
  if (forceOffline || IA_APIS[tipoIA].offline) {
    console.log('analisarCurriculoComIA: Usando modo offline');
    return gerarAnaliseLocal(curriculoData, tipoAnalise);
  }
  
  // Verificar cache usando a combinação de tipoAnalise e tipoIA como chave
  const cacheKey = `analise_${tipoIA}_${tipoAnalise}_${JSON.stringify(curriculoData).slice(0, 50)}`;
  try {
    const cachedResult = await AsyncStorage.getItem(cacheKey);
    if (cachedResult) {
      const parsed = JSON.parse(cachedResult);
      const cacheAge = new Date() - new Date(parsed.timestamp);
      const cacheValidHours = 24;
      
      if (cacheAge < cacheValidHours * 60 * 60 * 1000) {
        console.log(`analisarCurriculoComIA: Usando resultado em cache para ${IA_APIS[tipoIA].nome}`);
        return {
          success: true,
          analise: parsed.resultado,
          offline: false,
          fromCache: true,
          provider: IA_APIS[tipoIA].nome
        };
      }
    }
  } catch (cacheError) {
    console.log('Erro ao verificar cache:', cacheError.message);
  }
  
  // Função para formatar currículo - definida explicitamente dentro do escopo
  const formatarCurriculo = (data) => {
    let texto = '';
    
    // Helper para adicionar seção apenas se existir dados
    const adicionarSecao = (titulo, items, formatoItem) => {
      if (!items || items.length === 0) return;
      
      texto += `${titulo.toUpperCase()}:\n`;
      items.forEach(item => {
        texto += formatoItem(item);
        texto += '\n';
      });
      texto += '\n';
    };
    
    // Informações Pessoais
    const pessoal = data.informacoes_pessoais || {};
    const nomeCompleto = `${pessoal.nome || ''} ${pessoal.sobrenome || ''}`.trim();
    if (nomeCompleto) texto += `Nome: ${nomeCompleto}\n`;
    if (pessoal.email) texto += `Email: ${pessoal.email}\n`;
    if (pessoal.endereco) texto += `Endereço: ${pessoal.endereco}\n`;
    if (pessoal.area) texto += `Área: ${pessoal.area}\n`;
    if (pessoal.linkedin) texto += `LinkedIn: ${pessoal.linkedin}\n`;
    if (pessoal.github) texto += `GitHub: ${pessoal.github}\n`;
    if (pessoal.site) texto += `Site: ${pessoal.site}\n`;
    texto += '\n';
    
    // Formação Acadêmica
    adicionarSecao('Formação Acadêmica', data.formacoes_academicas, (f) => {
      let item = `- ${f.diploma || ''} em ${f.area_estudo || ''}\n`;
      item += `  ${f.instituicao || ''}\n`;
      item += `  ${f.data_inicio || ''} - ${f.data_fim || ''}\n`;
      if (f.descricao) item += `  Descrição: ${f.descricao}\n`;
      if (f.competencias) item += `  Competências: ${f.competencias}\n`;
      return item;
    });
    
    // Experiência Profissional
    adicionarSecao('Experiência Profissional', data.experiencias, (e) => {
      let item = `- ${e.cargo || ''}\n`;
      item += `  ${e.empresa || ''}\n`;
      item += `  ${e.data_inicio || ''} - ${e.data_fim || ''}\n`;
      if (e.descricao) item += `  Descrição: ${e.descricao}\n`;
      return item;
    });
    
    // Cursos
    adicionarSecao('Cursos e Certificados', data.cursos, (c) => {
      let item = `- ${c.nome || ''}\n`;
      item += `  ${c.instituicao || ''}\n`;
      if (c.data_inicio || c.data_fim) {
        item += `  ${c.data_inicio || ''} - ${c.data_fim || ''}\n`;
      }
      if (c.descricao) item += `  Descrição: ${c.descricao}\n`;
      return item;
    });
    
    // Projetos
    adicionarSecao('Projetos', data.projetos, (p) => {
      let item = `- ${p.nome || ''}\n`;
      if (p.habilidades) item += `  Habilidades: ${p.habilidades}\n`;
      if (p.descricao) item += `  Descrição: ${p.descricao}\n`;
      return item;
    });
    
    // Idiomas
    adicionarSecao('Idiomas', data.idiomas, (i) => {
      return `- ${i.nome || ''}: ${i.nivel || ''}\n`;
    });
    
    return texto;
  };

  // Estruturar o currículo em texto para análise
  const curriculoTexto = formatarCurriculo(curriculoData);
  
  // Função para gerar o prompt adequado
  const gerarPrompt = (tipo, textoCurriculo) => {
    const prompts = {
      pontuacao: `Você é um consultor de RH. Avalie este currículo (0-10) em: Conteúdo (30%), Estrutura (20%), Apresentação (20%), Impacto (30%). Forneça nota geral ponderada e justifique brevemente.`,
      
      melhorias: `Você é um consultor de RH. Identifique 3 melhorias específicas para este currículo aumentar chances de entrevistas. Para cada, explique por quê e como implementar.`,
      
      dicas: `Você é um coach de carreira. Forneça 3 dicas de carreira para este candidato, considerando seu perfil. Seja específico e prático.`,
      
      cursos: `Sugira 3 cursos ou certificações específicas para complementar este perfil e aumentar empregabilidade. Explique onde encontrar e como agregaria valor.`,
      
      vagas: `Sugira 3 tipos de vagas onde este candidato teria boas chances. Explique por que, competências valorizadas e palavras-chave para busca.`,
      
      geral: `Analise este currículo: 1) Pontos fortes (2), 2) Áreas de melhoria (2), 3) Impressão geral, 4) Nota de 0-10.`
    };
    
    // Usar prompt específico ou default
    const promptBase = prompts[tipo] || prompts.geral;
    
    return `${promptBase}
    
    CURRÍCULO:
    ${textoCurriculo}
    
    Responda em português, com formatação clara e concisa.`;
  };

  const promptText = gerarPrompt(tipoAnalise, curriculoTexto);
  
  // Obter a API key para o tipo de IA selecionado
  const apiKey = await getIAAPIKey(tipoIA);
  
  // Verificar se precisa de API key e se ela está disponível
  if (IA_APIS[tipoIA].chaveNecessaria && !apiKey) {
    console.error(`analisarCurriculoComIA: API key não encontrada para ${IA_APIS[tipoIA].nome}`);
    return {
      success: false,
      analise: `Não foi possível analisar o currículo: API key não configurada para ${IA_APIS[tipoIA].nome}.`,
      offline: true,
      provider: IA_APIS[tipoIA].nome
    };
  }
  
  // Chamar a função específica para o tipo de IA
  try {
    const resultado = await chamarIAAPI(tipoIA, apiKey, promptText);
    
    // Salvar no cache
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        resultado: resultado,
        timestamp: new Date().toISOString()
      }));
    } catch (cacheError) {
      console.log('Erro ao salvar no cache:', cacheError.message);
    }
    
    return {
      success: true,
      analise: resultado,
      offline: false,
      provider: IA_APIS[tipoIA].nome
    };
  } catch (error) {
    console.error(`analisarCurriculoComIA: Erro ao chamar API de ${IA_APIS[tipoIA].nome}:`, error.message);
    
    // Tentar com Gemini como fallback se não for Gemini que já falhou
    if (tipoIA !== 'GEMINI') {
      console.log('analisarCurriculoComIA: Tentando fallback para Gemini');
      try {
        return await analisarCurriculoComIA(curriculoData, tipoAnalise, 'GEMINI', false);
      } catch (fallbackError) {
        console.error('analisarCurriculoComIA: Fallback para Gemini também falhou:', fallbackError.message);
      }
    }
    
    // Último recurso: usar análise local
    console.log('analisarCurriculoComIA: Usando análise local como último recurso');
    return gerarAnaliseLocal(curriculoData, tipoAnalise);
  }
};

// Componentes
const ChatMessage = ({ message, isUser, time }) => (
  <View style={[
    styles.messageContainer,
    isUser ? styles.userMessageContainer : styles.botMessageContainer
  ]}>
    <Text style={[
      styles.messageText,
      isUser ? styles.userMessageText : styles.botMessageText
    ]}>
      {message}
    </Text>
    <Text style={styles.messageTime}>{time}</Text>
  </View>
);

const ChatOptions = ({ options, onSelect }) => {
  if (!options || options.length === 0) return null;
  
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.optionsContainer}
    >
      {options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={styles.optionButton}
          onPress={() => onSelect(option)}
        >
          <Text style={styles.optionText}>{option}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const CurriculumPreview = ({ data }) => {
  if (!data || !data.informacoes_pessoais) {
    return (
      <View style={styles.emptyPreview}>
        <Text style={styles.emptyPreviewText}>
          As informações do seu currículo aparecerão aqui conforme você as fornecer.
        </Text>
      </View>
    );
  }

  const personalInfo = data.informacoes_pessoais;
  const fullName = `${personalInfo.nome || ''} ${personalInfo.sobrenome || ''}`.trim();
  
  return (
    <View style={styles.previewContainer}>
      {fullName ? (
        <Text style={styles.previewName}>{fullName}</Text>
      ) : null}
      
      {personalInfo.email || personalInfo.endereco ? (
        <Text style={styles.previewContact}>
          {personalInfo.email}
          {personalInfo.email && personalInfo.endereco ? ' | ' : ''}
          {personalInfo.endereco}
        </Text>
      ) : null}
      
      {/* Links */}
      {(personalInfo.site || personalInfo.linkedin || personalInfo.github) && (
        <View style={styles.previewLinks}>
          {personalInfo.site && (
            <Text style={styles.previewLink}>{personalInfo.site}</Text>
          )}
          {personalInfo.linkedin && (
            <Text style={styles.previewLink}>LinkedIn</Text>
          )}
          {personalInfo.github && (
            <Text style={styles.previewLink}>GitHub</Text>
          )}
        </View>
      )}
      
      {/* Formação Acadêmica */}
      {data.formacoes_academicas && data.formacoes_academicas.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.previewSectionTitle}>Formação Acadêmica</Text>
          {data.formacoes_academicas.map((formacao, index) => (
            <View key={index} style={styles.previewItem}>
              <Text style={styles.previewItemTitle}>
                {formacao.diploma} em {formacao.area_estudo}
              </Text>
              <Text style={styles.previewItemSubtitle}>{formacao.instituicao}</Text>
              {formacao.data_inicio ? (
                <Text style={styles.previewItemDate}>
                  {formacao.data_inicio}
                  {formacao.data_fim ? 
                    formacao.data_fim.toLowerCase() === 'atual' ? 
                      ' - Presente' : 
                      ` - ${formacao.data_fim}` : 
                    ''}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
      
      {/* Experiência Profissional */}
      {data.experiencias && data.experiencias.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.previewSectionTitle}>Experiência Profissional</Text>
          {data.experiencias.map((exp, index) => (
            <View key={index} style={styles.previewItem}>
              <Text style={styles.previewItemTitle}>{exp.cargo}</Text>
              <Text style={styles.previewItemSubtitle}>{exp.empresa}</Text>
              {exp.data_inicio ? (
                <Text style={styles.previewItemDate}>
                  {exp.data_inicio}
                  {exp.data_fim ? 
                    exp.data_fim.toLowerCase() === 'atual' ? 
                      ' - Presente' : 
                      ` - ${exp.data_fim}` : 
                    ''}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Cursos */}
      {data.cursos && data.cursos.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.previewSectionTitle}>Cursos e Certificados</Text>
          {data.cursos.map((curso, index) => (
            <View key={index} style={styles.previewItem}>
              <Text style={styles.previewItemTitle}>{curso.nome}</Text>
              <Text style={styles.previewItemSubtitle}>{curso.instituicao}</Text>
              {curso.data_inicio || curso.data_fim ? (
                <Text style={styles.previewItemDate}>
                  {curso.data_inicio || ''}
                  {curso.data_inicio && curso.data_fim ? ' - ' : ''}
                  {curso.data_fim || ''}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Projetos */}
      {data.projetos && data.projetos.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.previewSectionTitle}>Projetos</Text>
          {data.projetos.map((projeto, index) => (
            <View key={index} style={styles.previewItem}>
              <Text style={styles.previewItemTitle}>{projeto.nome}</Text>
              {projeto.habilidades ? (
                <Text style={styles.previewItemSubtitle}>
                  <Text style={{fontWeight: 'bold'}}>Habilidades:</Text> {projeto.habilidades}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Idiomas */}
      {data.idiomas && data.idiomas.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.previewSectionTitle}>Idiomas</Text>
          {data.idiomas.map((idioma, index) => (
            <View key={index} style={styles.previewItem}>
              <Text style={styles.previewItemTitle}>{idioma.nome}</Text>
              <Text style={styles.previewItemSubtitle}>Nível: {idioma.nivel}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const AnalysisSummaryCard = ({ title, score, description, color }) => (
  <View style={[styles.analysisCard, { borderLeftColor: color }]}>
    <View style={styles.analysisCardHeader}>
      <Text style={styles.analysisCardTitle}>{title}</Text>
      {score ? (
        <View style={[styles.scoreContainer, { backgroundColor: color }]}>
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      ) : null}
    </View>
    <Text style={styles.analysisCardDescription}>{description}</Text>
  </View>
);

// Lógica do Chatbot
const initialCVData = {
  informacoes_pessoais: {},
  formacoes_academicas: [],
  cursos: [],
  projetos: [],
  experiencias: [],
  idiomas: []
};

// Processar a mensagem atual baseado na etapa anterior
const processMessage = (message, currentStep, cvData) => {
  // Se não temos dados do CV ainda, inicializar
  const data = cvData || { ...initialCVData };
  
  // Processamento baseado na etapa atual
  switch (currentStep) {
    case 'boas_vindas':
      if (['oi', 'olá', 'ola', 'começar', 'iniciar', 'hello', 'hi'].includes(message.toLowerCase())) {
        return {
          response: "Olá! Eu sou o CurriculoBot, seu assistente para criar um currículo profissional. Vamos começar com suas informações pessoais. Como posso te chamar?",
          nextStep: 'nome',
          options: [],
          cvData: data
        };
      } else {
        return {
          response: "Olá! Sou o CurriculoBot, seu assistente para criar um currículo profissional. Digite 'começar' quando estiver pronto para iniciar.",
          nextStep: 'boas_vindas',
          options: ['Começar'],
          cvData: data
        };
      }
      
    case 'nome':
      if (!message.trim()) {
        return {
          response: "Desculpe, não consegui entender seu nome. Poderia repetir por favor?",
          nextStep: 'nome',
          options: [],
          cvData: data
        };
      }
      
      data.informacoes_pessoais.nome = message.trim();
      
      return {
        response: `Prazer em conhecê-lo, ${message.trim()}! Agora, qual é o seu sobrenome?`,
        nextStep: 'sobrenome',
        options: [],
        cvData: data
      };
      
    case 'sobrenome':
      if (!message.trim()) {
        return {
          response: "Desculpe, não consegui entender seu sobrenome. Poderia repetir por favor?",
          nextStep: 'sobrenome',
          options: [],
          cvData: data
        };
      }
      
      data.informacoes_pessoais.sobrenome = message.trim();
      
      return {
        response: "Ótimo! Agora, qual é o seu endereço de e-mail?",
        nextStep: 'email',
        options: [],
        cvData: data
      };
      
    case 'email':
      if (!message.includes('@')) {
        return {
          response: "Hmm, isso não parece um endereço de e-mail válido. Por favor, inclua um '@' no seu e-mail.",
          nextStep: 'email',
          options: [],
          cvData: data
        };
      }
      
      data.informacoes_pessoais.email = message.trim();
      
      return {
        response: "Excelente! Agora, qual é o seu endereço?",
        nextStep: 'endereco',
        options: [],
        cvData: data
      };
      
    case 'endereco':
      if (!message.trim()) {
        return {
          response: "Desculpe, não consegui entender seu endereço. Poderia repetir por favor?",
          nextStep: 'endereco',
          options: [],
          cvData: data
        };
      }
      
      data.informacoes_pessoais.endereco = message.trim();
      
      return {
        response: "Perfeito! Agora, qual é a sua área de atuação profissional?",
        nextStep: 'area',
        options: ['Tecnologia da Informação', 'Saúde', 'Educação', 'Engenharia', 'Direito', 'Marketing', 'Administração', 'Outro'],
        cvData: data
      };
      
    case 'area':
      if (!message.trim()) {
        return {
          response: "Desculpe, não consegui entender sua área profissional. Poderia repetir por favor?",
          nextStep: 'area',
          options: ['Tecnologia da Informação', 'Saúde', 'Educação', 'Engenharia', 'Direito', 'Marketing', 'Administração', 'Outro'],
          cvData: data
        };
      }
      
      data.informacoes_pessoais.area = message.trim();
      
      return {
        response: "Você tem um site pessoal ou portfólio? Se sim, qual é o endereço? (Se não tiver, digite 'não')",
        nextStep: 'site',
        options: ['Não'],
        cvData: data
      };
      
    case 'site':
      if (!['não', 'nao', 'no', 'n'].includes(message.toLowerCase())) {
        data.informacoes_pessoais.site = message.trim();
      }
      
      return {
        response: "Você tem um perfil no LinkedIn? Se sim, qual é o endereço? (Se não tiver, digite 'não')",
        nextStep: 'linkedin',
        options: ['Não'],
        cvData: data
      };
      
    case 'linkedin':
      if (!['não', 'nao', 'no', 'n'].includes(message.toLowerCase())) {
        data.informacoes_pessoais.linkedin = message.trim();
      }
      
      // Verificar se é da área de tecnologia para perguntar sobre GitHub
      if (data.informacoes_pessoais.area && 
          ['tecnologia', 'tecnologia da informação', 'ti', 'desenvolvimento', 'programação']
            .includes(data.informacoes_pessoais.area.toLowerCase())) {
        return {
          response: "Você tem uma conta no GitHub? Se sim, qual é o endereço? (Se não tiver, digite 'não')",
          nextStep: 'github',
          options: ['Não'],
          cvData: data
        };
      } else {
        return {
          response: "Vamos prosseguir. O que você prefere adicionar primeiro? (Você pode finalizar a qualquer momento digitando 'finalizar')",
          nextStep: 'escolher_proximo',
          options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
          cvData: data
        };
      }
      
    case 'github':
      if (!['não', 'nao', 'no', 'n'].includes(message.toLowerCase())) {
        data.informacoes_pessoais.github = message.trim();
      }
      
      return {
        response: "Vamos prosseguir. O que você prefere adicionar primeiro? (Você pode finalizar a qualquer momento digitando 'finalizar')",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };
      
    case 'escolher_proximo':
      const option = message.toLowerCase();
      
      if (option.includes('finalizar') || option.includes('concluir') || option.includes('pronto')) {
        return {
          response: "Deseja finalizar seu currículo? Todas as informações já foram salvas.",
          nextStep: 'finalizar',
          options: ['Sim, finalizar', 'Não, continuar editando'],
          cvData: data
        };
      } else if (option.includes('formação') || option.includes('formacao')) {
        return {
          response: "Vamos adicionar uma formação acadêmica. Qual é a instituição de ensino?",
          nextStep: 'formacao_instituicao',
          options: [],
          cvData: data
        };
      } else if (option.includes('experiência') || option.includes('experiencia')) {
        return {
          response: "Vamos adicionar uma experiência profissional. Qual foi o cargo ou posição?",
          nextStep: 'experiencia_cargo',
          options: [],
          cvData: data
        };
      } else if (option.includes('curso') || option.includes('certificado')) {
        return {
          response: "Vamos adicionar um curso ou certificado. Qual é o nome do curso?",
          nextStep: 'curso_nome',
          options: [],
          cvData: data
        };
      } else if (option.includes('projeto')) {
        return {
          response: "Vamos adicionar um projeto. Qual é o nome do projeto?",
          nextStep: 'projeto_nome',
          options: [],
          cvData: data
        };
      } else if (option.includes('idioma')) {
        return {
          response: "Vamos adicionar um idioma. Qual idioma você conhece?",
          nextStep: 'idioma_nome',
          options: ['Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano', 'Mandarim', 'Japonês', 'Outro'],
          cvData: data
        };
      } else {
        return {
          response: "Desculpe, não entendi sua escolha. O que você gostaria de adicionar agora?",
          nextStep: 'escolher_proximo',
          options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
          cvData: data
        };
      }
      
    case 'formacao_instituicao':
      if (!message.trim()) {
        return {
          response: "Por favor, informe o nome da instituição de ensino.",
          nextStep: 'formacao_instituicao',
          options: [],
          cvData: data
        };
      }
      
      // Inicializar nova formação acadêmica
      const novaFormacao = {
        instituicao: message.trim()
      };
      
      return {
        response: "Qual diploma ou grau você obteve? (Ex: Bacharel, Tecnólogo, Mestrado)",
        nextStep: 'formacao_diploma',
        options: ['Bacharel', 'Licenciatura', 'Tecnólogo', 'Mestrado', 'Doutorado', 'Técnico'],
        cvData: {
          ...data,
          formacao_atual: novaFormacao
        }
      };
      
    case 'formacao_diploma':
      if (!message.trim()) {
        return {
          response: "Por favor, informe o tipo de diploma ou grau obtido.",
          nextStep: 'formacao_diploma',
          options: ['Bacharel', 'Licenciatura', 'Tecnólogo', 'Mestrado', 'Doutorado', 'Técnico'],
          cvData: data
        };
      }
      
      data.formacao_atual.diploma = message.trim();
      
      return {
        response: "Qual foi a área de estudo ou curso?",
        nextStep: 'formacao_area',
        options: [],
        cvData: data
      };
      
    case 'formacao_area':
      if (!message.trim()) {
        return {
          response: "Por favor, informe a área de estudo ou curso.",
          nextStep: 'formacao_area',
          options: [],
          cvData: data
        };
      }
      
      data.formacao_atual.area_estudo = message.trim();
      
      return {
        response: "Qual foi a data de início? (formato: MM/AAAA)",
        nextStep: 'formacao_data_inicio',
        options: [],
        cvData: data
      };
      
    case 'formacao_data_inicio':
      if (!message.trim()) {
        return {
          response: "Por favor, informe a data de início no formato MM/AAAA.",
          nextStep: 'formacao_data_inicio',
          options: [],
          cvData: data
        };
      }
      
      data.formacao_atual.data_inicio = message.trim();
      
      return {
        response: "Qual foi a data de conclusão? (formato: MM/AAAA, ou digite 'cursando' se ainda estiver em andamento)",
        nextStep: 'formacao_data_fim',
        options: ['Cursando'],
        cvData: data
      };
      
    case 'formacao_data_fim':
      data.formacao_atual.data_fim = message.toLowerCase() === 'cursando' ? 'Atual' : message.trim();
      
      // Adicionar a formação à lista e limpar a formação atual
      if (!data.formacoes_academicas) {
        data.formacoes_academicas = [];
      }
      
      data.formacoes_academicas.push(data.formacao_atual);
      delete data.formacao_atual;
      
      return {
        response: "Formação acadêmica adicionada com sucesso! O que você gostaria de adicionar agora?",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };
      
    case 'experiencia_cargo':
      if (!message.trim()) {
        return {
          response: "Por favor, informe o cargo ou posição ocupada.",
          nextStep: 'experiencia_cargo',
          options: [],
          cvData: data
        };
      }
      
      // Inicializar nova experiência profissional
      const novaExperiencia = {
        cargo: message.trim()
      };
      
      return {
        response: "Em qual empresa ou organização você trabalhou?",
        nextStep: 'experiencia_empresa',
        options: [],
        cvData: {
          ...data,
          experiencia_atual: novaExperiencia
        }
      };
      
    case 'experiencia_empresa':
      if (!message.trim()) {
        return {
          response: "Por favor, informe o nome da empresa ou organização.",
          nextStep: 'experiencia_empresa',
          options: [],
          cvData: data
        };
      }
      
      data.experiencia_atual.empresa = message.trim();
      
      return {
        response: "Qual foi a data de início? (formato: MM/AAAA)",
        nextStep: 'experiencia_data_inicio',
        options: [],
        cvData: data
      };
      
    case 'experiencia_data_inicio':
      if (!message.trim()) {
        return {
          response: "Por favor, informe a data de início no formato MM/AAAA.",
          nextStep: 'experiencia_data_inicio',
          options: [],
          cvData: data
        };
      }
      
      data.experiencia_atual.data_inicio = message.trim();
      
      return {
        response: "Qual foi a data de término? (formato: MM/AAAA, ou digite 'atual' se ainda estiver neste emprego)",
        nextStep: 'experiencia_data_fim',
        options: ['Atual'],
        cvData: data
      };
      
    case 'experiencia_data_fim':
      data.experiencia_atual.data_fim = message.toLowerCase() === 'atual' ? 'Atual' : message.trim();
      
      // Adicionar a experiência à lista e limpar a experiência atual
      if (!data.experiencias) {
        data.experiencias = [];
      }
      
      data.experiencias.push(data.experiencia_atual);
      delete data.experiencia_atual;
      
      return {
        response: "Experiência profissional adicionada com sucesso! O que você gostaria de adicionar agora?",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };
    
    // Curso
    case 'curso_nome':
      if (!message.trim()) {
        return {
          response: "Por favor, informe o nome do curso ou certificado.",
          nextStep: 'curso_nome',
          options: [],
          cvData: data
        };
      }
      
      // Inicializar novo curso
      const novoCurso = {
        nome: message.trim()
      };
      
      return {
        response: "Qual instituição ofereceu este curso?",
        nextStep: 'curso_instituicao',
        options: [],
        cvData: {
          ...data,
          curso_atual: novoCurso
        }
      };
      
    case 'curso_instituicao':
      if (!message.trim()) {
        return {
          response: "Por favor, informe o nome da instituição.",
          nextStep: 'curso_instituicao',
          options: [],
          cvData: data
        };
      }
      
      data.curso_atual.instituicao = message.trim();
      
      return {
        response: "Qual foi a data de início? (formato: MM/AAAA, ou digite 'não sei' se não lembrar)",
        nextStep: 'curso_data_inicio',
        options: ['Não sei'],
        cvData: data
      };
      
    case 'curso_data_inicio':
      if (message.toLowerCase() !== 'não sei' && message.toLowerCase() !== 'nao sei') {
        data.curso_atual.data_inicio = message.trim();
      }
      
      return {
        response: "Qual foi a data de conclusão? (formato: MM/AAAA, ou digite 'cursando' se ainda estiver em andamento)",
        nextStep: 'curso_data_fim',
        options: ['Cursando', 'Não sei'],
        cvData: data
      };
      
    case 'curso_data_fim':
      if (message.toLowerCase() === 'cursando') {
        data.curso_atual.data_fim = 'Atual';
      } else if (message.toLowerCase() !== 'não sei' && message.toLowerCase() !== 'nao sei') {
        data.curso_atual.data_fim = message.trim();
      }
      
      // Adicionar o curso à lista e limpar o curso atual
      if (!data.cursos) {
        data.cursos = [];
      }
      
      data.cursos.push(data.curso_atual);
      delete data.curso_atual;
      
      return {
        response: "Curso adicionado com sucesso! O que você gostaria de adicionar agora?",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };
    
    // Projeto
    case 'projeto_nome':
      if (!message.trim()) {
        return {
          response: "Por favor, informe o nome do projeto.",
          nextStep: 'projeto_nome',
          options: [],
          cvData: data
        };
      }
      
      // Inicializar novo projeto
      const novoProjeto = {
        nome: message.trim()
      };
      
      return {
        response: "Quais habilidades ou tecnologias você utilizou neste projeto? (separadas por vírgula)",
        nextStep: 'projeto_habilidades',
        options: [],
        cvData: {
          ...data,
          projeto_atual: novoProjeto
        }
      };
      
    case 'projeto_habilidades':
      data.projeto_atual.habilidades = message.trim();
      
      return {
        response: "Descreva brevemente este projeto:",
        nextStep: 'projeto_descricao',
        options: [],
        cvData: data
      };
      
    case 'projeto_descricao':
      data.projeto_atual.descricao = message.trim();
      
      // Adicionar o projeto à lista e limpar o projeto atual
      if (!data.projetos) {
        data.projetos = [];
      }
      
      data.projetos.push(data.projeto_atual);
      delete data.projeto_atual;
      
      return {
        response: "Projeto adicionado com sucesso! O que você gostaria de adicionar agora?",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };
    
    // Idioma
    case 'idioma_nome':
      if (!message.trim()) {
        return {
          response: "Por favor, informe o idioma.",
          nextStep: 'idioma_nome',
          options: ['Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano', 'Mandarim', 'Japonês', 'Outro'],
          cvData: data
        };
      }
      
      // Inicializar novo idioma
      const novoIdioma = {
        nome: message.trim()
      };
      
      return {
        response: "Qual é o seu nível neste idioma?",
        nextStep: 'idioma_nivel',
        options: ['Básico', 'Intermediário', 'Avançado', 'Fluente', 'Nativo'],
        cvData: {
          ...data,
          idioma_atual: novoIdioma
        }
      };
      
    case 'idioma_nivel':
      data.idioma_atual.nivel = message.trim();
      
      // Adicionar o idioma à lista e limpar o idioma atual
      if (!data.idiomas) {
        data.idiomas = [];
      }
      
      data.idiomas.push(data.idioma_atual);
      delete data.idioma_atual;
      
      return {
        response: "Idioma adicionado com sucesso! O que você gostaria de adicionar agora?",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };
      
    case 'finalizar':
      if (['sim', 'sim, finalizar', 'yes', 's', 'y'].includes(message.toLowerCase())) {
        return {
          response: "Seu currículo foi finalizado com sucesso! Você pode acessá-lo na aba 'Meus Currículos'. Obrigado por usar o CurriculoBot!",
          nextStep: 'concluido',
          options: ['Iniciar Novo Currículo'],
          cvData: data,
          isFinished: true
        };
      } else {
        return {
          response: "O que você gostaria de adicionar agora?",
          nextStep: 'escolher_proximo',
          options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
          cvData: data
        };
      }
      
    default:
      return {
        response: "Parece que tivemos um problema. Vamos recomeçar. Como posso ajudar com seu currículo?",
        nextStep: 'boas_vindas',
        options: ['Começar'],
        cvData: initialCVData
      };
  }
};

// Gerar timestamp atual
const getCurrentTime = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

// Gerar ID único
const getUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Salvar currículo no AsyncStorage
const salvarCurriculo = async (data, userId) => {
  try {
    // Buscar currículos existentes do usuário
    const cvs = await AsyncStorage.getItem(`curriculos_${userId}`);
    const curriculos = cvs ? JSON.parse(cvs) : [];
    
    // Criar novo currículo
    const novoCurriculo = {
      id: getUniqueId(),
      nome: `${data.informacoes_pessoais.nome || ''} ${data.informacoes_pessoais.sobrenome || ''}`.trim(),
      data: data,
      dataCriacao: new Date().toISOString()
    };
    
    // Adicionar ao array e salvar
    curriculos.push(novoCurriculo);
    await AsyncStorage.setItem(`curriculos_${userId}`, JSON.stringify(curriculos));
    
    return novoCurriculo.id;
  } catch (error) {
    console.error('Erro ao salvar currículo:', error);
    throw error;
  }
};

// Formatador de data
const formatDate = (dateString) => {
  try {
    if (!dateString) return 'Data não disponível';
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
};

// Componente para configuração de IAs
const ConfiguracoesIAScreen = ({ navigation }) => {
  const [iasSalvas, setIasSalvas] = useState({});
  const [iaAtual, setIaAtual] = useState('GEMINI');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    carregarConfiguracoes();
  }, []);
  
  const carregarConfiguracoes = async () => {
    try {
      // Carregar IA padrão
      const defaultIA = await AsyncStorage.getItem('ia_padrao');
      if (defaultIA) setIaAtual(defaultIA);
      
      // Carregar status das IAs
      const iasStatus = {};
      for (const [key, value] of Object.entries(IA_APIS)) {
        const apiKey = await getIAAPIKey(key);
        iasStatus[key] = {
          configurada: value.chaveNecessaria ? !!apiKey : true,
          apiKey: apiKey
        };
      }
      
      setIasSalvas(iasStatus);
      
      // Carregar a API key da IA selecionada
      if (defaultIA) {
        const currentKey = await getIAAPIKey(defaultIA);
        setApiKey(currentKey);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      Alert.alert('Erro', 'Não foi possível carregar as configurações das IAs.');
    }
  };
  
  const salvarConfiguracao = async () => {
    setIsSaving(true);
    try {
      // Salvar a IA padrão
      await AsyncStorage.setItem('ia_padrao', iaAtual);
      
      // Salvar a API key da IA selecionada
      await salvarIAAPIKey(iaAtual, apiKey);
      
      // Atualizar o estado
      const novasIasSalvas = { ...iasSalvas };
      novasIasSalvas[iaAtual] = {
        configurada: IA_APIS[iaAtual].chaveNecessaria ? !!apiKey : true,
        apiKey: apiKey
      };
      setIasSalvas(novasIasSalvas);
      
      Alert.alert('Sucesso', `Configuração de ${IA_APIS[iaAtual].nome} salva com sucesso!`);
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      Alert.alert('Erro', 'Não foi possível salvar a configuração.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const selecionarIA = async (tipoIA) => {
    setIaAtual(tipoIA);
    const key = await getIAAPIKey(tipoIA);
    setApiKey(key || '');
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurar IAs</Text>
      </View>
      
      <ScrollView style={styles.configContent}>
        <Text style={styles.configTitle}>Selecione uma IA para configurar:</Text>
        
        <View style={styles.iasList}>
          {Object.entries(IA_APIS).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.iaItem,
                iaAtual === key && styles.iaItemSelected
              ]}
              onPress={() => selecionarIA(key)}
            >
              <Text style={[
                styles.iaItemText,
                iaAtual === key && styles.iaItemTextSelected
              ]}>
                {value.nome}
              </Text>
              {iasSalvas[key]?.configurada && (
                <View style={styles.configuredBadge}>
                  <Text style={styles.configuredBadgeText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        {IA_APIS[iaAtual]?.chaveNecessaria ? (
          <View style={styles.apiKeyContainer}>
            <Text style={styles.apiKeyLabel}>
              API Key para {IA_APIS[iaAtual]?.nome}:
            </Text>
            <TextInput
              style={styles.apiKeyInput}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Insira sua API Key aqui"
              secureTextEntry={true}
            />
            <Text style={styles.apiKeyHelper}>
              Você pode obter sua API Key em: {getApiKeySourceForIA(iaAtual)}
            </Text>
          </View>
        ) : (
          <View style={styles.noApiKeyContainer}>
            <Text style={styles.noApiKeyText}>
              {IA_APIS[iaAtual]?.nome} não necessita de API Key.
            </Text>
          </View>
        )}
        
        <TouchableOpacity
          style={[
            styles.saveButton,
            (isSaving) && styles.saveButtonDisabled
          ]}
          onPress={salvarConfiguracao}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Configuração</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// Telas
const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    // Simular carregamento
    const timer = setTimeout(() => {
      if (navigation && navigation.replace) {
        navigation.replace('Auth');
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.splashContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <Text style={styles.splashTitle}>CurriculoBot</Text>
      <Text style={styles.splashSubtitle}>Premium</Text>
      <ActivityIndicator size="large" color={Colors.white} style={{ marginTop: 20 }} />
    </SafeAreaView>
  );
};

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      // Login bem-sucedido
    } else {
      Alert.alert('Erro', result.message || 'Erro ao fazer login.');
    }
  };

  return (
    <SafeAreaView style={styles.authContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.authHeader}>
        <Text style={styles.authTitle}>Login</Text>
        <Text style={styles.authSubtitle}>Entre na sua conta para continuar</Text>
      </View>
      
      <View style={styles.authForm}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>Entrar</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.textButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.textButtonText}>Não tem uma conta? Cadastre-se</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const RegisterScreen = ({ navigation }) => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!nome || !email || !password || !confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const result = await register(nome, email, password);
    setLoading(false);

    if (result.success) {
      // Registro bem-sucedido
    } else {
      Alert.alert('Erro', result.message || 'Erro ao fazer cadastro.');
    }
  };

  return (
    <SafeAreaView style={styles.authContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.authHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.authTitle}>Cadastro</Text>
        <Text style={styles.authSubtitle}>Crie sua conta para continuar</Text>
      </View>
      
      <View style={styles.authForm}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu nome"
            value={nome}
            onChangeText={setNome}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Confirmar Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirme sua senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>
        
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>Cadastrar</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.textButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.textButtonText}>Já tem uma conta? Faça login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.homeContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <View style={styles.homeHeader}>
        <Text style={styles.homeTitle}>CurriculoBot</Text>
        <Text style={styles.homeSubtitle}>
          Seu assistente para criação de currículos
        </Text>
        
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
        >
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.homeContent}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.homeScrollContent}
        >
          <Text style={styles.welcomeText}>Olá, {user?.nome || 'visitante'}!</Text>
          
          <View style={styles.featureSection}>
            <Text style={styles.featureSectionTitle}>Criar Currículo</Text>
            <View style={styles.featureCard}>
              <Text style={styles.featureTitle}>Novo Currículo</Text>
              <Text style={styles.featureDescription}>
                Crie um currículo do zero através de uma conversa intuitiva com nosso assistente.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('Chatbot')}
              >
                <Text style={styles.primaryButtonText}>Começar Agora</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.featureSection}>
            <Text style={styles.featureSectionTitle}>Análise com IA</Text>
            <View style={styles.featureCard}>
              <Text style={styles.featureTitle}>Analise seu Currículo</Text>
              <Text style={styles.featureDescription}>
                Use nossa inteligência artificial para analisar seu currículo, receber pontuação, dicas de melhorias, sugestões de carreira e muito mais.
              </Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('CurriculosAnalise')}
              >
                <Text style={styles.secondaryButtonText}>Analisar Currículo</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.featureSection}>
            <Text style={styles.featureSectionTitle}>Seus Currículos</Text>
            <TouchableOpacity
              style={[styles.featureCard, styles.compactCard]}
              onPress={() => navigation.navigate('MeusCurriculos')}
            >
              <Text style={styles.featureTitle}>Gerenciar Currículos</Text>
              <Text style={styles.featureDescription}>
                Visualize, edite e compartilhe seus currículos salvos.
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.featureSection}>
            <Text style={styles.featureSectionTitle}>Configurações</Text>
            <TouchableOpacity
              style={[styles.featureCard, styles.compactCard]}
              onPress={() => {
                console.log('Navegando para ConfiguracoesIA');
                // Adicione uma verificação para ver se a navegação está funcionando
                if (navigation && navigation.navigate) {
                  try {
                    navigation.navigate('ConfiguracoesIA');
                  } catch (error) {
                    console.error('Erro ao navegar:', error);
                    Alert.alert('Erro', 'Não foi possível acessar essa tela no momento.');
                  }
                } else {
                  console.error('Navigation não está disponível');
                  Alert.alert('Erro', 'Navegação não disponível.');
                }
              }}
            >
              <Text style={styles.featureTitle}>Configurar IAs</Text>
              <Text style={styles.featureDescription}>
                Escolha qual IA usar para análise e configure suas chaves de API.
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Seção Sobre */}
          <View style={styles.featureSection}>
            <Text style={styles.featureSectionTitle}>Sobre o App</Text>
            <View style={[styles.featureCard, styles.compactCard]}>
              <Text style={styles.featureTitle}>CurriculoBot Premium</Text>
              <Text style={styles.featureDescription}>
                Versão: 1.2.0
              </Text>
              <Text style={styles.featureDescription}>
                Este aplicativo utiliza tecnologia de inteligência artificial para ajudar na criação e análise de currículos.
              </Text>
            </View>
          </View>
          
          {/* Espaço adicional no final do scroll */}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const ChatbotScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [options, setOptions] = useState(['Começar']);
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState('boas_vindas');
  const [cvData, setCvData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const { user } = useAuth();
  const flatListRef = useRef();
  
  // Inicializar com mensagem de boas-vindas
  useEffect(() => {
    const welcomeMessage = {
      id: getUniqueId(),
      text: "Olá! Sou o CurriculoBot, seu assistente para criar um currículo profissional. Digite 'começar' quando estiver pronto!",
      isUser: false,
      time: getCurrentTime()
    };
    
    setMessages([welcomeMessage]);
  }, []);
  
  const addBotMessage = (text) => {
    setIsTyping(true);
    
    // Simular tempo de digitação do bot
    setTimeout(() => {
      const newMessage = {
        id: getUniqueId(),
        text,
        isUser: false,
        time: getCurrentTime()
      };
      
      setMessages(prevMessages => [...prevMessages, newMessage]);
      setIsTyping(false);
      
      // Rolar para o final da lista
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 1000);
  };
  
  const handleSendMessage = () => {
    if (currentMessage.trim() === '') return;
    
    // Adicionar mensagem do usuário
    const userMessage = {
      id: getUniqueId(),
      text: currentMessage,
      isUser: true,
      time: getCurrentTime()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Processar a mensagem
    const { response, nextStep, options: newOptions, cvData: newCvData, isFinished } = 
      processMessage(currentMessage, currentStep, cvData);
    
    // Atualizar estado
    setCvData(newCvData);
    setCurrentStep(nextStep);
    setOptions(newOptions || []);
    
    // Limpar campo de entrada
    setCurrentMessage('');
    
    // Adicionar resposta do bot
    addBotMessage(response);
    
    // Salvar currículo se finalizado
    if (isFinished) {
      salvarCurriculo(newCvData, user.id)
        .then(id => {
          console.log('Currículo salvo com ID:', id);
        })
        .catch(error => {
          console.error('Erro ao salvar currículo:', error);
          Alert.alert('Erro', 'Não foi possível salvar o currículo.');
        });
    }
    
    // Rolar para o final da lista
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };
  
  const handleOptionSelect = (option) => {
    setCurrentMessage(option);
    handleSendMessage();
  };
  
  return (
    <SafeAreaView style={styles.chatContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />
      
      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.chatBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.chatBackButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.chatHeaderTitle}>CurriculoBot</Text>
        <TouchableOpacity 
          style={styles.previewToggle}
          onPress={() => setShowPreview(!showPreview)}
        >
          <Text style={styles.previewToggleText}>
            {showPreview ? 'Esconder Prévia' : 'Ver Prévia'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.chatContent}>
        {showPreview ? (
          <ScrollView style={styles.previewScroll}>
            <CurriculumPreview data={cvData} />
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatMessage
                message={item.text}
                isUser={item.isUser}
                time={item.time}
              />
            )}
            contentContainerStyle={styles.messagesContainer}
          />
        )}
        
        {!showPreview && options && options.length > 0 && (
          <ChatOptions options={options} onSelect={handleOptionSelect} />
        )}
        
        {!showPreview && isTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>Bot está digitando...</Text>
          </View>
        )}
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder="Digite sua mensagem..."
            value={currentMessage}
            onChangeText={setCurrentMessage}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSendMessage}
            disabled={currentMessage.trim() === ''}
          >
            <Text style={styles.sendButtonText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const MeusCurriculosScreen = ({ navigation }) => {
  const [curriculos, setCurriculos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  
  const loadCurriculos = async () => {
    try {
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      setCurriculos(cvs ? JSON.parse(cvs) : []);
    } catch (error) {
      console.error('Erro ao carregar currículos:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus currículos.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadCurriculos();
    
    // Atualizar quando a tela ganhar foco
    const unsubscribe = navigation.addListener('focus', () => {
      loadCurriculos();
    });
    
    return unsubscribe;
  }, [navigation]);
  
  const handleDeleteCV = (id) => {
    Alert.alert(
      "Excluir Currículo",
      "Tem certeza que deseja excluir este currículo?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
              const curriculosArray = cvs ? JSON.parse(cvs) : [];
              
              const updatedCurriculos = curriculosArray.filter(cv => cv.id !== id);
              
              await AsyncStorage.setItem(`curriculos_${user.id}`, JSON.stringify(updatedCurriculos));
              
              setCurriculos(updatedCurriculos);
            } catch (error) {
              console.error('Erro ao excluir currículo:', error);
              Alert.alert('Erro', 'Não foi possível excluir o currículo.');
            }
          }
        }
      ]
    );
  };
  
  const handleViewCV = (cv) => {
    navigation.navigate('PreviewCV', { curriculoData: cv });
  };
  
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>Nenhum Currículo Encontrado</Text>
      <Text style={styles.emptyStateText}>
        Você ainda não criou nenhum currículo. Comece agora mesmo!
      </Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Chatbot')}
      >
        <Text style={styles.primaryButtonText}>Criar Currículo</Text>
      </TouchableOpacity>
    </View>
  );
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meus Currículos</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 10 }}>Carregando currículos...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Currículos</Text>
      </View>
      
      {curriculos.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={curriculos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.cvListItemWithActions}>
              <TouchableOpacity 
                style={styles.cvListItem}
                onPress={() => handleViewCV(item)}
              >
                <View style={styles.cvListItemContent}>
                  <Text style={styles.cvListItemTitle}>{item.nome || 'Currículo sem nome'}</Text>
                  <Text style={styles.cvListItemDate}>{formatDate(item.dataCriacao)}</Text>
                </View>
                <Text style={styles.cvListItemArrow}>›</Text>
              </TouchableOpacity>
              
              <View style={styles.cvListItemActions}>
                <TouchableOpacity
                  style={styles.cvActionButton}
                  onPress={() => navigation.navigate('AnaliseCV', { curriculoData: item })}
                >
                  <Text style={styles.cvActionButtonText}>Analisar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.cvActionButton, { backgroundColor: Colors.danger }]}
                  onPress={() => handleDeleteCV(item.id)}
                >
                  <Text style={styles.cvActionButtonText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
      
      {curriculos.length > 0 && (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => navigation.navigate('Chatbot')}
        >
          <Text style={styles.fabButtonText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const PreviewCVScreen = ({ route, navigation }) => {
  const { curriculoData } = route.params;
  
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Currículo de ${curriculoData.nome || 'Usuário'}`,
        title: `Currículo - ${curriculoData.nome || 'Usuário'}`
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o currículo.');
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visualizar Currículo</Text>
      </View>
      
      <ScrollView style={styles.previewScreenScroll}>
        <View style={styles.previewScreenCard}>
          <CurriculumPreview data={curriculoData.data} />
        </View>
      </ScrollView>
      
      <View style={styles.previewActions}>
        <TouchableOpacity
          style={styles.previewActionButton}
          onPress={handleShare}
        >
          <Text style={styles.previewActionButtonText}>Compartilhar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.previewActionButton, { backgroundColor: Colors.secondary }]}
          onPress={() => navigation.navigate('AnaliseCV', { curriculoData })}
        >
          <Text style={styles.previewActionButtonText}>Analisar com IA</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const CurriculosAnaliseScreen = ({ navigation }) => {
  const [curriculos, setCurriculos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  
  const loadCurriculos = async () => {
    try {
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      setCurriculos(cvs ? JSON.parse(cvs) : []);
    } catch (error) {
      console.error('Erro ao carregar currículos:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus currículos.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadCurriculos();
  }, []);
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analisar Currículo</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 10 }}>Carregando currículos...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (curriculos.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analisar Currículo</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Nenhum Currículo Encontrado</Text>
          <Text style={styles.emptyStateText}>
            Você precisa criar um currículo antes de usar a análise de IA.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Chatbot')}
          >
            <Text style={styles.primaryButtonText}>Criar Currículo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analisar Currículo</Text>
      </View>
      
      <View style={styles.analysisIntroContainer}>
        <Text style={styles.analysisIntroTitle}>Análise de Currículo com IA</Text>
        <Text style={styles.analysisIntroText}>
          Nossa tecnologia de IA analisará seu currículo e fornecerá feedback detalhado, pontuações, sugestões de melhoria, dicas de carreira e recomendações personalizadas.
        </Text>
      </View>
      
      <Text style={styles.sectionTitle}>Selecione um currículo para analisar:</Text>
      
      <FlatList
        data={curriculos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.analysisCvItem}
            onPress={() => navigation.navigate('AnaliseCV', { curriculoData: item })}
          >
            <View style={styles.analysisCvItemContent}>
              <Text style={styles.analysisCvItemTitle}>{item.nome || 'Currículo sem nome'}</Text>
              <Text style={styles.analysisCvItemDate}>{formatDate(item.dataCriacao)}</Text>
            </View>
            <Text style={styles.analysisCvItemArrow}>›</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

// Tela de Análise do CV com IA
const AnaliseCVScreen = ({ route, navigation }) => {
  const { curriculoData } = route.params;
  const [activeTab, setActiveTab] = useState('pontuacao');
  const [analiseResultado, setAnaliseResultado] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingOfflineMode, setUsingOfflineMode] = useState(false);
  const [preferOffline, setPreferOffline] = useState(false);
  const [selectedIA, setSelectedIA] = useState('GEMINI');
  const [iaOptions, setIaOptions] = useState([]);
  
  useEffect(() => {
    carregarIAsConfiguradas();
  }, []);
  
  useEffect(() => {
    fetchAnalise();
  }, [activeTab, preferOffline, selectedIA]);
  
  const carregarIAsConfiguradas = async () => {
    try {
      // Carregar IA padrão
      const defaultIA = await AsyncStorage.getItem('ia_padrao');
      if (defaultIA && IA_APIS[defaultIA]) {
        setSelectedIA(defaultIA);
      }
      
      // Verificar quais IAs estão configuradas
      const options = [];
      for (const [key, value] of Object.entries(IA_APIS)) {
        const apiKey = await getIAAPIKey(key);
        if (!value.chaveNecessaria || apiKey) {
          options.push({
            id: key,
            nome: value.nome
          });
        }
      }
      
      // Sempre incluir o modo offline
      options.push({
        id: 'OFFLINE',
        nome: 'Modo Offline'
      });
      
      setIaOptions(options);
    } catch (error) {
      console.error('Erro ao carregar IAs configuradas:', error);
    }
  };
  
  const fetchAnalise = async () => {
    setLoading(true);
    setError(null);
    setUsingOfflineMode(false);
    setProviderInfo(null);
    
    try {
      const tipoIA = selectedIA === 'OFFLINE' ? 'OFFLINE' : selectedIA;
      const resultado = await analisarCurriculoComIA(
        curriculoData.data, 
        activeTab, 
        tipoIA,
        preferOffline
      );
      
      if (resultado.offline || tipoIA === 'OFFLINE') {
        setUsingOfflineMode(true);
      }
      
      if (resultado.success) {
        setAnaliseResultado(resultado.analise);
        setProviderInfo(resultado.provider || 'IA Não Identificada');
      } else {
        setError(resultado.message || 'Erro ao analisar currículo');
      }
    } catch (error) {
      console.error('Erro ao buscar análise:', error);
      setError('Ocorreu um erro ao analisar o currículo');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleOfflineMode = () => {
    setPreferOffline(!preferOffline);
  };
  
  // Render do seletor de IA
  const renderIASelector = () => (
    <View style={styles.iaSelectorContainer}>
      <Text style={styles.iaSelectorLabel}>Analisar com:</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.iaOptionsContainer}
      >
        {iaOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.iaOptionButton,
              selectedIA === option.id && styles.iaOptionButtonSelected
            ]}
            onPress={() => setSelectedIA(option.id)}
          >
            <Text 
              style={[
                styles.iaOptionText,
                selectedIA === option.id && styles.iaOptionTextSelected
              ]}
            >
              {option.nome}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {providerInfo && (
        <Text style={styles.providerInfo}>
          Análise fornecida por: {providerInfo}
        </Text>
      )}
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Análise com IA</Text>
        
        <TouchableOpacity 
          style={styles.modeToggleButton}
          onPress={toggleOfflineMode}
        >
          <Text style={styles.modeToggleText}>
            {preferOffline ? 'Usar Online' : 'Usar Offline'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.cvAnalysisHeader}>
        <Text style={styles.cvAnalysisTitle}>
          Análise do currículo: {curriculoData.nome || 'Sem nome'}
        </Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.analysisTabs}
        contentContainerStyle={styles.analysisTabsContent}
      >
        <TouchableOpacity
          style={[
            styles.analysisTab,
            activeTab === 'pontuacao' && styles.activeAnalysisTab
          ]}
          onPress={() => setActiveTab('pontuacao')}
        >
          <Text 
            style={[
              styles.analysisTabText,
              activeTab === 'pontuacao' && styles.activeAnalysisTabText
            ]}
          >
            Pontuação
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.analysisTab,
            activeTab === 'melhorias' && styles.activeAnalysisTab
          ]}
          onPress={() => setActiveTab('melhorias')}
        >
          <Text 
            style={[
              styles.analysisTabText,
              activeTab === 'melhorias' && styles.activeAnalysisTabText
            ]}
          >
            Melhorias
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.analysisTab,
            activeTab === 'dicas' && styles.activeAnalysisTab
          ]}
          onPress={() => setActiveTab('dicas')}
        >
          <Text 
            style={[
              styles.analysisTabText,
              activeTab === 'dicas' && styles.activeAnalysisTabText
            ]}
          >
            Dicas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.analysisTab,
            activeTab === 'cursos' && styles.activeAnalysisTab
          ]}
          onPress={() => setActiveTab('cursos')}
        >
          <Text 
            style={[
              styles.analysisTabText,
              activeTab === 'cursos' && styles.activeAnalysisTabText
            ]}
          >
            Cursos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.analysisTab,
            activeTab === 'vagas' && styles.activeAnalysisTab
          ]}
          onPress={() => setActiveTab('vagas')}
        >
          <Text 
            style={[
              styles.analysisTabText,
              activeTab === 'vagas' && styles.activeAnalysisTabText
            ]}
          >
            Vagas
          </Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Selector de IA */}
      {renderIASelector()}
      
      {usingOfflineMode && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Usando análise offline - Algumas funcionalidades podem estar limitadas.
          </Text>
        </View>
      )}
      
      {loading ? (
        <View style={styles.loadingAnalysisContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingAnalysisText}>Analisando seu currículo...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchAnalise()}
          >
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.analysisResultContainer}>
          {/* Use o componente Markdown para renderizar o texto formatado */}
          <Markdown
            style={{
              body: styles.analysisResultText,
              heading1: { 
                fontSize: 22, 
                fontWeight: 'bold', 
                marginBottom: 10, 
                color: Colors.dark,
                borderBottomWidth: 1,
                borderBottomColor: Colors.mediumGray,
                paddingBottom: 5,
              },
              heading2: { 
                fontSize: 20, 
                fontWeight: 'bold', 
                marginBottom: 10,
                marginTop: 15,
                color: Colors.dark 
              },
              heading3: { 
                fontSize: 18, 
                fontWeight: 'bold', 
                marginTop: 10,
                marginBottom: 5,
                color: Colors.dark 
              },
              paragraph: { 
                fontSize: 16, 
                lineHeight: 24,
                marginBottom: 10,
                color: Colors.dark 
              },
              list_item: {
                marginBottom: 5,
                flexDirection: 'row',
                alignItems: 'flex-start',
              },
              bullet_list: {
                marginVertical: 10,
              },
              strong: {
                fontWeight: 'bold',
              },
              em: {
                fontStyle: 'italic',
              },
              ordered_list: {
                marginVertical: 10,
              },
              hr: {
                backgroundColor: Colors.mediumGray,
                height: 1,
                marginVertical: 15,
              },
              blockquote: {
                borderLeftWidth: 3,
                borderLeftColor: Colors.primary,
                paddingLeft: 10,
                marginVertical: 10,
                backgroundColor: Colors.lightGray,
                padding: 10,
                borderRadius: 5,
              },
            }}
          >
            {analiseResultado}
          </Markdown>
          
          {/* Adicione também um botão para compartilhar a análise */}
          <TouchableOpacity
            style={[styles.shareAnalysisButton, {marginTop: 20}]}
            onPress={() => {
              Share.share({
                message: analiseResultado,
                title: `Análise do Currículo - ${curriculoData.nome || 'Sem nome'}`
              });
            }}
          >
            <Text style={styles.shareAnalysisButtonText}>Compartilhar Análise</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// Rotas de Autenticação
const AuthStack = createStackNavigator();

const AuthNavigator = () => (
  <AuthStack.Navigator 
    screenOptions={{ 
      headerShown: false,
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

// Rotas do App
const AppStack = createStackNavigator();

const AppNavigator = () => (
  <AppStack.Navigator
    screenOptions={{
      headerShown: false
    }}
  >
    <AppStack.Screen name="Home" component={HomeScreen} />
    <AppStack.Screen name="Chatbot" component={ChatbotScreen} />
    <AppStack.Screen name="MeusCurriculos" component={MeusCurriculosScreen} />
    <AppStack.Screen name="PreviewCV" component={PreviewCVScreen} />
    <AppStack.Screen name="CurriculosAnalise" component={CurriculosAnaliseScreen} />
    <AppStack.Screen name="AnaliseCV" component={AnaliseCVScreen} />
    <AppStack.Screen name="ConfiguracoesIA" component={ConfiguracoesIAScreen} />
  </AppStack.Navigator>
);

// Controlador de Rotas
const RootStack = createStackNavigator();

const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <RootStack.Screen name="App" component={AppNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
};

// Estilos
const styles = StyleSheet.create({

  aboutContainer: {
    flex: 1,
    padding: 20,
  },
  aboutSection: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginHorizontal: 2,
  },

  chatContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa', // Fundo mais claro e agradável
  },
  chatHeader: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  chatHeaderTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatContent: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  botMessageContainer: {
    backgroundColor: Colors.white,
    alignSelf: 'flex-start',
    borderTopLeftRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  userMessageContainer: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    borderTopRightRadius: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  botMessageText: {
    color: '#333333', // Cor mais escura para melhor contraste
  },
  userMessageText: {
    color: '#ffffff', // Branco
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.7,
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  
  // Melhorar a área de digitação
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginRight: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 18,
  },
  
  // Opções de chat melhoradas
  optionsContainer: {
    padding: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  optionButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  optionText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Indicador de digitação
  typingContainer: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginHorizontal: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    color: Colors.primary,
    fontSize: 14,
    marginLeft: 8,
  },


  // Geral
  container: {
    flex: 1,
    backgroundColor: Colors.light,
  },
  header: {
    backgroundColor: Colors.dark,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    marginRight: 10,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 10,
  },
  emptyStateText: {
    textAlign: 'center',
    color: Colors.lightText,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    minWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primaryButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: 15,
    alignItems: 'center',
    minWidth: 200,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Splash Screen
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.white,
  },
  splashSubtitle: {
    fontSize: 20,
    color: Colors.white,
    opacity: 0.8,
  },
  
  // Autenticação
  authContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  authHeader: {
    padding: 30,
    paddingTop: 50,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 10,
  },
  authSubtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.8,
  },
  authForm: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    paddingTop: 40,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 5,
  },
  input: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  textButton: {
    alignItems: 'center',
    marginTop: 15,
  },
  textButtonText: {
    color: Colors.primary,
    fontSize: 14,
  },
  
  // Home
  homeContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  homeHeader: {
    padding: 20,
    paddingTop: 30,
    position: 'relative',
  },
  homeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 10,
  },
  homeSubtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 5,
  },
  logoutButton: {
    position: 'absolute',
    top: 30,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 5,
  },
  logoutButtonText: {
    color: Colors.white,
    fontSize: 12,
  },
  homeContent: {
    flex: 1,
    backgroundColor: Colors.light,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 20,
  },
  featureSection: {
    marginBottom: 20,
  },
  featureSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.lightText,
    marginBottom: 10,
  },
  featureCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  compactCard: {
    padding: 15,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 10,
  },
  featureDescription: {
    color: Colors.lightText,
    lineHeight: 22,
    marginBottom: 15,
  },
  
  
  chatBackButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBackButtonText: {
    fontSize: 24,
    color: Colors.white,
  },
  chatHeaderTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewToggle: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  previewToggleText: {
    color: Colors.white,
    fontSize: 12,
  },
  messagesContainer: {
    padding: 15,
    paddingBottom: 20,
  },
  modeToggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  modeToggleText: {
    color: Colors.white,
    fontSize: 12,
  },
  onlineBanner: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
  },
  onlineBannerText: {
    color: Colors.dark,
    fontSize: 14,
  },
  // Prévia do Currículo
  previewScroll: {
    flex: 1,
    padding: 15,
  },
  previewContainer: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyPreview: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPreviewText: {
    textAlign: 'center',
    color: Colors.lightText,
  },
  previewName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingBottom: 5,
  },
  previewContact: {
    color: Colors.dark,
    marginBottom: 10,
  },
  previewLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  previewLink: {
    color: Colors.primary,
    marginRight: 10,
    marginBottom: 5,
  },
  previewSection: {
    marginTop: 15,
    marginBottom: 10,
  },
  previewSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 5,
    marginBottom: 10,
  },
  previewItem: {
    marginBottom: 10,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  previewItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 3,
  },
  previewItemSubtitle: {
    fontWeight: '500',
    marginBottom: 3,
  },
  previewItemDate: {
    color: Colors.lightText,
    fontSize: 14,
  },
  
  // Lista de Currículos
  cvListItemWithActions: {
    backgroundColor: Colors.white,
    marginBottom: 2,
  },
  cvListItem: {
    backgroundColor: Colors.white,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cvListItemContent: {
    flex: 1,
  },
  cvListItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.dark,
    marginBottom: 5,
  },
  cvListItemDate: {
    fontSize: 12,
    color: Colors.lightText,
  },
  cvListItemArrow: {
    fontSize: 24,
    color: Colors.primary,
  },
  cvListItemActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.mediumGray,
  },
  cvActionButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cvActionButtonText: {
    color: Colors.white,
    fontWeight: '500',
    fontSize: 14,
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  fabButtonText: {
    fontSize: 24,
    color: Colors.white,
  },
  
  // Tela de Prévia do Currículo
  previewScreenScroll: {
    flex: 1,
  },
  previewScreenCard: {
    margin: 15,
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  previewActions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  previewActionButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  previewActionButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  
  // Análise com IA
  analysisIntroContainer: {
    backgroundColor: Colors.white,
    padding: 20,
    margin: 15,
    marginBottom: 5,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  analysisIntroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 10,
  },
  analysisIntroText: {
    color: Colors.lightText,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 10,
  },
  analysisCvItem: {
    backgroundColor: Colors.white,
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  analysisCvItemContent: {
    flex: 1,
  },
  analysisCvItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.dark,
    marginBottom: 5,
  },
  analysisCvItemDate: {
    fontSize: 12,
    color: Colors.lightText,
  },
  analysisCvItemArrow: {
    fontSize: 24,
    color: Colors.primary,
  },
  cvAnalysisHeader: {
    backgroundColor: Colors.white,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mediumGray,
  },
  cvAnalysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  analysisTabs: {
    backgroundColor: Colors.white,
  },
  analysisTabsContent: {
    padding: 10,
  },
  analysisTab: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
  },
  activeAnalysisTab: {
    backgroundColor: Colors.primary,
  },
  analysisTabText: {
    color: Colors.dark,
    fontWeight: '500',
  },
  activeAnalysisTabText: {
    color: Colors.white,
  },
  loadingAnalysisContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingAnalysisText: {
    marginTop: 15,
    textAlign: 'center',
    color: Colors.dark,
    fontSize: 16,
  },
  analysisResultContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.white,
  },
  analysisResultText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.dark,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  analysisCard: {
    backgroundColor: Colors.white,
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    borderLeftWidth: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  analysisCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  analysisCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  scoreContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  analysisCardDescription: {
    color: Colors.dark,
    lineHeight: 22,
  },
  
  // Selector de IA
  iaSelectorContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  iaSelectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: Colors.dark,
  },
  iaOptionsContainer: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  iaOptionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.lightGray,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
  },
  iaOptionButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  iaOptionText: {
    fontSize: 13,
    color: Colors.dark,
  },
  iaOptionTextSelected: {
    color: Colors.white,
    fontWeight: '500',
  },
  providerInfo: {
    fontSize: 12,
    color: Colors.lightText,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  offlineBanner: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 15,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  offlineBannerText: {
    color: '#856404',
    fontSize: 14,
  },
  
  // Configuração de IAs
  configContent: {
    flex: 1,
    padding: 20,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: Colors.dark,
  },
  iasList: {
    marginBottom: 20,
  },
  iaItem: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iaItemSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  iaItemText: {
    fontSize: 16,
    color: Colors.dark,
  },
  iaItemTextSelected: {
    color: Colors.white,
    fontWeight: '500',
  },
  configuredBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configuredBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  apiKeyContainer: {
    marginBottom: 20,
  },
  apiKeyLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    color: Colors.dark,
  },
  apiKeyInput: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    marginBottom: 10,
  },
  apiKeyHelper: {
    fontSize: 12,
    color: Colors.lightText,
    fontStyle: 'italic',
  },
  noApiKeyContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  noApiKeyText: {
    color: Colors.info,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.mediumGray,
  },
  saveButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  homeScrollContent: {
    paddingBottom: 30,
    flexGrow: 1,
  },
  shareAnalysisButton: {
  backgroundColor: Colors.secondary,
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 8,
  alignItems: 'center',
  marginBottom: 30,
  },
  shareAnalysisButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

// Componente principal
const App = () => {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
};

export default App;