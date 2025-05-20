import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Share,
  ActivityIndicator,
  Linking,
  Switch,
  Image,
  Animated,
  Dimensions,
  RefreshControl
} from 'react-native';
import ColorsModule from '../styles/colors';
import sharedStyles from '../styles/sharedStyles';
import styles from '../styles/styles';
import meusCurriculosStyles from '../styles/meusCurriculosStyles';
import ProfessionalColors from '../styles/ProfessionalColors';
import curriculoAnaliseStyles from '../styles/curriculoAnaliseStyles';
import HeaderColors from '../styles/HeaderColors'
const Colors = ColorsModule.Colors;
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IA_APIS from '../src/api/IA_APIS';
import salvarIAAPIKey from '../src/api/salvarIAAPIKey';
import getIAAPIKey from '../src/api/getIAAPIKey';
import ConfigAvStackScreen from '../screens/ConfigAvStackScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const DashboardStack = createStackNavigator();
const ConfigStack = createStackNavigator();
const ConfigAvStack = createStackNavigator();
const AuthContext = createContext();
const useAuth = () => useContext(AuthContext);
const AuthStack = createStackNavigator();
const AppStack = createStackNavigator();
const RootStack = createStackNavigator();

const buscarVagasComGemini = async (curriculoData, forceRefresh = false) => {
  try {
    // Verificar cache apenas se não estiver forçando atualização
    if (!forceRefresh) {
      const cacheKey = `vagas_${JSON.stringify(curriculoData).slice(0, 50)}`;
      const cachedResult = await AsyncStorage.getItem(cacheKey);

      if (cachedResult) {
        const parsed = JSON.parse(cachedResult);
        const cacheAge = new Date() - new Date(parsed.timestamp);
        const cacheValidHours = 24;

        if (cacheAge < cacheValidHours * 60 * 60 * 1000) {
          console.log(`Usando resultado em cache para busca de vagas`);
          return {
            success: true,
            vagas: parsed.resultado,
            timestamp: parsed.timestamp,
            fromCache: true
          };
        }
      }
    }

    // Se estamos forçando refresh ou não tem cache válido, proceder com busca
    console.log('Iniciando busca de vagas com IA', forceRefresh ? '(forçando atualização)' : '');

    // Obter API key do Gemini
    const apiKey = await getIAAPIKey('GEMINI');

    if (!apiKey) {
      throw new Error("API key do Google Gemini não configurada");
    }

    // Formatar dados relevantes do currículo para o prompt
    const cv = curriculoData.data;

    // Extrair informações chave do currículo
    const area = cv.informacoes_pessoais?.area || '';
    const nome = `${cv.informacoes_pessoais?.nome || ''} ${cv.informacoes_pessoais?.sobrenome || ''}`.trim();

    // Extrair competências e palavras-chave do currículo
    const habilidades = new Set();

    // De projetos
    if (cv.projetos && cv.projetos.length > 0) {
      cv.projetos.forEach(projeto => {
        if (projeto.habilidades) {
          projeto.habilidades.split(',').forEach(hab => {
            habilidades.add(hab.trim());
          });
        }
      });
    }

    // De experiências
    const experiencias = [];
    if (cv.experiencias && cv.experiencias.length > 0) {
      cv.experiencias.forEach(exp => {
        experiencias.push({
          cargo: exp.cargo,
          empresa: exp.empresa,
          descricao: exp.descricao
        });

        // Extrair palavras-chave das descrições de experiência
        if (exp.descricao) {
          const palavrasChave = exp.descricao
            .split(/[\s,;.]+/)
            .filter(palavra =>
              palavra.length > 4 &&
              !['sobre', 'como', 'para', 'onde', 'quando', 'quem', 'porque', 'então'].includes(palavra.toLowerCase())
            );

          palavrasChave.forEach(palavra => habilidades.add(palavra));
        }
      });
    }

    // De formação
    const formacoes = [];
    if (cv.formacoes_academicas && cv.formacoes_academicas.length > 0) {
      cv.formacoes_academicas.forEach(formacao => {
        formacoes.push({
          diploma: formacao.diploma,
          area: formacao.area_estudo,
          instituicao: formacao.instituicao
        });

        // Adicionar área de estudo às habilidades
        if (formacao.area_estudo) {
          habilidades.add(formacao.area_estudo);
        }
      });
    }

    // De idiomas
    const idiomas = [];
    if (cv.idiomas && cv.idiomas.length > 0) {
      cv.idiomas.forEach(idioma => {
        idiomas.push({
          idioma: idioma.nome,
          nivel: idioma.nivel
        });
      });
    }

    // Adicionar timestamp para diversificar as respostas quando forçar atualização
    const timestamp = new Date().toISOString();

    // Prompt melhorado para garantir informações completas e links funcionais
    const promptText = `
Você é um recrutador e especialista em RH com 15 anos de experiência no mercado brasileiro.

TAREFA: Analisar o perfil profissional abaixo e recomendar 5 vagas reais que estão abertas atualmente no mercado de trabalho brasileiro. Essas vagas devem ser adequadas para o perfil do candidato com base em suas habilidades, experiência e formação.

PERFIL DO CANDIDATO:
Nome: ${nome}
Área de atuação: ${area}
${experiencias.length > 0 ? `
Experiências profissionais:
${experiencias.map(exp => `- ${exp.cargo} na empresa ${exp.empresa}`).join('\n')}
` : ''}

${formacoes.length > 0 ? `
Formação acadêmica:
${formacoes.map(form => `- ${form.diploma} em ${form.area} - ${form.instituicao}`).join('\n')}
` : ''}

${idiomas.length > 0 ? `
Idiomas:
${idiomas.map(idioma => `- ${idioma.idioma}: ${idioma.nivel}`).join('\n')}
` : ''}

Principais competências e palavras-chave:
${Array.from(habilidades).slice(0, 15).join(', ')}

INSTRUÇÕES ESPECÍFICAS:
1. Encontre 5 vagas reais que existem atualmente no mercado brasileiro (2025)
2. As vagas devem ser compatíveis com o perfil, experiência e senioridade do candidato
3. Cada vez que esta consulta for executada, encontre vagas DIFERENTES das anteriores (atual: ${timestamp})

4. Para cada vaga, forneça OBRIGATORIAMENTE todas estas informações:
   - Título da vaga (cargo específico)
   - Nome da empresa
   - Localização (cidade/estado ou remoto)
   - Faixa salarial estimada (baseada em sua expertise de mercado)
   - 5 principais requisitos/qualificações exigidos
   - 3 diferenciais da vaga
   - Link completo e clicável para a vaga (URL completa para LinkedIn, Glassdoor, Indeed, etc.)
   - Breve descrição das responsabilidades (2-3 frases)
   - Avaliação de compatibilidade com o perfil (porcentagem de 0-100% e justificativa)

5. IMPORTANTE SOBRE OS LINKS: Forneça URLs completos e funcionais no formato [texto](url) 
   - Use o formato markdown para links, garantindo que sejam clicáveis
   - Os links devem apontar para plataformas reais como LinkedIn, Glassdoor, Indeed, Catho, etc.
   - Cada vaga DEVE ter pelo menos um link funcional

6. As vagas devem variar em termos de empresas e possibilidades, mostrando diferentes opções no mercado
7. Priorize vagas publicadas nos últimos 30 dias
8. Formate a resposta de forma estruturada usando markdown para facilitar a leitura
9. Inclua uma análise final com recomendações sobre como o candidato pode se destacar ao aplicar para estas vagas

FORMATO DE RESPOSTA:
# Vagas Recomendadas para ${nome}

## Vaga 1: [Título da Vaga] - [Empresa]
**Localização:** [Cidade/Estado ou Remoto]  
**Faixa Salarial:** R$ [valor] - R$ [valor]  

### Descrição:
[2-3 frases sobre as responsabilidades]

### Requisitos:
- [Requisito 1]
- [Requisito 2]
- [Requisito 3]
- [Requisito 4]
- [Requisito 5]

### Diferenciais:
- [Diferencial 1]
- [Diferencial 2]
- [Diferencial 3]

### Link da Vaga:
[Nome da Plataforma](URL completa da vaga)

### Compatibilidade:
**[XX]%** - [Justificativa breve]

[Repetir o formato acima para as 5 vagas]

## Recomendações para se destacar
[3-5 dicas personalizadas]

IMPORTANTE: Todas as vagas informadas devem ser REAIS e ATUAIS (2025), baseando-se em sua base de conhecimento sobre o mercado de trabalho brasileiro atual. Não crie vagas fictícias e SEMPRE forneça TODAS as informações solicitadas, sem omitir nenhum campo.
`;

    console.log('Enviando prompt para busca de vagas:', promptText);

    // Preparar a requisição para o Gemini
    const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
    const requestBody = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: forceRefresh ? 0.4 : 0.2,  // Temperatura ligeiramente mais alta para refresh
        maxOutputTokens: 4000,  // Garantir conteúdo completo
        topP: 0.8,
        topK: 40
      }
    };

    // Fazer a chamada para o Gemini
    const response = await axios.post(endpoint, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000  // 30 segundos
    });

    // Processar a resposta
    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const resultado = response.data.candidates[0].content.parts[0].text;

      // Armazenar no cache
      try {
        const cacheKey = `vagas_${JSON.stringify(curriculoData).slice(0, 50)}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify({
          resultado: resultado,
          timestamp: new Date().toISOString()
        }));
      } catch (cacheError) {
        console.log('Erro ao salvar busca de vagas no cache:', cacheError.message);
      }

      return {
        success: true,
        vagas: resultado,
        timestamp: new Date().toISOString(),
        fromCache: false
      };
    } else {
      throw new Error('Formato de resposta inesperado do Gemini');
    }
  } catch (error) {
    console.error('Erro ao buscar vagas:', error);
    return {
      success: false,
      error: error.message || 'Erro ao buscar vagas com IA'
    };
  }
};

export default buscarVagasComGemini;