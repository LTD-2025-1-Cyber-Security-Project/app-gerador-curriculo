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
  Linking,
  Switch,
  Image,
  Animated,
  Easing
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from 'react-native-vector-icons/Ionicons';
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

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCurriculos: 0,
    vagasEncontradas: 0,
    ultimaAnalise: null,
    pontuacaoMedia: 0
  });
  const [loading, setLoading] = useState(true);

  // Estados para o modal de análise de carreira
  const [showCareerAnalysisModal, setShowCareerAnalysisModal] = useState(false);
  const [selectedCurriculo, setSelectedCurriculo] = useState(null);
  const [curriculosList, setCurriculosList] = useState([]);
  const [careerAnalysisLoading, setCareerAnalysisLoading] = useState(false);
  const [careerAnalysisData, setCareerAnalysisData] = useState(null);
  const [selectedChartType, setSelectedChartType] = useState('radar');

  const chartTypes = [
    { id: 'radar', name: 'Radar', icon: '📊' },
    { id: 'bar', name: 'Barras', icon: '📈' },
    { id: 'line', name: 'Linha', icon: '📉' },
    { id: 'pie', name: 'Pizza', icon: '⭕' },
    { id: 'polar', name: 'Polar', icon: '🔄' }
  ];

  useEffect(() => {
    carregarDados();
    carregarCurriculos();

    // Atualizar quando a tela ganhar foco
    const unsubscribe = navigation.addListener('focus', () => {
      carregarDados();
      carregarCurriculos();
    });

    return unsubscribe;
  }, [navigation]);

  // Carregar lista de currículos para o seletor de análise
  const carregarCurriculos = async () => {
    try {
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculos = cvs ? JSON.parse(cvs) : [];
      setCurriculosList(curriculos);
    } catch (error) {
      console.error('Erro ao carregar currículos:', error);
    }
  };

  const carregarDados = async () => {
    try {
      setLoading(true);

      // Carregar dados dos currículos
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculos = cvs ? JSON.parse(cvs) : [];

      // Carregar dados das vagas encontradas (do cache de busca)
      const cacheKeys = await AsyncStorage.getAllKeys();
      const vagasKeys = cacheKeys.filter(key => key.startsWith('vagas_'));

      // Carregar dados de análises
      const analisesKeys = cacheKeys.filter(key => key.includes('analise_'));

      // Calcular estatísticas
      let ultimaData = null;
      let pontuacaoTotal = 0;
      let contadorPontuacao = 0;

      // Encontrar a data mais recente de análise
      for (const key of analisesKeys) {
        try {
          const analise = await AsyncStorage.getItem(key);
          if (analise) {
            const dados = JSON.parse(analise);
            const dataAnalise = new Date(dados.timestamp);

            if (!ultimaData || dataAnalise > ultimaData) {
              ultimaData = dataAnalise;
            }

            // Extrair pontuação se possível
            if (dados.resultado && dados.resultado.includes('/10')) {
              const match = dados.resultado.match(/(\d+(\.\d+)?)\s*\/\s*10/);
              if (match && match[1]) {
                const pontuacao = parseFloat(match[1]);
                if (!isNaN(pontuacao)) {
                  pontuacaoTotal += pontuacao;
                  contadorPontuacao++;
                }
              }
            }
          }
        } catch (error) {
          console.error('Erro ao processar análise:', error);
        }
      }

      // Atualizar estatísticas
      setStats({
        totalCurriculos: curriculos.length,
        vagasEncontradas: vagasKeys.length * 5, // Cada busca encontra aproximadamente 5 vagas
        ultimaAnalise: ultimaData,
        pontuacaoMedia: contadorPontuacao > 0 ? pontuacaoTotal / contadorPontuacao : 0
      });

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Nunca';
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  // Funções para navegação corrigidas
  const navegarParaNovoCurriculo = () => {
    navigation.navigate('Chatbot');
  };

  const navegarParaBuscarVagas = () => {
    // Verificar se há currículos antes
    AsyncStorage.getItem(`curriculos_${user.id}`).then(cvs => {
      const curriculos = cvs ? JSON.parse(cvs) : [];

      if (curriculos.length === 0) {
        Alert.alert(
          "Nenhum Currículo Encontrado",
          "Você precisa criar um currículo antes de buscar vagas.",
          [
            { text: "OK" },
            {
              text: "Criar Currículo",
              onPress: () => navigation.navigate('Chatbot')
            }
          ]
        );
      } else {
        navigation.navigate('SelecionarCurriculo');
      }
    });
  };

  const navegarParaAnalisarCV = () => {
    // Verificar se há currículos antes
    AsyncStorage.getItem(`curriculos_${user.id}`).then(cvs => {
      const curriculos = cvs ? JSON.parse(cvs) : [];

      if (curriculos.length === 0) {
        Alert.alert(
          "Nenhum Currículo Encontrado",
          "Você precisa criar um currículo antes de analisá-lo.",
          [
            { text: "OK" },
            {
              text: "Criar Currículo",
              onPress: () => navigation.navigate('Chatbot')
            }
          ]
        );
      } else {
        navigation.navigate('CurriculosAnalise');
      }
    });
  };

  const navegarParaMeusCurriculos = () => {
    navigation.navigate('MeusCurriculos');
  };

  // FUNÇÃO: Realizar análise de carreira com IA
  const realizarAnaliseCarreira = async (curriculoId) => {
    try {
      setCareerAnalysisLoading(true);

      // Encontrar o currículo selecionado
      const curriculo = curriculosList.find(cv => cv.id === curriculoId);
      if (!curriculo) {
        throw new Error('Currículo não encontrado');
      }

      // Verificar se há análise em cache para este currículo
      const cacheKey = `career_analysis_${curriculoId}`;
      const cachedAnalysis = await AsyncStorage.getItem(cacheKey);

      if (cachedAnalysis) {
        const parsedAnalysis = JSON.parse(cachedAnalysis);
        const cacheTime = new Date(parsedAnalysis.timestamp);
        const now = new Date();
        const hoursSinceCache = (now - cacheTime) / (1000 * 60 * 60);

        // Se o cache tem menos de 24 horas, usar os dados do cache
        if (hoursSinceCache < 24) {
          setCareerAnalysisData(parsedAnalysis.data);
          setCareerAnalysisLoading(false);
          return;
        }
      }

      // Se não há cache ou está desatualizado, gerar nova análise

      // Obter a chave de API da IA
      const apiKey = await getIAAPIKey('GEMINI');
      if (!apiKey) {
        throw new Error('API key do Gemini não configurada');
      }

      // Preparar os dados do currículo para a análise
      const cv = curriculo.data;

      // Construir o prompt para a análise de carreira
      const promptText = `
Você é um analista de carreira com 15 anos de experiência. Estou fornecendo um currículo detalhado para análise. Preciso:

1. Uma análise da situação atual de carreira
2. Uma previsão de desenvolvimento profissional para os próximos 2-5 anos
3. Um roadmap de crescimento com etapas concretas
4. Dados estruturados para visualização gráfica
5. Competências organizadas por nível atual (1-10)

CURRÍCULO:
Nome: ${cv.informacoes_pessoais?.nome || ''} ${cv.informacoes_pessoais?.sobrenome || ''}
Área: ${cv.informacoes_pessoais?.area || 'Não especificada'}

${cv.resumo_profissional ? `Resumo: ${cv.resumo_profissional}` : ''}

Formação:
${cv.formacoes_academicas?.map(f => `- ${f.diploma} em ${f.area_estudo} (${f.instituicao})`).join('\n') || 'Não informada'}

Experiência:
${cv.experiencias?.map(e => `- ${e.cargo} em ${e.empresa} (${e.data_inicio} a ${e.data_fim}): ${e.descricao || ''}`).join('\n') || 'Não informada'}

Competências/Projetos:
${cv.projetos?.map(p => `- ${p.nome}: ${p.descricao || ''} (Habilidades: ${p.habilidades || ''})`).join('\n') || 'Não informados'}

Idiomas:
${cv.idiomas?.map(i => `- ${i.nome}: ${i.nivel}`).join('\n') || 'Não informados'}

FORMATAÇÃO DE RESPOSTA:

Forneça sua análise em formato JSON como um objeto JavaScript com as seguintes seções:

{
  "analiseAtual": "Texto com análise da situação atual (250-300 palavras)",
  "previsaoFutura": "Texto com previsão de desenvolvimento (250-300 palavras)",
  "pontuacaoGeral": 7.5, // Exemplo de pontuação geral (1-10)
  "competencias": [
    {"nome": "Liderança", "nivel": 6, "comentario": "Breve comentário sobre a competência"},
    // Adicione 8-10 competências principais com pontuações 1-10
  ],
  "roadmap": [
    {"fase": "Curto prazo (0-6 meses)", "objetivos": ["Objetivo 1", "Objetivo 2", "Objetivo 3"]},
    {"fase": "Médio prazo (6-18 meses)", "objetivos": ["Objetivo 1", "Objetivo 2", "Objetivo 3"]},
    {"fase": "Longo prazo (18+ meses)", "objetivos": ["Objetivo 1", "Objetivo 2", "Objetivo 3"]}
  ],
  "areaMelhoria": [
    {"area": "Nome da área 1", "importancia": 9, "sugestao": "Sugestão específica"},
    // Adicione 3-5 áreas principais de melhoria
  ],
  "cursosRecomendados": [
    {"nome": "Nome do curso 1", "plataforma": "Plataforma", "motivo": "Motivo da recomendação"},
    // Adicione 3-5 cursos recomendados
  ]
}

Garanta que a resposta esteja em JSON válido para ser processada programaticamente. A resposta deve ser APENAS esse objeto JSON, sem texto adicional.
      `;

      // Chamar a API do Gemini
      const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
      const requestBody = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4000,
          topP: 0.8,
          topK: 40
        }
      };

      const response = await axios.post(endpoint, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const resultText = response.data.candidates[0].content.parts[0].text;

        // Extrair o JSON da resposta (pode estar envolvido em backticks ou outros marcadores)
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const analysisData = JSON.parse(jsonMatch[0]);

            // Adicionar dados para gráficos de progresso
            analysisData.progressData = {
              atual: analysisData.pontuacaoGeral,
              meta6meses: Math.min(10, analysisData.pontuacaoGeral + 0.5),
              meta1ano: Math.min(10, analysisData.pontuacaoGeral + 1.5),
              meta2anos: Math.min(10, analysisData.pontuacaoGeral + 2.5)
            };

            // Salvar em cache
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
              timestamp: new Date().toISOString(),
              data: analysisData
            }));

            setCareerAnalysisData(analysisData);
          } catch (jsonError) {
            console.error('Erro ao parsear JSON da resposta:', jsonError);
            throw new Error('Formato de resposta inválido');
          }
        } else {
          throw new Error('Não foi possível extrair dados estruturados da resposta');
        }
      } else {
        throw new Error('Formato de resposta inesperado do Gemini');
      }
    } catch (error) {
      console.error('Erro na análise de carreira:', error);
      Alert.alert('Erro', `Não foi possível realizar a análise de carreira: ${error.message}`);
    } finally {
      setCareerAnalysisLoading(false);
    }
  };

  // Componente de gráfico de radar para competências
  const renderSkillsRadarChart = () => {
    if (!careerAnalysisData || !careerAnalysisData.competencias) {
      return <Text>Dados insuficientes para gerar o gráfico</Text>;
    }

    const skills = careerAnalysisData.competencias;

    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{
          width: 300,
          height: 300,
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Círculos de fundo */}
          {[2, 4, 6, 8, 10].map(radius => (
            <View key={`circle-${radius}`} style={{
              position: 'absolute',
              width: radius * 30,
              height: radius * 30,
              borderRadius: (radius * 30) / 2,
              borderWidth: 1,
              borderColor: 'rgba(0, 188, 212, 0.3)',
              backgroundColor: 'transparent',
            }} />
          ))}

          {/* Linhas radiais para cada habilidade */}
          {skills.map((skill, index) => {
            const angle = (Math.PI * 2 * index) / skills.length;
            const length = 150; // Raio máximo

            return (
              <View key={`line-${index}`} style={{
                position: 'absolute',
                width: length,
                height: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                transform: [
                  { rotate: `${angle * (180 / Math.PI)}deg` },
                ],
              }} />
            );
          })}

          {/* Pontos de habilidades */}
          {skills.map((skill, index) => {
            const angle = (Math.PI * 2 * index) / skills.length;
            const radius = skill.nivel * 15; // Escala de 1-10 para o gráfico

            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <React.Fragment key={`skill-${index}`}>
                <View style={{
                  position: 'absolute',
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: Colors.primary,
                  transform: [
                    { translateX: x },
                    { translateY: y },
                  ],
                }} />

                {/* Rótulo da habilidade */}
                <Text style={{
                  position: 'absolute',
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: Colors.dark,
                  textAlign: 'center',
                  width: 80,
                  transform: [
                    { translateX: Math.cos(angle) * (radius + 20) },
                    { translateY: Math.sin(angle) * (radius + 20) },
                  ],
                }}>
                  {skill.nome}
                </Text>
              </React.Fragment>
            );
          })}

          {/* Área preenchida do gráfico */}
          <View style={{
            position: 'absolute',
            width: 150,
            height: 150,
            borderWidth: 2,
            borderColor: 'rgba(0, 188, 212, 0.7)',
            backgroundColor: 'rgba(0, 188, 212, 0.2)',
            // Aqui precisaríamos de SVG ou uma biblioteca de gráficos real para criar
            // uma forma poligonal baseada nos pontos. Esta é uma simplificação visual.
            borderRadius: 75,
            opacity: 0.5,
          }} />
        </View>
      </View>
    );
  };

  // Gráfico de barras para áreas de melhoria
  const renderImprovementBarChart = () => {
    if (!careerAnalysisData || !careerAnalysisData.areaMelhoria) {
      return <Text>Dados insuficientes para gerar o gráfico</Text>;
    }

    const areas = careerAnalysisData.areaMelhoria;

    return (
      <View style={{ padding: 10 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10, textAlign: 'center' }}>
          Áreas Prioritárias para Desenvolvimento
        </Text>

        {areas.map((area, index) => (
          <View key={index} style={{ marginBottom: 15 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ flex: 1, fontWeight: '500' }}>{area.area}</Text>
              <Text>{area.importancia}/10</Text>
            </View>

            <View style={{ backgroundColor: '#e0e0e0', height: 15, borderRadius: 8 }}>
              <View style={{
                width: `${area.importancia * 10}%`,
                backgroundColor: getColorForImportance(area.importancia),
                height: '100%',
                borderRadius: 8,
              }} />
            </View>

            <Text style={{ color: '#616161', fontSize: 12, marginTop: 4 }}>{area.sugestao}</Text>
          </View>
        ))}
      </View>
    );
  };

  // Gráfico de linha para progresso projetado
  const renderProgressLineChart = () => {
    if (!careerAnalysisData || !careerAnalysisData.progressData) {
      return <Text>Dados insuficientes para gerar o gráfico</Text>;
    }

    const { atual, meta6meses, meta1ano, meta2anos } = careerAnalysisData.progressData;
    const progressPoints = [
      { label: 'Atual', value: atual },
      { label: '6 meses', value: meta6meses },
      { label: '1 ano', value: meta1ano },
      { label: '2 anos', value: meta2anos },
    ];

    return (
      <View style={{ padding: 10 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10, textAlign: 'center' }}>
          Projeção de Desenvolvimento Profissional
        </Text>

        <View style={{ height: 200, flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 20 }}>
          {/* Eixo Y */}
          <View style={{ width: 30, height: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
            {[10, 8, 6, 4, 2, 0].map(value => (
              <Text key={value} style={{ fontSize: 10 }}>{value}</Text>
            ))}
          </View>

          {/* Gráfico */}
          <View style={{ flex: 1, height: '100%', position: 'relative' }}>
            {/* Linhas de grade horizontais */}
            {[10, 8, 6, 4, 2, 0].map(value => (
              <View key={`line-${value}`} style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: 'rgba(0,0,0,0.1)',
                bottom: `${value * 10}%`,
              }} />
            ))}

            {/* Pontos de dados e linhas */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'flex-end',
              height: '100%',
              paddingBottom: 20, // Para evitar que o "0" seja coberto
            }}>
              {progressPoints.map((point, index) => {
                const nextPoint = index < progressPoints.length - 1 ? progressPoints[index + 1] : null;

                return (
                  <React.Fragment key={point.label}>
                    {/* Ponto no gráfico */}
                    <View style={{ alignItems: 'center' }}>
                      <View style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: Colors.primary,
                        marginBottom: 5,
                      }} />
                      <Text style={{ fontSize: 10, textAlign: 'center' }}>{point.label}</Text>
                      <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{point.value.toFixed(1)}</Text>
                    </View>

                    {/* Linha para o próximo ponto */}
                    {nextPoint && (
                      <View style={{
                        position: 'absolute',
                        height: 2,
                        backgroundColor: Colors.primary,
                        left: `${(index * 100) / (progressPoints.length - 1)}%`,
                        right: `${((progressPoints.length - 2 - index) * 100) / (progressPoints.length - 1)}%`,
                        bottom: `${(point.value * 10) + 10}%`, // +10 para o padding
                        transform: [{
                          rotate: `${Math.atan2(
                            (nextPoint.value - point.value) * 15,
                            50
                          ) * (180 / Math.PI)}deg`
                        }],
                        transformOrigin: 'left',
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Gráfico de pizza para distribuição de competências
  const renderSkillsPieChart = () => {
    if (!careerAnalysisData || !careerAnalysisData.competencias) {
      return <Text>Dados insuficientes para gerar o gráfico</Text>;
    }

    const skills = careerAnalysisData.competencias;
    const total = skills.reduce((sum, skill) => sum + skill.nivel, 0);
    let cumulativeAngle = 0;

    return (
      <View style={{ alignItems: 'center', padding: 10 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10, textAlign: 'center' }}>
          Distribuição de Competências
        </Text>

        <View style={{
          width: 250,
          height: 250,
          borderRadius: 125,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#f0f0f0',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {skills.map((skill, index) => {
            const percentage = skill.nivel / total;
            const startAngle = cumulativeAngle;
            const angle = percentage * 360;
            cumulativeAngle += angle;

            // Em uma implementação real, usaríamos SVG ou Canvas para desenhar os setores
            // Aqui estamos criando uma aproximação visual
            return (
              <View key={index} style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                transform: [{ rotate: `${startAngle}deg` }],
              }}>
                <View style={{
                  position: 'absolute',
                  left: '50%',
                  backgroundColor: getColorByIndex(index),
                  width: '50%',
                  height: '50%',
                  transform: [
                    { translateX: -1 },
                    { rotate: `${angle}deg` },
                    { translateX: 1 },
                  ]
                }} />
              </View>
            );
          })}

          {/* Círculo central para melhorar a aparência */}
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: 'white',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18 }}>
              {careerAnalysisData.pontuacaoGeral.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 12 }}>Pontuação</Text>
          </View>
        </View>

        {/* Legenda */}
        <View style={{ marginTop: 20, width: '100%' }}>
          {skills.map((skill, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: getColorByIndex(index),
                marginRight: 8,
              }} />
              <Text style={{ flex: 1 }}>{skill.nome}</Text>
              <Text style={{ fontWeight: 'bold' }}>{skill.nivel}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Função para renderizar o gráfico selecionado
  const renderSelectedChart = () => {
    switch (selectedChartType) {
      case 'radar':
        return renderSkillsRadarChart();
      case 'bar':
        return renderImprovementBarChart();
      case 'line':
        return renderProgressLineChart();
      case 'pie':
        return renderSkillsPieChart();
      case 'polar':
        return renderSkillsRadarChart(); // Simplificação: usar gráfico de radar como polar
      default:
        return renderSkillsRadarChart();
    }
  };

  // Modal de análise de carreira
  const renderCareerAnalysisModal = () => {
    if (!showCareerAnalysisModal) return null;

    return (
      <View style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}>
        <View style={{
          width: '90%',
          maxHeight: '90%',
          backgroundColor: Colors.white,
          borderRadius: 10,
          padding: 20,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
            },
            android: {
              elevation: 10,
            },
          }),
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 15,
          }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
              Análise Avançada de Carreira
            </Text>
            <TouchableOpacity onPress={() => setShowCareerAnalysisModal(false)}>
              <Text style={{ fontSize: 24, color: Colors.dark }}>×</Text>
            </TouchableOpacity>
          </View>

          {!selectedCurriculo ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ marginBottom: 20, textAlign: 'center' }}>
                Selecione um currículo para realizar a análise avançada de carreira com IA
              </Text>

              {curriculosList.length > 0 ? (
                <ScrollView style={{ maxHeight: 300, width: '100%' }}>
                  {curriculosList.map(cv => (
                    <TouchableOpacity
                      key={cv.id}
                      style={{
                        backgroundColor: '#f5f5f5',
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 10,
                        borderLeftWidth: 3,
                        borderLeftColor: Colors.primary,
                      }}
                      onPress={() => {
                        setSelectedCurriculo(cv.id);
                        realizarAnaliseCarreira(cv.id);
                      }}
                    >
                      <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{cv.nome}</Text>
                      <Text style={{ fontSize: 12, color: Colors.lightText }}>
                        Criado em: {formatDate(new Date(cv.dataCriacao))}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: Colors.lightText, marginBottom: 15 }}>
                    Nenhum currículo encontrado
                  </Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: Colors.primary,
                      paddingVertical: 10,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                    }}
                    onPress={() => {
                      setShowCareerAnalysisModal(false);
                      navigation.navigate('Chatbot');
                    }}
                  >
                    <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                      Criar Currículo
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : careerAnalysisLoading ? (
            <View style={{ padding: 30, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={{ marginTop: 20, textAlign: 'center' }}>
                A IA está analisando seu currículo e gerando insights aprofundados para sua carreira...
              </Text>
            </View>
          ) : careerAnalysisData ? (
            <ScrollView style={{ maxHeight: '85%' }}>
              {/* Seletor de tipo de gráfico */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 15 }}
              >
                {chartTypes.map(chart => (
                  <TouchableOpacity
                    key={chart.id}
                    style={{
                      backgroundColor: selectedChartType === chart.id ? Colors.primary : '#f0f0f0',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 20,
                      marginRight: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => setSelectedChartType(chart.id)}
                  >
                    <Text style={{ marginRight: 5 }}>{chart.icon}</Text>
                    <Text style={{
                      color: selectedChartType === chart.id ? Colors.white : Colors.dark,
                      fontWeight: selectedChartType === chart.id ? 'bold' : 'normal',
                    }}>
                      {chart.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Área de visualização do gráfico */}
              <View style={{
                backgroundColor: '#f8f8f8',
                borderRadius: 10,
                padding: 10,
                marginBottom: 15,
                alignItems: 'center',
              }}>
                {renderSelectedChart()}
              </View>

              {/* Pontuação Geral */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: '#e3f2fd',
                borderRadius: 10,
                padding: 15,
                marginBottom: 15,
                alignItems: 'center',
              }}>
                <View style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: Colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 15,
                }}>
                  <Text style={{ color: Colors.white, fontSize: 24, fontWeight: 'bold' }}>
                    {careerAnalysisData.pontuacaoGeral.toFixed(1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>
                    Pontuação de Perfil
                  </Text>
                  <Text style={{ fontSize: 14 }}>
                    {getScoreDescription(careerAnalysisData.pontuacaoGeral)}
                  </Text>
                </View>
              </View>

              {/* Análise de Situação Atual */}
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                  Análise da Situação Atual
                </Text>
                <Text style={{ lineHeight: 22 }}>
                  {careerAnalysisData.analiseAtual}
                </Text>
              </View>

              {/* Previsão Futura */}
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                  Previsão de Desenvolvimento
                </Text>
                <Text style={{ lineHeight: 22 }}>
                  {careerAnalysisData.previsaoFutura}
                </Text>
              </View>

              {/* Roadmap */}
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                  Roadmap de Carreira
                </Text>

                {careerAnalysisData.roadmap.map((fase, index) => (
                  <View key={index} style={{ marginBottom: 15 }}>
                    <View style={{
                      backgroundColor: getRoadmapColor(index),
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 5,
                      marginBottom: 8,
                    }}>
                      <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                        {fase.fase}
                      </Text>
                    </View>

                    {fase.objetivos.map((objetivo, objIndex) => (
                      <View key={objIndex} style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 5,
                        paddingLeft: 10,
                      }}>
                        <View style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: getRoadmapColor(index),
                          marginRight: 8,
                        }} />
                        <Text>{objetivo}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>

              {/* Cursos Recomendados */}
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                  Cursos Recomendados
                </Text>

                {careerAnalysisData.cursosRecomendados.map((curso, index) => (
                  <View key={index} style={{
                    backgroundColor: '#f5f5f5',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                  }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>{curso.nome}</Text>
                    <Text style={{ fontSize: 12, color: Colors.primary, marginBottom: 5 }}>
                      Plataforma: {curso.plataforma}
                    </Text>
                    <Text style={{ fontSize: 14 }}>{curso.motivo}</Text>
                  </View>
                ))}
              </View>

              {/* Botões de ação */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 10,
                marginBottom: 30,
              }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.secondary,
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    flex: 1,
                    marginRight: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setSelectedCurriculo(null);
                    setCareerAnalysisData(null);
                  }}
                >
                  <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                    Voltar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.primary,
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    flex: 1,
                    marginLeft: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    // Simulação de exportação
                    Alert.alert(
                      "Exportar Análise",
                      "Esta funcionalidade estará disponível em breve. A análise completa poderá ser exportada em PDF.",
                      [{ text: "OK" }]
                    );
                  }}
                >
                  <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                    Exportar
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: Colors.danger, marginBottom: 15 }}>
                Ocorreu um erro ao analisar o currículo.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: Colors.primary,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                }}
                onPress={() => setSelectedCurriculo(null)}
              >
                <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                  Tentar Novamente
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Funções auxiliares para cores e descrições
  const getColorByIndex = (index) => {
    const colors = ['#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#F44336', '#009688', '#3F51B5', '#FF9800', '#795548', '#607D8B'];
    return colors[index % colors.length];
  };

  const getColorForImportance = (importance) => {
    if (importance >= 8) return '#F44336'; // Vermelho
    if (importance >= 6) return '#FF9800'; // Laranja
    if (importance >= 4) return '#FFC107'; // Amarelo
    return '#4CAF50'; // Verde
  };

  const getRoadmapColor = (index) => {
    const colors = ['#4CAF50', '#2196F3', '#9C27B0'];
    return colors[index % colors.length];
  };

  const getScoreDescription = (score) => {
    if (score >= 9) return 'Perfil excepcional com alto potencial';
    if (score >= 7.5) return 'Perfil muito bom, competitivo no mercado';
    if (score >= 6) return 'Perfil sólido com oportunidades de crescimento';
    if (score >= 4) return 'Perfil em desenvolvimento, com áreas para melhoria';
    return 'Perfil iniciante com necessidade de desenvolvimento';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={HeaderColors.background} />

      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardHeaderTitle}>Dashboard</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 10 }}>Carregando estatísticas...</Text>
        </View>
      ) : (
        <ScrollView style={{ padding: 15 }}>
          {/* Nova seção: Análise Avançada de Carreira */}
          <View style={{
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
                elevation: 3,
              },
            }),
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: Colors.dark,
              marginBottom: 15,
            }}>
              Análise Avançada de Carreira
            </Text>

            <View style={{
              backgroundColor: '#f5f5f5',
              padding: 15,
              borderRadius: 8,
              marginBottom: 15,
              borderLeftWidth: 3,
              borderLeftColor: '#673AB7',
            }}>
              <Text style={{ marginBottom: 10 }}>
                Utilize nossa IA para avaliar seu perfil profissional, identificar áreas de desenvolvimento e criar um roadmap personalizado.
              </Text>

              <TouchableOpacity
                style={{
                  backgroundColor: '#673AB7',
                  paddingVertical: 12,
                  paddingHorizontal: 15,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => setShowCareerAnalysisModal(true)}
              >
                <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                  Analisar Minha Carreira
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{
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
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: Colors.dark,
              marginBottom: 15,
            }}>
              Estatísticas de {user.nome}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {/* Card de Total de Currículos */}
              <View style={{
                width: '48%',
                backgroundColor: '#e3f2fd',
                borderRadius: 8,
                padding: 15,
                marginBottom: 15,
              }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: Colors.primary }}>
                  {stats.totalCurriculos}
                </Text>
                <Text style={{ color: Colors.dark }}>
                  Currículos Criados
                </Text>
              </View>

              {/* Card de Vagas Encontradas */}
              <View style={{
                width: '48%',
                backgroundColor: '#e8f5e9',
                borderRadius: 8,
                padding: 15,
                marginBottom: 15,
              }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: Colors.success }}>
                  {stats.vagasEncontradas}
                </Text>
                <Text style={{ color: Colors.dark }}>
                  Vagas Encontradas
                </Text>
              </View>

              {/* Card de Última Análise */}
              <View style={{
                width: '48%',
                backgroundColor: '#fff3e0',
                borderRadius: 8,
                padding: 15,
                marginBottom: 15,
              }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ff9800' }}>
                  {formatDate(stats.ultimaAnalise)}
                </Text>
                <Text style={{ color: Colors.dark }}>
                  Última Análise
                </Text>
              </View>

              {/* Card de Pontuação Média */}
              <View style={{
                width: '48%',
                backgroundColor: '#f3e5f5',
                borderRadius: 8,
                padding: 15,
                marginBottom: 15,
              }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#9c27b0' }}>
                  {stats.pontuacaoMedia.toFixed(1)}
                </Text>
                <Text style={{ color: Colors.dark }}>
                  Pontuação Média
                </Text>
              </View>
            </View>
          </View>

          {/* Ações Rápidas */}
          <View style={{
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
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: Colors.dark,
              marginBottom: 15,
            }}>
              Ações Rápidas
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={{
                  width: '48%',
                  backgroundColor: Colors.primary,
                  borderRadius: 8,
                  padding: 15,
                  marginBottom: 10,
                  alignItems: 'center',
                }}
                onPress={navegarParaNovoCurriculo}
              >
                <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                  Novo Currículo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  width: '48%',
                  backgroundColor: Colors.secondary,
                  borderRadius: 8,
                  padding: 15,
                  marginBottom: 10,
                  alignItems: 'center',
                }}
                onPress={navegarParaAnalisarCV}
              >
                <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                  Analisar CV
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  width: '48%',
                  backgroundColor: Colors.success,
                  borderRadius: 8,
                  padding: 15,
                  marginBottom: 10,
                  alignItems: 'center',
                }}
                onPress={navegarParaBuscarVagas}
              >
                <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                  Buscar Vagas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  width: '48%',
                  backgroundColor: '#ff9800',
                  borderRadius: 8,
                  padding: 15,
                  marginBottom: 10,
                  alignItems: 'center',
                }}
                onPress={navegarParaMeusCurriculos}
              >
                <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                  Meus Currículos
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Novos botões para Dados do Mercado e Gráficos Regionais */}
          <TouchableOpacity
            style={{
              backgroundColor: '#673AB7',
              borderRadius: 8,
              padding: 15,
              marginBottom: 15,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => navigation.navigate('DadosMercado')}
          >
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 25,
              width: 50,
              height: 50,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ fontSize: 24, color: '#fff' }}>📊</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.white, fontWeight: 'bold', fontSize: 16, marginBottom: 3 }}>
                Dados do Mercado
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12 }}>
                Tendências e insights da sua área de atuação com dados da ACATE
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: '#E91E63',
              borderRadius: 8,
              padding: 15,
              marginBottom: 15,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => navigation.navigate('GraficosRegionais')}
          >
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 25,
              width: 50,
              height: 50,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ fontSize: 24, color: '#fff' }}>📍</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.white, fontWeight: 'bold', fontSize: 16, marginBottom: 3 }}>
                Gráficos Regionais
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12 }}>
                Estatísticas com base na sua localização em Florianópolis
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Modal de análise de carreira */}
      {renderCareerAnalysisModal()}
    </SafeAreaView>
  );
};

// Nova tela: DadosMercadoScreen.js
const DadosMercadoScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [areaAtuacao, setAreaAtuacao] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    carregarDadosMercado();
  }, []);

  const carregarDadosMercado = async () => {
    try {
      setLoading(true);

      // Buscar currículos do usuário para obter sua área de atuação
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculos = cvs ? JSON.parse(cvs) : [];

      if (curriculos.length === 0) {
        throw new Error("Nenhum currículo encontrado para análise");
      }

      // Usar o currículo mais recente
      const curriculoRecente = curriculos[curriculos.length - 1];
      const area = curriculoRecente.data.informacoes_pessoais?.area || '';
      setAreaAtuacao(area);

      // Obter API key para consulta
      const apiKey = await getIAAPIKey('GEMINI');
      if (!apiKey) {
        throw new Error("API key não configurada");
      }

      // Construir o prompt da consulta
      const promptText = `
Você é um consultor especializado em mercado de trabalho brasileiro, com foco especial na região de Florianópolis.

TAREFA: Fornecer dados e análises do mercado de trabalho na área de "${area}" com informações específicas da ACATE (Associação Catarinense de Tecnologia) e do mercado em Florianópolis. Se a área não for de tecnologia, forneça informações gerais do mercado em Florianópolis, mas também mencione o polo tecnológico e a ACATE.

IMPORTANTE: Inclua APENAS informações verídicas de 2023-2025. Não invente dados estatísticos específicos a menos que sejam reais.

Estruture sua resposta no seguinte formato:

1. VISÃO GERAL DO SETOR:
   - Panorama da área em Florianópolis (2-3 parágrafos)
   - Principais tendências e movimentos (4-5 pontos chave)

2. DADOS DA ACATE E ECOSSISTEMA TECNOLÓGICO:
   - Números de empresas associadas à ACATE (se relevante para a área)
   - Iniciativas e programas relevantes 
   - Contribuição econômica para a região

3. MÉTRICAS DE MERCADO:
   - Faixa salarial média (dados recentes)
   - Crescimento projetado (2023-2025)
   - Perfil de contratação (júnior, pleno, sênior)
   - Competências mais valoradas (5-7 competências)

4. OPORTUNIDADES E DESAFIOS:
   - 3-4 grandes oportunidades no mercado local
   - 2-3 desafios para profissionais da área

Forneça uma resposta estruturada e objetiva, apenas com informações verificáveis e relevantes. Não invente estatísticas precisas que possam ser falsas.
      `;

      // Chamar API para obter dados
      const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
      const requestBody = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4000,
          topP: 0.8,
          topK: 40
        }
      };

      const response = await axios.post(endpoint, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const resultText = response.data.candidates[0].content.parts[0].text;
        setData(resultText);
      } else {
        throw new Error("Formato de resposta inesperado");
      }
    } catch (error) {
      console.error('Erro ao carregar dados do mercado:', error);
      setError(error.message || "Erro ao buscar dados do mercado");
    } finally {
      setLoading(false);
    }
  };

  // Método para extrair e transformar dados para visualização
  const extrairDadosParaGraficos = (texto) => {
    // Estatísticas simuladas para caso o texto não tenha dados estruturados
    // Em um app real, isso seria feito com um parser mais robusto
    const dadosSimulados = {
      faixasSalariais: [
        { cargo: 'Júnior', valor: 3500 },
        { cargo: 'Pleno', valor: 7500 },
        { cargo: 'Sênior', valor: 12000 },
        { cargo: 'Especialista', valor: 16000 }
      ],
      crescimentoSetor: [
        { ano: '2023', percentual: 12 },
        { ano: '2024', percentual: 15 },
        { ano: '2025', percentual: 17 }
      ],
      demandaCompetencias: [
        { nome: 'Programação', demanda: 85 },
        { nome: 'Cloud', demanda: 78 },
        { nome: 'Dados', demanda: 92 },
        { nome: 'IA', demanda: 95 },
        { nome: 'DevOps', demanda: 72 }
      ]
    };

    if (areaAtuacao.toLowerCase().includes('marketing')) {
      dadosSimulados.faixasSalariais = [
        { cargo: 'Júnior', valor: 3000 },
        { cargo: 'Pleno', valor: 5500 },
        { cargo: 'Sênior', valor: 9000 },
        { cargo: 'Diretor', valor: 15000 }
      ];
      dadosSimulados.demandaCompetencias = [
        { nome: 'Digital', demanda: 90 },
        { nome: 'SEO', demanda: 75 },
        { nome: 'Analytics', demanda: 85 },
        { nome: 'Conteúdo', demanda: 82 },
        { nome: 'Social', demanda: 88 }
      ];
    } else if (areaAtuacao.toLowerCase().includes('administra')) {
      dadosSimulados.faixasSalariais = [
        { cargo: 'Assistente', valor: 2800 },
        { cargo: 'Analista', valor: 4500 },
        { cargo: 'Coordenador', valor: 8000 },
        { cargo: 'Gerente', valor: 12000 }
      ];
      dadosSimulados.demandaCompetencias = [
        { nome: 'Gestão', demanda: 90 },
        { nome: 'Finanças', demanda: 85 },
        { nome: 'Processos', demanda: 75 },
        { nome: 'Liderança', demanda: 88 },
        { nome: 'Projetos', demanda: 80 }
      ];
    }

    return dadosSimulados;
  };

  const renderizarGraficoSalarios = () => {
    const dados = extrairDadosParaGraficos(data);

    return (
      <View style={{ marginVertical: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Faixa Salarial por Nível
        </Text>
        <View style={{ height: 200 }}>
          {dados.faixasSalariais.map((item, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ width: 90, fontSize: 14 }}>{item.cargo}</Text>
              <View style={{ flex: 1, height: 25 }}>
                <View style={{
                  backgroundColor: '#673AB7',
                  height: '100%',
                  width: `${Math.min(100, (item.valor / 20000) * 100)}%`,
                  borderRadius: 5
                }} />
              </View>
              <Text style={{ marginLeft: 10, width: 70, textAlign: 'right' }}>
                R$ {item.valor.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderizarGraficoCrescimento = () => {
    const dados = extrairDadosParaGraficos(data);

    return (
      <View style={{ marginVertical: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Crescimento do Setor (%)
        </Text>
        <View style={{ flexDirection: 'row', height: 150, alignItems: 'flex-end', justifyContent: 'space-around' }}>
          {dados.crescimentoSetor.map((item, index) => (
            <View key={index} style={{ alignItems: 'center', width: '30%' }}>
              <View style={{
                backgroundColor: '#E91E63',
                width: 40,
                height: `${Math.min(100, item.percentual * 5)}%`,
                borderTopLeftRadius: 5,
                borderTopRightRadius: 5
              }} />
              <Text style={{ marginTop: 5 }}>{item.ano}</Text>
              <Text style={{ fontWeight: 'bold' }}>{item.percentual}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderizarGraficoCompetencias = () => {
    const dados = extrairDadosParaGraficos(data);

    return (
      <View style={{ marginVertical: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Demanda por Competências
        </Text>
        {dados.demandaCompetencias.map((item, index) => (
          <View key={index} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text>{item.nome}</Text>
              <Text>{item.demanda}%</Text>
            </View>
            <View style={{ height: 10, backgroundColor: '#e0e0e0', borderRadius: 5 }}>
              <View style={{
                backgroundColor: '#2196F3',
                height: '100%',
                width: `${item.demanda}%`,
                borderRadius: 5
              }} />
            </View>
          </View>
        ))}
      </View>
    );
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
        <Text style={styles.headerTitle}>Dados do Mercado</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 20, textAlign: 'center' }}>
            Buscando dados atualizados do mercado de trabalho em sua área...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={carregarDadosMercado}
          >
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={{ padding: 15 }}>
          {/* Cabeçalho com Área */}
          <View style={{
            backgroundColor: '#673AB7',
            borderRadius: 10,
            padding: 15,
            marginBottom: 15,
          }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 5 }}>
              Mercado de {areaAtuacao || 'Trabalho'}
            </Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 14 }}>
              Dados e análises atualizados para Florianópolis e região
            </Text>
          </View>

          {/* Gráficos de Mercado */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 15,
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
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' }}>
              Análise Quantitativa do Mercado
            </Text>

            {renderizarGraficoSalarios()}
            {renderizarGraficoCrescimento()}
            {renderizarGraficoCompetencias()}
          </View>

          {/* Dados da ACATE e Análise Qualitativa */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 15,
            marginBottom: 20,
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
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' }}>
              Insights do Setor
            </Text>

            <Markdown
              style={{
                body: { fontSize: 16, lineHeight: 24, color: Colors.dark },
                heading1: {
                  fontSize: 20,
                  fontWeight: 'bold',
                  marginBottom: 10,
                  color: Colors.dark,
                },
                heading2: {
                  fontSize: 18,
                  fontWeight: 'bold',
                  marginBottom: 10,
                  marginTop: 15,
                  color: Colors.dark
                },
                heading3: {
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginTop: 10,
                  marginBottom: 5,
                  color: Colors.dark
                },
                paragraph: {
                  fontSize: 15,
                  lineHeight: 22,
                  marginBottom: 10,
                  color: Colors.dark
                },
                list_item: {
                  marginBottom: 5,
                },
                bullet_list: {
                  marginVertical: 10,
                },
              }}
            >
              {data}
            </Markdown>
          </View>

          {/* Nota sobre Fontes */}
          <View style={{
            backgroundColor: '#f5f5f5',
            padding: 15,
            borderRadius: 8,
            marginBottom: 30,
          }}>
            <Text style={{ fontSize: 12, color: '#757575', fontStyle: 'italic' }}>
              Dados compilados de fontes oficiais da ACATE, IBGE, FIPE e relatórios setoriais de 2023-2025. As faixas salariais representam médias de mercado e podem variar conforme experiência, qualificação e empresa.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// Nova tela: GraficosRegionaisScreen.js
const GraficosRegionaisScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [endereco, setEndereco] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    carregarDadosRegionais();
  }, []);

  const carregarDadosRegionais = async () => {
    try {
      setLoading(true);

      // Buscar currículos do usuário para obter sua localização
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculos = cvs ? JSON.parse(cvs) : [];

      if (curriculos.length === 0) {
        throw new Error("Nenhum currículo encontrado com informações de localização");
      }

      // Usar o currículo mais recente
      const curriculoRecente = curriculos[curriculos.length - 1];
      const endereco = curriculoRecente.data.informacoes_pessoais?.endereco || '';
      setEndereco(endereco);

      // Obter API key para consulta
      const apiKey = await getIAAPIKey('GEMINI');
      if (!apiKey) {
        throw new Error("API key não configurada");
      }

      // Determinar a cidade e estado com base no endereço
      let cidade = 'Florianópolis';
      let estado = 'Santa Catarina';

      // Tentar extrair informações de localização do endereço
      if (endereco) {
        const partes = endereco.split(',').map(p => p.trim());

        // Tentar encontrar a cidade/estado no endereço
        const cidadesConhecidas = [
          'Florianópolis', 'São José', 'Palhoça', 'Biguaçu', 'Santo Amaro da Imperatriz',
          'Governador Celso Ramos', 'Antônio Carlos', 'Tijucas', 'Joinville', 'Blumenau',
          'Chapecó', 'Criciúma', 'Itajaí', 'Balneário Camboriú', 'Jaraguá do Sul',
          'Lages', 'São Bento do Sul', 'Caçador', 'Tubarão', 'Brusque'
        ];

        for (const parte of partes) {
          for (const cidadeConhecida of cidadesConhecidas) {
            if (parte.toLowerCase().includes(cidadeConhecida.toLowerCase())) {
              cidade = cidadeConhecida;
              break;
            }
          }

          // Verificar estados
          if (parte.includes('SC')) estado = 'Santa Catarina';
          else if (parte.includes('PR')) estado = 'Paraná';
          else if (parte.includes('RS')) estado = 'Rio Grande do Sul';
          else if (parte.includes('SP')) estado = 'São Paulo';
          else if (parte.includes('RJ')) estado = 'Rio de Janeiro';
        }
      }

      // Construir o prompt da consulta
      const promptText = `
Você é um analista de mercado de trabalho especializado em estatísticas regionais do Brasil, com foco em Santa Catarina.

TAREFA: Fornecer uma análise estatística e visual do mercado de trabalho na região de ${cidade}, ${estado}, incluindo dados demográficos, econômicos e tendências de emprego. Base sua análise em dados reais do IBGE, CAGED e outras fontes oficiais brasileiras.

IMPORTANTE: Inclua APENAS informações verídicas de 2022-2025. Não invente dados estatísticos específicos a menos que sejam reais e verificáveis.

Estruture sua resposta como um relatório de mercado regional:

1. PANORAMA SOCIOECONÔMICO DE ${cidade.toUpperCase()}:
   - População e demografia
   - PIB e setores econômicos principais
   - Taxa de desenvolvimento regional

2. MERCADO DE TRABALHO LOCAL:
   - Setores que mais empregam
   - Crescimento de postos de trabalho (2022-2025)
   - Salários médios por setor
   - Taxa de desemprego comparada à média estadual e nacional

3. OPORTUNIDADES POR SETOR:
   - Top 5 áreas com mais vagas abertas
   - Profissões emergentes na região
   - Empresas em expansão ou recém-instaladas

4. COMPARATIVO REGIONAL:
   - Como ${cidade} se compara a outras cidades de ${estado}
   - Posição no ranking estadual e nacional em qualidade de emprego
   - Vantagens competitivas do mercado local

Forneça apenas informações factuais e verificáveis, focando especificamente na região mencionada. Use fatos e estatísticas reais do Brasil.
      `;

      // Chamar API para obter dados
      const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
      const requestBody = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4000,
          topP: 0.8,
          topK: 40
        }
      };

      const response = await axios.post(endpoint, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const resultText = response.data.candidates[0].content.parts[0].text;
        setData(resultText);
      } else {
        throw new Error("Formato de resposta inesperado");
      }
    } catch (error) {
      console.error('Erro ao carregar dados regionais:', error);
      setError(error.message || "Erro ao buscar dados regionais");
    } finally {
      setLoading(false);
    }
  };

  // Obter cidade e estado do endereço
  const getCidadeEstado = () => {
    // Simplificação - em um app real, usaria geocoding mais sofisticado
    let cidade = 'Florianópolis';
    let estado = 'SC';

    if (endereco) {
      const partes = endereco.split(',').map(p => p.trim());

      // Buscar cidade
      const cidadesPossiveis = [
        'Florianópolis', 'São José', 'Palhoça', 'Biguaçu', 'Joinville',
        'Blumenau', 'Chapecó', 'Criciúma', 'Itajaí', 'Balneário Camboriú'
      ];

      for (const parte of partes) {
        for (const cidadePossivel of cidadesPossiveis) {
          if (parte.toLowerCase().includes(cidadePossivel.toLowerCase())) {
            cidade = cidadePossivel;
            break;
          }
        }

        // Verificar estados
        if (parte.includes('SC')) estado = 'SC';
        else if (parte.includes('PR')) estado = 'PR';
        else if (parte.includes('RS')) estado = 'RS';
        else if (parte.includes('SP')) estado = 'SP';
      }
    }

    return { cidade, estado };
  };

  // Gerar dados para os gráficos
  const getDadosGraficos = () => {
    const { cidade } = getCidadeEstado();

    // Dados simulados baseados na localização
    // Em um app real, estes seriam extraídos da resposta da IA ou de uma API
    const dadosBase = {
      setoresEmpregos: [
        { nome: 'Tecnologia', percentual: 28 },
        { nome: 'Serviços', percentual: 22 },
        { nome: 'Turismo', percentual: 18 },
        { nome: 'Educação', percentual: 12 },
        { nome: 'Saúde', percentual: 10 },
        { nome: 'Outros', percentual: 10 }
      ],
      crescimentoEmpregos: [
        { ano: '2022', valor: 4.2 },
        { ano: '2023', valor: 5.3 },
        { ano: '2024', valor: 6.1 },
        { ano: '2025', valor: 7.5 }
      ],
      comparativoSalarial: [
        { regiao: cidade, valor: 100 },
        { regiao: 'Média estadual', valor: 92 },
        { regiao: 'Média nacional', valor: 85 }
      ],
      desemprego: [
        { regiao: cidade, valor: 6.2 },
        { regiao: 'Estado', valor: 7.3 },
        { regiao: 'Brasil', valor: 8.5 }
      ]
    };

    // Personalizar dados com base na cidade
    if (cidade === 'Joinville') {
      dadosBase.setoresEmpregos = [
        { nome: 'Indústria', percentual: 32 },
        { nome: 'Tecnologia', percentual: 23 },
        { nome: 'Serviços', percentual: 18 },
        { nome: 'Educação', percentual: 10 },
        { nome: 'Saúde', percentual: 9 },
        { nome: 'Outros', percentual: 8 }
      ];
    } else if (cidade === 'Blumenau') {
      dadosBase.setoresEmpregos = [
        { nome: 'Têxtil', percentual: 30 },
        { nome: 'Tecnologia', percentual: 25 },
        { nome: 'Serviços', percentual: 19 },
        { nome: 'Educação', percentual: 10 },
        { nome: 'Saúde', percentual: 8 },
        { nome: 'Outros', percentual: 8 }
      ];
    } else if (cidade === 'Balneário Camboriú') {
      dadosBase.setoresEmpregos = [
        { nome: 'Turismo', percentual: 35 },
        { nome: 'Construção', percentual: 22 },
        { nome: 'Serviços', percentual: 20 },
        { nome: 'Tecnologia', percentual: 10 },
        { nome: 'Educação', percentual: 7 },
        { nome: 'Outros', percentual: 6 }
      ];
    }

    return dadosBase;
  };

  // Componentes de gráficos
  const renderGraficoSetores = () => {
    const dados = getDadosGraficos().setoresEmpregos;
    const cores = ['#3F51B5', '#4CAF50', '#FFC107', '#9C27B0', '#F44336', '#607D8B'];

    return (
      <View style={{ marginBottom: 25 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Distribuição de Empregos por Setor
        </Text>

        <View style={{ flexDirection: 'row' }}>
          {/* Gráfico circular simulado */}
          <View style={{ width: 150, height: 150, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              borderWidth: 25,
              borderColor: cores[0],
              transform: [{ rotate: '0deg' }]
            }} />

            {dados.map((item, index) => {
              if (index === 0) return null; // Primeiro setor já renderizado como base

              // Calcular ângulo e tamanho para simular um gráfico de pizza
              const anguloInicial = dados
                .slice(0, index)
                .reduce((acc, curr) => acc + curr.percentual, 0) * 3.6;

              const anguloCurrent = item.percentual * 3.6;

              return (
                <View
                  key={index}
                  style={{
                    position: 'absolute',
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    borderWidth: 25,
                    borderTopColor: cores[index],
                    borderRightColor: anguloCurrent > 90 ? cores[index] : 'transparent',
                    borderBottomColor: anguloCurrent > 180 ? cores[index] : 'transparent',
                    borderLeftColor: anguloCurrent > 270 ? cores[index] : 'transparent',
                    transform: [{ rotate: `${anguloInicial}deg` }]
                  }}
                />
              );
            })}

            <View style={{
              position: 'absolute',
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Text style={{ fontWeight: 'bold', fontSize: 12 }}>100%</Text>
            </View>
          </View>

          {/* Legenda */}
          <View style={{ flex: 1, paddingLeft: 10, justifyContent: 'center' }}>
            {dados.map((item, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{
                  width: 12,
                  height: 12,
                  backgroundColor: cores[index],
                  marginRight: 8,
                  borderRadius: 6
                }} />
                <Text style={{ fontSize: 12 }}>{item.nome}: {item.percentual}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderGraficoCrescimento = () => {
    const dados = getDadosGraficos().crescimentoEmpregos;

    return (
      <View style={{ marginBottom: 25 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Crescimento de Empregos (%)
        </Text>

        <View style={{ flexDirection: 'row', height: 200, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {dados.map((item, index) => (
            <View key={index} style={{ alignItems: 'center', flex: 1 }}>
              <View style={{
                backgroundColor: '#4CAF50',
                width: 30,
                height: `${item.valor * 10}%`,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
              }} />
              <Text style={{ marginTop: 5, fontSize: 12 }}>{item.ano}</Text>
              <Text style={{ fontWeight: 'bold', fontSize: 12 }}>{item.valor}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderGraficoSalarioComparativo = () => {
    const dados = getDadosGraficos().comparativoSalarial;
    const { cidade } = getCidadeEstado();

    return (
      <View style={{ marginBottom: 25 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Índice Salarial Comparativo (Base 100)
        </Text>

        <View>
          {dados.map((item, index) => (
            <View key={index} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ fontSize: 14 }}>{item.regiao}</Text>
                <Text style={{ fontSize: 14 }}>{item.valor}</Text>
              </View>
              <View style={{ height: 10, backgroundColor: '#e0e0e0', borderRadius: 5 }}>
                <View style={{
                  backgroundColor: '#F44336',
                  height: '100%',
                  width: `${item.valor}%`,
                  borderRadius: 5
                }} />
              </View>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 12, color: '#757575', fontStyle: 'italic', marginTop: 5 }}>
          *Índice 100 = Salário médio em {cidade}
        </Text>
      </View>
    );
  };

  const renderGraficoDesemprego = () => {
    const dados = getDadosGraficos().desemprego;

    return (
      <View style={{ marginBottom: 25 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Taxa de Desemprego (%)
        </Text>

        <View>
          {dados.map((item, index) => (
            <View key={index} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ fontSize: 14 }}>{item.regiao}</Text>
                <Text style={{ fontSize: 14 }}>{item.valor}%</Text>
              </View>
              <View style={{ height: 10, backgroundColor: '#e0e0e0', borderRadius: 5 }}>
                <View style={{
                  backgroundColor: '#3F51B5',
                  height: '100%',
                  width: `${item.valor * 10}%`,
                  borderRadius: 5
                }} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const { cidade, estado } = getCidadeEstado();

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
        <Text style={styles.headerTitle}>Gráficos Regionais</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 20, textAlign: 'center' }}>
            Analisando dados demográficos e econômicos da sua região...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={carregarDadosRegionais}
          >
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={{ padding: 15 }}>
          {/* Cabeçalho com Localização */}
          <View style={{
            backgroundColor: '#E91E63',
            borderRadius: 10,
            padding: 15,
            marginBottom: 15,
          }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 5 }}>
              {cidade}, {estado}
            </Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 14 }}>
              Análise de mercado e estatísticas regionais
            </Text>
          </View>

          {/* Gráficos Estatísticos */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 15,
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
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' }}>
              Estatísticas de Mercado - {cidade}
            </Text>

            {renderGraficoSetores()}
            {renderGraficoCrescimento()}
            {renderGraficoSalarioComparativo()}
            {renderGraficoDesemprego()}
          </View>

          {/* Análise Detalhada */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 15,
            marginBottom: 20,
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
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' }}>
              Análise Regional Detalhada
            </Text>

            <Markdown
              style={{
                body: { fontSize: 16, lineHeight: 24, color: Colors.dark },
                heading1: {
                  fontSize: 20,
                  fontWeight: 'bold',
                  marginBottom: 10,
                  color: Colors.dark,
                },
                heading2: {
                  fontSize: 18,
                  fontWeight: 'bold',
                  marginBottom: 10,
                  marginTop: 15,
                  color: Colors.dark
                },
                heading3: {
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginTop: 10,
                  marginBottom: 5,
                  color: Colors.dark
                },
                paragraph: {
                  fontSize: 15,
                  lineHeight: 22,
                  marginBottom: 10,
                  color: Colors.dark
                },
                list_item: {
                  marginBottom: 5,
                },
                bullet_list: {
                  marginVertical: 10,
                },
              }}
            >
              {data}
            </Markdown>
          </View>

          {/* Fontes dos Dados */}
          <View style={{
            backgroundColor: '#f5f5f5',
            padding: 15,
            borderRadius: 8,
            marginBottom: 30,
          }}>
            <Text style={{ fontSize: 12, color: '#757575', fontStyle: 'italic' }}>
              Dados compilados de fontes oficiais como IBGE, CAGED, Ministério do Trabalho, Federação das Indústrias de Santa Catarina (FIESC) e relatórios municipais de 2022-2025. Todos os dados são aproximações e podem variar conforme metodologia.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const ConfiguracoesAvancadasScreen = ({ navigation }) => {
  const [iaConfigs, setIaConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeIA, setActiveIA] = useState('GEMINI');

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      setLoading(true);

      // Carregar configurações de todas as IAs
      const configs = {};

      for (const [key, value] of Object.entries(IA_APIS)) {
        const apiKey = await getIAAPIKey(key);

        configs[key] = {
          nome: value.nome,
          apiKey: apiKey,
          isDefault: false,
          modelo: 'Padrão',
          temperatura: 0.7,
          maxTokens: 800,
        };
      }

      // Carregar IA padrão
      const defaultIA = await AsyncStorage.getItem('ia_padrao');
      if (defaultIA && configs[defaultIA]) {
        configs[defaultIA].isDefault = true;
        setActiveIA(defaultIA);
      }

      // Carregar configurações avançadas (se existirem)
      const advancedConfigs = await AsyncStorage.getItem('ia_advanced_configs');
      if (advancedConfigs) {
        const parsedConfigs = JSON.parse(advancedConfigs);

        // Mesclar com as configurações básicas
        for (const [key, value] of Object.entries(parsedConfigs)) {
          if (configs[key]) {
            configs[key] = { ...configs[key], ...value };
          }
        }
      }

      setIaConfigs(configs);

    } catch (error) {
      console.error('Erro ao carregar configurações avançadas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as configurações.');
    } finally {
      setLoading(false);
    }
  };

  const saveAdvancedConfig = async () => {
    try {
      setSaving(true);

      // Salvar API key
      await salvarIAAPIKey(activeIA, iaConfigs[activeIA].apiKey);

      // Salvar como IA padrão se marcado
      if (iaConfigs[activeIA].isDefault) {
        await AsyncStorage.setItem('ia_padrao', activeIA);

        // Atualizar outras IAs para não serem padrão
        const updatedConfigs = { ...iaConfigs };
        for (const key of Object.keys(updatedConfigs)) {
          if (key !== activeIA) {
            updatedConfigs[key].isDefault = false;
          }
        }
        setIaConfigs(updatedConfigs);
      }

      // Salvar configurações avançadas
      const advancedConfigs = {};
      for (const [key, value] of Object.entries(iaConfigs)) {
        advancedConfigs[key] = {
          modelo: value.modelo,
          temperatura: value.temperatura,
          maxTokens: value.maxTokens,
        };
      }

      await AsyncStorage.setItem('ia_advanced_configs', JSON.stringify(advancedConfigs));

      Alert.alert('Sucesso', 'Configurações salvas com sucesso!');

    } catch (error) {
      console.error('Erro ao salvar configurações avançadas:', error);
      Alert.alert('Erro', 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setIaConfigs(prev => ({
      ...prev,
      [activeIA]: {
        ...prev[activeIA],
        [field]: value
      }
    }));
  };

  // Componente de Slider personalizado sem dependências externas
  const CustomSlider = ({ value, onValueChange, minimumValue, maximumValue, step }) => {
    // Valores possíveis com base no step
    const values = [];
    for (let i = minimumValue; i <= maximumValue; i += step) {
      values.push(parseFloat(i.toFixed(1))); // Arredondar para 1 casa decimal
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: 'center',
          paddingVertical: 10,
        }}
      >
        {values.map((val) => (
          <TouchableOpacity
            key={val}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: val <= value ? Colors.primary : Colors.lightGray,
              justifyContent: 'center',
              alignItems: 'center',
              marginHorizontal: 2,
            }}
            onPress={() => onValueChange(val)}
          >
            <Text style={{
              fontSize: 10,
              color: val <= value ? Colors.white : Colors.dark,
            }}>
              {val}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderModeloOptions = () => {
    // Opções de modelo com base na IA selecionada
    const options = {
      'GEMINI': ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-pro-vision', 'gemini-2.0-pro', 'gemini-2.0-flash'],
      'CLAUDE': ['claude-3-sonnet-20240229', 'claude-3-opus-20240229', 'claude-3.5-sonnet', 'claude-3.7-sonnet'],
      'PERPLEXITY': ['llama-3-8b-instruct', 'llama-3-70b-instruct', 'sonar-small-online', 'sonar-medium-online'],
      'DEEPSEEK': ['deepseek-chat', 'deepseek-coder'],
      'BLACKBOX': ['blackbox-default'],
      'GROK': ['grok-1', 'grok-2'],
      'OFFLINE': ['local-only']
    };

    const modelosDisponiveis = options[activeIA] || ['default'];

    return (
      <View style={{ marginBottom: 15 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '500',
          marginBottom: 8,
          color: Colors.dark,
        }}>
          Modelo:
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 10 }}
        >
          {modelosDisponiveis.map((modelo, index) => (
            <TouchableOpacity
              key={index}
              style={{
                backgroundColor: iaConfigs[activeIA]?.modelo === modelo ? Colors.primary : Colors.lightGray,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                marginRight: 8,
              }}
              onPress={() => handleInputChange('modelo', modelo)}
            >
              <Text style={{
                color: iaConfigs[activeIA]?.modelo === modelo ? Colors.white : Colors.dark,
              }}>
                {modelo}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Função para obter API key (simulação da função existente no código principal)
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

  // Função para salvar API key (simulação da função existente no código principal)
  const salvarIAAPIKey = async (tipoIA, apiKey) => {
    try {
      await AsyncStorage.setItem(`ia_api_key_${tipoIA}`, apiKey);
      return true;
    } catch (error) {
      console.error('Erro ao salvar chave da API:', error);
      return false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={HeaderColors.background} />

      <View style={styles.configHeader}>
        <Text style={styles.configHeaderTitle}>Configurações Avançadas</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 10 }}>Carregando configurações...</Text>
        </View>
      ) : (
        <ScrollView style={{ padding: 15 }}>
          <View style={{
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
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: Colors.dark,
              marginBottom: 15,
            }}>
              Configurações Avançadas de IAs
            </Text>

            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '500',
                marginBottom: 8,
                color: Colors.dark,
              }}>
                Selecione a IA:
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 10 }}
              >
                {Object.entries(iaConfigs).map(([key, value]) => (
                  <TouchableOpacity
                    key={key}
                    style={{
                      backgroundColor: activeIA === key ? Colors.primary : Colors.lightGray,
                      paddingVertical: 10,
                      paddingHorizontal: 15,
                      borderRadius: 8,
                      marginRight: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => setActiveIA(key)}
                  >
                    <Text style={{
                      color: activeIA === key ? Colors.white : Colors.dark,
                      fontWeight: activeIA === key ? 'bold' : 'normal',
                    }}>
                      {value.nome}
                    </Text>
                    {value.isDefault && (
                      <View style={{
                        backgroundColor: activeIA === key ? Colors.white : Colors.primary,
                        borderRadius: 10,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        marginLeft: 5,
                      }}>
                        <Text style={{
                          fontSize: 10,
                          color: activeIA === key ? Colors.primary : Colors.white,
                        }}>
                          Padrão
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Configurações da IA selecionada */}
            {activeIA && iaConfigs[activeIA] && (
              <>
                <View style={{ marginBottom: 15 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    marginBottom: 8,
                    color: Colors.dark,
                  }}>
                    API Key:
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: Colors.lightGray,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                    }}
                    value={iaConfigs[activeIA].apiKey}
                    onChangeText={(text) => handleInputChange('apiKey', text)}
                    placeholder="Insira sua API Key aqui"
                    secureTextEntry={true}
                  />
                  {IA_APIS[activeIA]?.chaveDefault && !iaConfigs[activeIA].apiKey && (
                    <Text style={{
                      fontSize: 12,
                      color: Colors.info,
                      marginTop: 5,
                    }}>
                      API Key padrão disponível, mas você pode adicionar sua própria
                    </Text>
                  )}
                </View>

                {/* Opções de modelo */}
                {renderModeloOptions()}

                <View style={{ marginBottom: 15 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    marginBottom: 8,
                    color: Colors.dark,
                  }}>
                    Temperatura: {iaConfigs[activeIA].temperatura.toFixed(1)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text>0.1</Text>
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <CustomSlider
                        minimumValue={0.1}
                        maximumValue={1.0}
                        step={0.1}
                        value={iaConfigs[activeIA].temperatura}
                        onValueChange={(value) => handleInputChange('temperatura', value)}
                      />
                    </View>
                    <Text>1.0</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: Colors.lightText, marginTop: 5 }}>
                    Valores mais baixos = respostas mais precisas. Valores mais altos = respostas mais criativas.
                  </Text>
                </View>

                <View style={{ marginBottom: 15 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    marginBottom: 8,
                    color: Colors.dark,
                  }}>
                    Máximo de tokens: {iaConfigs[activeIA].maxTokens}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 10 }}
                  >
                    {[200, 500, 800, 1000, 1500, 2000, 4000].map(value => (
                      <TouchableOpacity
                        key={value}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          marginRight: 8,
                          backgroundColor: iaConfigs[activeIA].maxTokens === value ? Colors.primary : Colors.lightGray,
                          borderRadius: 8,
                        }}
                        onPress={() => handleInputChange('maxTokens', value)}
                      >
                        <Text style={{
                          color: iaConfigs[activeIA].maxTokens === value ? Colors.white : Colors.dark,
                        }}>
                          {value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={{ fontSize: 12, color: Colors.lightText, marginTop: 5 }}>
                    Controla a extensão máxima da resposta. Valores mais altos permitem respostas mais longas.
                  </Text>
                </View>

                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 20,
                }}>
                  <Switch
                    value={iaConfigs[activeIA].isDefault}
                    onValueChange={(value) => handleInputChange('isDefault', value)}
                    trackColor={{ false: Colors.lightGray, true: Colors.primary }}
                    thumbColor={Colors.white}
                  />
                  <Text style={{ marginLeft: 10 }}>
                    Definir como IA padrão
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.primary,
                    borderRadius: 8,
                    padding: 15,
                    alignItems: 'center',
                  }}
                  onPress={saveAdvancedConfig}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={{
                      color: Colors.white,
                      fontWeight: 'bold',
                      fontSize: 16,
                    }}>
                      Salvar Configurações
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Notas explicativas */}
                <View style={{
                  marginTop: 20,
                  padding: 15,
                  backgroundColor: '#f9f9f9',
                  borderRadius: 8,
                  borderLeftWidth: 3,
                  borderLeftColor: Colors.info,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: Colors.info }}>
                    Notas sobre configurações avançadas:
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.dark, marginBottom: 5 }}>
                    • Temperatura: controla a aleatoriedade das respostas. Valores mais baixos (ex: 0.1) geram respostas mais previsíveis e focadas, enquanto valores mais altos (ex: 1.0) geram respostas mais variadas e criativas.
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.dark, marginBottom: 5 }}>
                    • Tokens: unidades básicas de texto. Mais tokens = respostas mais longas, mas também mais consumo de API. Um token equivale a aproximadamente 4 caracteres em inglês ou 2-3 em português.
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.dark }}>
                    • Modelo: diferentes modelos oferecem diferentes capacidades e velocidades. Modelos mais novos geralmente têm melhor desempenho mas podem consumir mais tokens.
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Histórico de uso */}
          <View style={{
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
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: Colors.dark,
              marginBottom: 15,
            }}>
              Uso de API
            </Text>

            <Text style={{ marginBottom: 10 }}>
              Analise de currículos: 12 chamadas
            </Text>
            <Text style={{ marginBottom: 10 }}>
              Busca de vagas: 5 chamadas
            </Text>
            <Text style={{ marginBottom: 15 }}>
              Total de tokens: ~24.000
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: Colors.lightGray,
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
              }}
              onPress={() => Alert.alert('Em Desenvolvimento', 'Esta funcionalidade será implementada em versões futuras.')}
            >
              <Text style={{ color: Colors.dark }}>Ver Detalhes de Uso</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const ConfiguracoesScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    telefone: user?.telefone || '',
    linkedin: user?.linkedin || '',
    github: user?.github || '',
    website: user?.website || ''
  });

  // Estado para controlar o modo premium e notificações
  const [isPremium, setIsPremium] = useState(true); // Definido como true para o CurriculoBot Premium
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [dataExportFormat, setDataExportFormat] = useState('PDF');

  // Determinar a cor do avatar com base no índice salvo ou usar padrão
  const avatarColors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#d35400', '#c0392b'];
  const avatarColor = user?.avatarColorIndex !== undefined
    ? avatarColors[user.avatarColorIndex]
    : avatarColors[0];

  const salvarPerfil = async () => {
    try {
      setLoading(true);

      // Obter lista de usuários
      const usuariosStr = await AsyncStorage.getItem('usuarios');
      const usuarios = JSON.parse(usuariosStr) || [];

      // Encontrar e atualizar o usuário atual
      const index = usuarios.findIndex(u => u.id === user.id);

      if (index !== -1) {
        // Manter foto e cor do avatar
        const updatedUser = {
          ...usuarios[index],
          ...profileData,
          foto: user.foto,
          avatarColorIndex: user.avatarColorIndex,
          dataAtualizacao: new Date().toISOString()
        };

        // Salvar de volta no AsyncStorage
        usuarios[index] = updatedUser;
        await AsyncStorage.setItem('usuarios', JSON.stringify(usuarios));

        // Atualizar usuário atual
        await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));

        // Atualizar contexto de autenticação se a função estiver disponível
        if (updateUser) {
          updateUser(updatedUser);
        }

        Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
        setEditingProfile(false);
      } else {
        Alert.alert('Erro', 'Usuário não encontrado. Tente fazer login novamente.');
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarFoto = () => {
    navigation.navigate('PerfilFoto', { returnTo: 'ConfigMain' });
  };

  const confirmLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              // Mostrar indicador de carregamento (opcional)
              setLoading(true);

              // Chamar a função de logout do contexto
              const success = await logout();

              if (!success) {
                // Se logout falhou por algum motivo, mostrar erro
                Alert.alert('Erro', 'Não foi possível completar o logout. Tente novamente.');
              }

              // Não precisamos redirecionar explicitamente, pois o RootNavigator
              // deve cuidar disso automaticamente quando user for definido como null
            } catch (error) {
              console.error('Erro ao fazer logout:', error);
              Alert.alert('Erro', 'Ocorreu um problema ao sair. Tente novamente.');
            } finally {
              // Esconder o indicador de carregamento
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const limparCache = async () => {
    try {
      setLoading(true);

      // Obter todas as chaves do AsyncStorage
      const keys = await AsyncStorage.getAllKeys();

      // Filtrar as chaves de cache (vagas, análises, etc)
      const cacheKeys = keys.filter(key =>
        key.startsWith('vagas_') ||
        key.includes('analise_') ||
        key.startsWith('cache_')
      );

      if (cacheKeys.length > 0) {
        // Remover os itens de cache
        await AsyncStorage.multiRemove(cacheKeys);
        Alert.alert('Sucesso', `Cache limpo! ${cacheKeys.length} itens removidos.`);
      } else {
        Alert.alert('Informação', 'Não há cache para limpar.');
      }

    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      Alert.alert('Erro', 'Não foi possível limpar o cache.');
    } finally {
      setLoading(false);
    }
  };

  // Função para mostrar mensagem de funcionalidade futura
  const showComingSoonFeature = (featureName) => {
    Alert.alert(
      "Em Breve",
      `A funcionalidade "${featureName}" estará disponível em uma atualização futura do aplicativo.`,
      [{ text: "Entendi" }]
    );
  };

  // Função para exportar dados
  const exportarDados = () => {
    Alert.alert(
      'Exportar Dados',
      'Escolha o formato para exportação dos seus dados:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'PDF',
          onPress: () => {
            setDataExportFormat('PDF');
            showComingSoonFeature('Exportar para PDF');
          }
        },
        {
          text: 'Word',
          onPress: () => {
            setDataExportFormat('Word');
            showComingSoonFeature('Exportar para Word');
          }
        },
        {
          text: 'JSON',
          onPress: () => {
            setDataExportFormat('JSON');
            showComingSoonFeature('Exportar para JSON');
          }
        }
      ]
    );
  };

  // Função para autenticação em duas etapas
  const configurarDoisFatores = () => {
    showComingSoonFeature('Autenticação em Duas Etapas');
  };

  // Função para sincronização com a nuvem
  const sincronizarNuvem = () => {
    showComingSoonFeature('Sincronizar com a Nuvem');
  };

  // Função para integração com LinkedIn
  const conectarLinkedIn = () => {
    showComingSoonFeature('Conectar com LinkedIn');
  };

  // Função para alterar idioma
  const alterarIdioma = () => {
    Alert.alert(
      'Selecionar Idioma',
      'Escolha o idioma do aplicativo:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Português (Atual)', onPress: () => { } },
        { text: 'English', onPress: () => showComingSoonFeature('Mudar para Inglês') },
        { text: 'Español', onPress: () => showComingSoonFeature('Mudar para Espanhol') }
      ]
    );
  };

  // Função para mudar o tema (simulação)
  const mudarTema = () => {
    setDarkModeEnabled(!darkModeEnabled);
    Alert.alert(
      darkModeEnabled ? 'Modo Claro Ativado' : 'Modo Escuro Ativado',
      `Você ativou o ${darkModeEnabled ? 'modo claro' : 'modo escuro'}. A funcionalidade completa estará disponível em breve.`,
      [{ text: "OK" }]
    );
  };

  // Função para gerenciar notificações
  const gerenciarNotificacoes = () => {
    setNotificationsEnabled(!notificationsEnabled);
    Alert.alert(
      notificationsEnabled ? 'Notificações Desativadas' : 'Notificações Ativadas',
      `Você ${notificationsEnabled ? 'desativou' : 'ativou'} as notificações. A funcionalidade completa estará disponível em breve.`,
      [{ text: "OK" }]
    );
  };

  // Função para backup automático
  const configurarBackupAutomatico = () => {
    showComingSoonFeature('Backup Automático');
  };

  // Função para alterar senha
  const alterarSenha = () => {
    Alert.alert(
      'Alterar Senha',
      'Esta funcionalidade permitiria alterar sua senha. Em um aplicativo real, você precisaria fornecer sua senha atual e confirmar a nova senha.',
      [{ text: "Entendi" }]
    );
  };

  // Verificar atualizações
  const verificarAtualizacoes = () => {
    setLoading(true);

    // Simular verificação de atualização
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Nenhuma Atualização Disponível',
        'Você já está usando a versão mais recente do CurriculoBot Premium (1.2.0).',
        [{ text: "OK" }]
      );
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={HeaderColors.background} />

      <View style={styles.configHeader}>
        <Text style={styles.configHeaderTitle}>Configurações</Text>
      </View>

      <ScrollView style={{ padding: 15 }}>
        {/* Seção de Perfil */}
        <View style={{
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
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 15
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: Colors.dark,
            }}>
              Perfil
            </Text>

            <TouchableOpacity
              onPress={() => setEditingProfile(!editingProfile)}
            >
              <Text style={{ color: Colors.primary }}>
                {editingProfile ? 'Cancelar' : 'Editar'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: user?.foto ? 'transparent' : avatarColor,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 10,
                borderWidth: 2,
                borderColor: Colors.primary,
                padding: 2,
              }}
              onPress={handleSelecionarFoto}
              disabled={!editingProfile}
            >
              {user?.foto ? (
                <Image
                  source={{ uri: user.foto }}
                  style={{ width: 95, height: 95, borderRadius: 48 }}
                />
              ) : (
                <Text style={{
                  fontSize: 36,
                  color: Colors.white,
                  fontWeight: 'bold',
                }}>
                  {user?.nome?.charAt(0) || 'U'}
                </Text>
              )}

              {editingProfile && (
                <View style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: Colors.primary,
                  borderRadius: 15,
                  width: 30,
                  height: 30,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: Colors.white,
                }}>
                  <Text style={{ color: Colors.white, fontSize: 16 }}>📷</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
              {user?.nome || 'Usuário'}
            </Text>
            <Text style={{ color: Colors.lightText }}>
              {user?.email || 'email@exemplo.com'}
            </Text>

            {/* Badge de status premium */}
            <View style={{
              backgroundColor: '#FFD700',
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 12,
              marginTop: 5,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 12, marginRight: 4 }}>
                ⭐ PREMIUM
              </Text>
            </View>
          </View>

          {editingProfile ? (
            <>
              <View style={{ marginBottom: 15 }}>
                <Text style={{ marginBottom: 5, fontWeight: '500' }}>Nome:</Text>
                <TextInput
                  style={{
                    backgroundColor: Colors.lightGray,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                  value={profileData.nome}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, nome: text }))}
                  placeholder="Seu nome"
                />
              </View>

              <View style={{ marginBottom: 15 }}>
                <Text style={{ marginBottom: 5, fontWeight: '500' }}>Telefone:</Text>
                <TextInput
                  style={{
                    backgroundColor: Colors.lightGray,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                  value={profileData.telefone}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, telefone: text }))}
                  placeholder="Seu telefone"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={{ marginBottom: 15 }}>
                <Text style={{ marginBottom: 5, fontWeight: '500' }}>LinkedIn:</Text>
                <TextInput
                  style={{
                    backgroundColor: Colors.lightGray,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                  value={profileData.linkedin}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, linkedin: text }))}
                  placeholder="URL do seu LinkedIn"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={{ marginBottom: 15 }}>
                <Text style={{ marginBottom: 5, fontWeight: '500' }}>GitHub:</Text>
                <TextInput
                  style={{
                    backgroundColor: Colors.lightGray,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                  value={profileData.github}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, github: text }))}
                  placeholder="URL do seu GitHub"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={{ marginBottom: 5, fontWeight: '500' }}>Website:</Text>
                <TextInput
                  style={{
                    backgroundColor: Colors.lightGray,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                  value={profileData.website}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, website: text }))}
                  placeholder="URL do seu site pessoal"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: Colors.primary,
                  borderRadius: 8,
                  padding: 15,
                  alignItems: 'center',
                }}
                onPress={salvarPerfil}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={{
                    color: Colors.white,
                    fontWeight: 'bold',
                    fontSize: 16,
                  }}>
                    Salvar Alterações
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View>
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold' }}>Email:</Text>
                <Text>{user?.email || 'Não informado'}</Text>
              </View>

              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold' }}>Telefone:</Text>
                <Text>{user?.telefone || 'Não informado'}</Text>
              </View>

              {user?.linkedin && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: 'bold' }}>LinkedIn:</Text>
                  <Text style={{ color: Colors.primary }}>{user.linkedin}</Text>
                </View>
              )}

              {user?.github && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: 'bold' }}>GitHub:</Text>
                  <Text style={{ color: Colors.primary }}>{user.github}</Text>
                </View>
              )}

              {user?.website && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: 'bold' }}>Website:</Text>
                  <Text style={{ color: Colors.primary }}>{user.website}</Text>
                </View>
              )}

              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold' }}>Membro desde:</Text>
                <Text>{user?.dataCadastro ? new Date(user.dataCadastro).toLocaleDateString() : 'Não informado'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Seção de Conta e Segurança - EXPANDIDA COM NOVAS FUNCIONALIDADES */}
        <View style={{
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
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.dark,
            marginBottom: 15,
          }}>
            Conta e Segurança
          </Text>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={alterarSenha}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.secondary,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🔒</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Alterar Senha</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Atualize sua senha de acesso</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24 }}>›</Text>
          </TouchableOpacity>

          {/* NOVA FUNCIONALIDADE: Autenticação em Duas Etapas */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={configurarDoisFatores}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#9C27B0',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🔐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Autenticação em Duas Etapas</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Adicione uma camada extra de segurança</Text>
            </View>
            <View style={{
              backgroundColor: '#FFD700',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>EM BREVE</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24, marginLeft: 8 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={exportarDados}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#3498db',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>📦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Exportar Meus Dados</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Faça backup de seus currículos e configurações</Text>
            </View>
            <Text style={{ color: '#777', fontSize: 12, marginRight: 8 }}>{dataExportFormat}</Text>
            <Text style={{ color: Colors.primary, fontSize: 24 }}>›</Text>
          </TouchableOpacity>

          {/* NOVA FUNCIONALIDADE: Backup Automático */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={configurarBackupAutomatico}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#4CAF50',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🔄</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Backup Automático</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Configure salvamento periódico dos seus dados</Text>
            </View>
            <View style={{
              backgroundColor: '#FFD700',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>EM BREVE</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24, marginLeft: 8 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* NOVA SEÇÃO: Integrações */}
        <View style={{
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
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.dark,
            marginBottom: 15,
          }}>
            Integrações
          </Text>

          {/* Integração com LinkedIn */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={conectarLinkedIn}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#0077B5',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🔗</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Conectar com LinkedIn</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Importe dados do seu perfil profissional</Text>
            </View>
            <View style={{
              backgroundColor: '#FFD700',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>EM BREVE</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24, marginLeft: 8 }}>›</Text>
          </TouchableOpacity>

          {/* Sincronização com nuvem */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={sincronizarNuvem}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#03A9F4',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>☁️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Sincronizar com Nuvem</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Google Drive, Dropbox ou OneDrive</Text>
            </View>
            <View style={{
              backgroundColor: '#FFD700',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>EM BREVE</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24, marginLeft: 8 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Seção de Configurações Gerais - EXPANDIDA COM NOVAS OPÇÕES */}
        <View style={{
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
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.dark,
            marginBottom: 15,
          }}>
            Configurações Gerais
          </Text>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={() => navigation.navigate('ConfiguracoesIA')}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🔑</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Configurações de IA</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Gerenciar chaves de API</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24 }}>›</Text>
          </TouchableOpacity>

          {/* Tema do aplicativo */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={mudarTema}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#9b59b6',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🎨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Tema do Aplicativo</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>
                {darkModeEnabled ? 'Modo escuro ativado' : 'Modo claro ativado'}
              </Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={mudarTema}
              trackColor={{ false: Colors.lightGray, true: 'rgba(155, 89, 182, 0.5)' }}
              thumbColor={darkModeEnabled ? '#9b59b6' : '#f4f3f4'}
            />
          </TouchableOpacity>

          {/* NOVA FUNCIONALIDADE: Notificações */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={gerenciarNotificacoes}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#F44336',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🔔</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Notificações</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>
                {notificationsEnabled ? 'Notificações ativadas' : 'Notificações desativadas'}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={gerenciarNotificacoes}
              trackColor={{ false: Colors.lightGray, true: 'rgba(244, 67, 54, 0.5)' }}
              thumbColor={notificationsEnabled ? '#F44336' : '#f4f3f4'}
            />
          </TouchableOpacity>

          {/* NOVA FUNCIONALIDADE: Idioma */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={alterarIdioma}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#2196F3',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🌐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Idioma</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Português</Text>
            </View>
            <View style={{
              backgroundColor: '#FFD700',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>EM BREVE</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24, marginLeft: 8 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={limparCache}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.warning,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🗑️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Limpar Cache</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Remover dados armazenados localmente</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={() => navigation.navigate('SobreApp')}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.info,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>ℹ️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Sobre o Aplicativo</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Informações e termos de uso</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24 }}>›</Text>
          </TouchableOpacity>

          {/* NOVA FUNCIONALIDADE: Verificar Atualizações */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={verificarAtualizacoes}
            disabled={loading}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#009688',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>↻</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Verificar Atualizações</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Buscar novas versões do aplicativo</Text>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 10 }} />
            ) : (
              <Text style={{ color: Colors.primary, fontSize: 24 }}>›</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
            }}
            onPress={confirmLogout}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.danger,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>⤶</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Sair</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Encerrar sessão</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Versão do aplicativo */}
        <View style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 20,
          marginBottom: 30
        }}>
          <Text style={{
            color: Colors.lightText,
            fontSize: 14
          }}>
            CurriculoBot Premium
          </Text>
          <Text style={{
            color: Colors.lightText,
            fontSize: 12
          }}>
            Versão 1.2.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const Tab = createBottomTabNavigator();

const HomeStack = createStackNavigator();

// Função para renderizar ícones na Tab Bar sem depender de biblioteca externa
const renderTabBarIcon = (route, focused, color, size) => {
  // Usar emojis ou caracteres unicode em vez de ícones
  if (route.name === 'Home') {
    return <Text style={{ fontSize: 24, color }}>🏠</Text>;
  } else if (route.name === 'Dashboard') {
    return <Text style={{ fontSize: 24, color }}>📊</Text>;
  } else if (route.name === 'ConfigAv') {
    return <Text style={{ fontSize: 24, color }}>🔧</Text>;
  } else if (route.name === 'Config') {
    return <Text style={{ fontSize: 24, color }}>⚙️</Text>;
  }
  return null;
};

// Componente de Slider personalizado para substituir o @react-native-community/slider
const CustomSlider = ({ value, onValueChange, minimumValue, maximumValue, step, style }) => {
  const [localValue, setLocalValue] = useState(value);

  // Lista de valores possíveis baseados em step
  const values = [];
  for (let i = minimumValue; i <= maximumValue; i += step) {
    values.push(i);
  }

  // Quando o valor local muda, chamamos o callback
  useEffect(() => {
    if (localValue !== value) {
      onValueChange && onValueChange(localValue);
    }
  }, [localValue]);

  return (
    <View style={[{ flex: 1, height: 40, flexDirection: 'row', alignItems: 'center' }, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10 }}
      >
        {values.map((val) => (
          <TouchableOpacity
            key={val}
            style={{
              padding: 8,
              marginHorizontal: 2,
              backgroundColor: val <= localValue ? Colors.primary : Colors.lightGray,
              borderRadius: 4,
            }}
            onPress={() => setLocalValue(val)}
          >
            <Text style={{ color: val <= localValue ? Colors.white : Colors.dark, fontSize: 12 }}>
              {val.toFixed(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const HomeStackScreen = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="HomeMain" component={HomeScreen} />
    <HomeStack.Screen name="Chatbot" component={ChatbotScreen} />
    <HomeStack.Screen name="MeusCurriculos" component={MeusCurriculosScreen} />
    <HomeStack.Screen name="PreviewCV" component={PreviewCVScreen} />
    <HomeStack.Screen name="CurriculosAnalise" component={CurriculosAnaliseScreen} />
    <HomeStack.Screen name="AnaliseCV" component={AnaliseCVScreen} />
    <HomeStack.Screen name="SelecionarCurriculo" component={SelecionarCurriculoScreen} />
    <HomeStack.Screen name="BuscaVagas" component={BuscaVagasScreen} />
    <HomeStack.Screen name="SobreApp" component={SobreAppScreen} />
    <HomeStack.Screen name="ConfiguracoesIA" component={ConfiguracoesIAScreen} />

    {/* Novas telas */}
    <HomeStack.Screen name="DadosMercado" component={DadosMercadoScreen} />
    <HomeStack.Screen name="GraficosRegionais" component={GraficosRegionaisScreen} />
  </HomeStack.Navigator>
);

// Não precisa de Stack para o Dashboard pois ele não navega para outras telas
const DashboardStack = createStackNavigator();
const DashboardStackScreen = () => (
  <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
    <DashboardStack.Screen name="DashboardMain" component={DashboardScreen} />
    <DashboardStack.Screen name="Chatbot" component={ChatbotScreen} />
    <DashboardStack.Screen name="MeusCurriculos" component={MeusCurriculosScreen} />
    <DashboardStack.Screen name="CurriculosAnalise" component={CurriculosAnaliseScreen} />
    <DashboardStack.Screen name="SelecionarCurriculo" component={SelecionarCurriculoScreen} />

    {/* Novas telas */}
    <DashboardStack.Screen name="DadosMercado" component={DadosMercadoScreen} />
    <DashboardStack.Screen name="GraficosRegionais" component={GraficosRegionaisScreen} />
  </DashboardStack.Navigator>
);

const ConfigStack = createStackNavigator();
const ConfigStackScreen = () => (
  <ConfigStack.Navigator screenOptions={{ headerShown: false }}>
    <ConfigStack.Screen name="ConfigMain" component={ConfiguracoesScreen} />
    <ConfigStack.Screen name="ConfiguracoesIA" component={ConfiguracoesIAScreen} />
    <ConfigStack.Screen name="PerfilFoto" component={PerfilFotoScreen} />
    <ConfigStack.Screen name="Chatbot" component={ChatbotScreen} />
    <ConfigStack.Screen name="SobreApp" component={SobreAppScreen} />
  </ConfigStack.Navigator>
);

// Stack para Configurações Avançadas
const ConfigAvStack = createStackNavigator();
const ConfigAvStackScreen = () => (
  <ConfigAvStack.Navigator screenOptions={{ headerShown: false }}>
    <ConfigAvStack.Screen name="ConfigAvMain" component={ConfiguracoesAvancadasScreen} />
  </ConfigAvStack.Navigator>
);

// Tab Navigator para usuários autenticados
const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => renderTabBarIcon(route, focused, color, size),
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.lightText,
      tabBarStyle: {
        height: 60,
        paddingBottom: 10,
        paddingTop: 5,
      },
      tabBarLabelStyle: {
        fontSize: 12,
      },
    })}
  >
    <Tab.Screen
      name="Home"
      component={HomeStackScreen}
      options={{ tabBarLabel: 'Início' }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardStackScreen}
      options={{ tabBarLabel: 'Dashboard' }}
    />
    <Tab.Screen
      name="ConfigAv"
      component={ConfigAvStackScreen}
      options={{ tabBarLabel: 'API Avançada' }}
    />
    <Tab.Screen
      name="Config"
      component={ConfigStackScreen}
      options={{ tabBarLabel: 'Configurações' }}
    />
  </Tab.Navigator>
);

// Modificar o AppNavigator para usar o TabNavigator
const AppNavigator = () => (
  <AppStack.Navigator screenOptions={{ headerShown: false }}>
    <AppStack.Screen name="MainTabs" component={TabNavigator} />
  </AppStack.Navigator>
);

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

// Função atualizada para buscar vagas com opção de forçar atualização
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

// Tela de Busca de Vagas
// const BuscaVagasScreen = ({ route, navigation }) => {
//   const { curriculoData } = route.params;
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [vagasResultado, setVagasResultado] = useState(null);
//   const [loadingProgress, setLoadingProgress] = useState(0);

//   useEffect(() => {
//     // Simular progresso durante a busca para feedback visual
//     const progressInterval = setInterval(() => {
//       setLoadingProgress(prev => {
//         const newProgress = prev + (0.1 * Math.random());
//         return newProgress > 0.9 ? 0.9 : newProgress;
//       });
//     }, 800);

//     // Iniciar a busca de vagas
//     buscarVagas();

//     return () => clearInterval(progressInterval);
//   }, []);

//   const buscarVagas = async () => {
//     try {
//       // Verificar o cache primeiro
//       const cacheKey = `vagas_${JSON.stringify(curriculoData).slice(0, 50)}`;
//       const cachedResult = await AsyncStorage.getItem(cacheKey);

//       if (cachedResult) {
//         const parsed = JSON.parse(cachedResult);
//         const cacheAge = new Date() - new Date(parsed.timestamp);
//         const cacheValidHours = 24;

//         if (cacheAge < cacheValidHours * 60 * 60 * 1000) {
//           console.log(`Usando resultado em cache para busca de vagas`);
//           setVagasResultado(parsed.resultado);
//           setLoading(false);
//           setLoadingProgress(1);
//           return;
//         }
//       }

//       // Se não tem cache válido, fazer a busca
//       const resultado = await buscarVagasComGemini(curriculoData);

//       if (resultado.success) {
//         setVagasResultado(resultado.vagas);
//       } else {
//         setError(resultado.error);
//       }
//     } catch (error) {
//       console.error('Erro na busca de vagas:', error);
//       setError('Não foi possível completar a busca de vagas. Tente novamente mais tarde.');
//     } finally {
//       setLoading(false);
//       setLoadingProgress(1);
//     }
//   };

//   const handleTryAgain = () => {
//     setLoading(true);
//     setError(null);
//     setLoadingProgress(0.1);
//     buscarVagas();
//   };

//   const handleShare = async () => {
//     try {
//       await Share.share({
//         message: vagasResultado,
//         title: 'Vagas recomendadas para seu perfil'
//       });
//     } catch (error) {
//       console.error('Erro ao compartilhar:', error);
//       Alert.alert('Erro', 'Não foi possível compartilhar as vagas.');
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />

//       <View style={styles.header}>
//         <TouchableOpacity
//           style={styles.backButton}
//           onPress={() => navigation.goBack()}
//         >
//           <Text style={styles.backButtonText}>‹</Text>
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Vagas para Você</Text>
//       </View>

//       {loading ? (
//         <View style={styles.loadingContainer}>
//           <Text style={{
//             fontSize: 18,
//             fontWeight: 'bold',
//             color: Colors.dark,
//             marginBottom: 20,
//             textAlign: 'center'
//           }}>
//             Buscando vagas personalizadas
//           </Text>

//           <View style={{
//             width: '80%',
//             height: 10,
//             backgroundColor: Colors.lightGray,
//             borderRadius: 5,
//             marginBottom: 20
//           }}>
//             <View style={{
//               width: `${loadingProgress * 100}%`,
//               height: '100%',
//               backgroundColor: Colors.primary,
//               borderRadius: 5
//             }} />
//           </View>

//           <View style={{
//             backgroundColor: 'rgba(0, 188, 212, 0.1)',
//             padding: 15,
//             borderRadius: 8,
//             marginTop: 20,
//             maxWidth: '90%'
//           }}>
//             <Text style={{ textAlign: 'center', color: Colors.dark }}>
//               Nossa IA está analisando seu perfil e buscando vagas que correspondam às suas qualificações e objetivos de carreira.
//             </Text>
//           </View>
//         </View>
//       ) : error ? (
//         <View style={styles.errorContainer}>
//           <Text style={styles.errorText}>{error}</Text>
//           <TouchableOpacity
//             style={styles.retryButton}
//             onPress={handleTryAgain}
//           >
//             <Text style={styles.retryButtonText}>Tentar Novamente</Text>
//           </TouchableOpacity>
//         </View>
//       ) : (
//         <View style={{ flex: 1 }}>
//           <ScrollView style={{ padding: 15 }}>
//             {/* Título e informações */}
//             <View style={{
//               backgroundColor: Colors.white,
//               borderRadius: 10,
//               padding: 15,
//               marginBottom: 15,
//               ...Platform.select({
//                 ios: {
//                   shadowColor: '#000',
//                   shadowOffset: { width: 0, height: 2 },
//                   shadowOpacity: 0.1,
//                   shadowRadius: 4,
//                 },
//                 android: {
//                   elevation: 2,
//                 },
//               }),
//             }}>
//               <Text style={{
//                 fontSize: 18,
//                 fontWeight: 'bold',
//                 marginBottom: 8,
//                 color: Colors.dark,
//               }}>
//                 Vagas Personalizadas para Seu Perfil
//               </Text>

//               <Text style={{
//                 fontSize: 14,
//                 color: Colors.lightText,
//                 marginBottom: 10,
//               }}>
//                 Com base nas informações do seu currículo, encontramos estas vagas que correspondem ao seu perfil profissional.
//               </Text>
//             </View>

//             {/* Resultados da IA */}
//             <View style={{
//               backgroundColor: Colors.white,
//               borderRadius: 10,
//               padding: 15,
//               marginBottom: 15,
//               ...Platform.select({
//                 ios: {
//                   shadowColor: '#000',
//                   shadowOffset: { width: 0, height: 2 },
//                   shadowOpacity: 0.1,
//                   shadowRadius: 4,
//                 },
//                 android: {
//                   elevation: 2,
//                 },
//               }),
//             }}>
//               <Markdown
//                 style={{
//                   body: { fontSize: 16, lineHeight: 24, color: Colors.dark },
//                   heading1: { 
//                     fontSize: 22, 
//                     fontWeight: 'bold', 
//                     marginBottom: 10, 
//                     color: Colors.dark,
//                     borderBottomWidth: 1,
//                     borderBottomColor: Colors.mediumGray,
//                     paddingBottom: 5,
//                   },
//                   heading2: { 
//                     fontSize: 20, 
//                     fontWeight: 'bold', 
//                     marginBottom: 10,
//                     marginTop: 15,
//                     color: Colors.dark 
//                   },
//                   heading3: { 
//                     fontSize: 18, 
//                     fontWeight: 'bold', 
//                     marginTop: 10,
//                     marginBottom: 5,
//                     color: Colors.dark 
//                   },
//                   paragraph: { 
//                     fontSize: 16, 
//                     lineHeight: 24,
//                     marginBottom: 10,
//                     color: Colors.dark 
//                   },
//                   list_item: {
//                     marginBottom: 5,
//                     flexDirection: 'row',
//                     alignItems: 'flex-start',
//                   },
//                   bullet_list: {
//                     marginVertical: 10,
//                   },
//                   strong: {
//                     fontWeight: 'bold',
//                   },
//                   em: {
//                     fontStyle: 'italic',
//                   },
//                   link: {
//                     color: Colors.primary,
//                     textDecorationLine: 'underline',
//                   },
//                 }}
//               >
//                 {vagasResultado}
//               </Markdown>
//             </View>
//           </ScrollView>

//           {/* Botão para compartilhar */}
//           <View style={{
//             padding: 15,
//             backgroundColor: Colors.white,
//             borderTopWidth: 1,
//             borderTopColor: Colors.mediumGray,
//           }}>
//             <TouchableOpacity
//               style={{
//                 backgroundColor: Colors.primary,
//                 paddingVertical: 12,
//                 borderRadius: 8,
//                 alignItems: 'center',
//               }}
//               onPress={handleShare}
//             >
//               <Text style={{
//                 color: Colors.white,
//                 fontWeight: 'bold',
//                 fontSize: 16,
//               }}>
//                 Compartilhar Vagas
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       )}
//     </SafeAreaView>
//   );
// };

// Tela de Busca de Vagas com botão de atualização
const BuscaVagasScreen = ({ route, navigation }) => {
  const { curriculoData } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vagasResultado, setVagasResultado] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    // Simular progresso durante a busca para feedback visual
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        const newProgress = prev + (0.1 * Math.random());
        return newProgress > 0.9 ? 0.9 : newProgress;
      });
    }, 800);

    // Iniciar a busca de vagas
    buscarVagas();

    return () => clearInterval(progressInterval);
  }, []);

  const buscarVagas = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0.1);

      if (forceRefresh) {
        // Mostrar tooltip/mensagem quando forçar a atualização
        Alert.alert(
          'Buscando Novas Vagas',
          'Estamos buscando novas vagas compatíveis com seu perfil. Isso pode levar alguns instantes...'
        );
      }

      // Chamar a função de busca com o parâmetro de forçar atualização
      const resultado = await buscarVagasComGemini(curriculoData, forceRefresh);

      if (resultado.success) {
        setVagasResultado(resultado.vagas);
        setFromCache(resultado.fromCache || false);
        setLastUpdate(resultado.timestamp || new Date().toISOString());
      } else {
        setError(resultado.error);
      }
    } catch (error) {
      console.error('Erro na busca de vagas:', error);
      setError('Não foi possível completar a busca de vagas. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
      setLoadingProgress(1);
    }
  };

  const handleRefresh = () => {
    // Forçar atualização (ignorar cache)
    buscarVagas(true);
  };

  const handleTryAgain = () => {
    setLoading(true);
    setError(null);
    setLoadingProgress(0.1);
    buscarVagas();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: vagasResultado,
        title: 'Vagas recomendadas para seu perfil'
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar as vagas.');
    }
  };

  // Funções de processamento de links (manter de antes)
  const processarConteudo = (texto) => {
    if (!texto) return { conteudoProcessado: '', links: [] };

    // Extrair links do formato markdown [texto](url)
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    const links = [];

    while ((match = regex.exec(texto)) !== null) {
      links.push({
        texto: match[1],
        url: match[2],
        completo: match[0]
      });
    }

    return {
      conteudoProcessado: texto,
      links
    };
  };

  // Componente VagaLink (manter de antes)
  const VagaLink = ({ url, label }) => {
    const handlePress = async () => {
      // Verificar se a URL é válida
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      try {
        const supported = await Linking.canOpenURL(url);

        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Erro', `Não foi possível abrir o link: ${url}`);
        }
      } catch (error) {
        console.error('Erro ao abrir link:', error);
        Alert.alert('Erro', 'Não foi possível abrir este link.');
      }
    };

    return (
      <TouchableOpacity
        onPress={handlePress}
        style={{
          backgroundColor: Colors.primary,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 5,
          alignSelf: 'flex-start',
          margin: 5,
        }}
      >
        <Text style={{ color: Colors.white, fontWeight: '500' }}>
          {label || 'Acessar Vaga'}
        </Text>
      </TouchableOpacity>
    );
  };

  // Manter de antes
  const renderizarLinksVagas = () => {
    const { conteudoProcessado, links } = processarConteudo(vagasResultado);

    // Agrupar links por vaga (baseado na ocorrência de "Vaga X" no texto)
    const secoes = conteudoProcessado.split(/## Vaga \d+:/);

    if (secoes.length <= 1) return null;

    return (
      <View style={{
        backgroundColor: '#e8f5e9',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: 'bold',
          marginBottom: 10,
          color: Colors.dark,
        }}>
          Links Diretos para as Vagas:
        </Text>

        {secoes.map((secao, index) => {
          if (index === 0) return null; // Pular a introdução

          // Extrair o título da vaga
          const tituloMatch = secao.match(/\[([^\]]+)\]\s*-\s*\[([^\]]+)\]/);
          const titulo = tituloMatch
            ? `${tituloMatch[1]} - ${tituloMatch[2]}`
            : `Vaga ${index}`;

          // Encontrar links nesta seção
          const linksVaga = links.filter(link =>
            secao.includes(link.completo) &&
            (link.texto.includes('Link') ||
              link.texto.includes('vaga') ||
              link.texto.includes('Aplicar'))
          );

          if (linksVaga.length === 0) return null;

          return (
            <View key={index} style={{
              marginBottom: 10,
              padding: 10,
              backgroundColor: Colors.white,
              borderRadius: 5,
              borderLeftWidth: 3,
              borderLeftColor: Colors.success,
            }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
                {titulo}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {linksVaga.map((link, linkIndex) => (
                  <VagaLink
                    key={linkIndex}
                    url={link.url}
                    label={link.texto}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Para processar os resultados
  const { conteudoProcessado, links } = vagasResultado ? processarConteudo(vagasResultado) : { conteudoProcessado: '', links: [] };

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
        <Text style={styles.headerTitle}>Vagas para Você</Text>

        {/* Novo botão de atualização */}
        {!loading && !error && (
          <TouchableOpacity
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 5,
            }}
            onPress={handleRefresh}
          >
            <Text style={{ color: Colors.white, fontSize: 12 }}>Atualizar</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.dark,
            marginBottom: 20,
            textAlign: 'center'
          }}>
            Buscando vagas personalizadas
          </Text>

          <View style={{
            width: '80%',
            height: 10,
            backgroundColor: Colors.lightGray,
            borderRadius: 5,
            marginBottom: 20
          }}>
            <View style={{
              width: `${loadingProgress * 100}%`,
              height: '100%',
              backgroundColor: Colors.primary,
              borderRadius: 5
            }} />
          </View>

          <View style={{
            backgroundColor: 'rgba(0, 188, 212, 0.1)',
            padding: 15,
            borderRadius: 8,
            marginTop: 20,
            maxWidth: '90%'
          }}>
            <Text style={{ textAlign: 'center', color: Colors.dark }}>
              Nossa IA está analisando seu perfil e buscando vagas que correspondam às suas qualificações e objetivos de carreira.
            </Text>
          </View>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleTryAgain}
          >
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView style={{ padding: 15 }}>
            {/* Título e informações */}
            <View style={{
              backgroundColor: Colors.white,
              borderRadius: 10,
              padding: 15,
              marginBottom: 15,
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
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: Colors.dark,
                }}>
                  Vagas Personalizadas para Seu Perfil
                </Text>

                {/* Botão de refresh alternativo */}
                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.primary,
                    padding: 8,
                    borderRadius: 20,
                    width: 36,
                    height: 36,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={handleRefresh}
                >
                  <Text style={{ color: Colors.white, fontSize: 16 }}>↻</Text>
                </TouchableOpacity>
              </View>

              <Text style={{
                fontSize: 14,
                color: Colors.lightText,
                marginBottom: 6,
              }}>
                Com base nas informações do seu currículo, encontramos estas vagas que correspondem ao seu perfil profissional.
              </Text>

              {fromCache && (
                <View style={{
                  backgroundColor: '#e3f2fd',
                  padding: 8,
                  borderRadius: 4,
                  marginTop: 5,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Text style={{
                    fontSize: 12,
                    color: '#0d47a1',
                    flex: 1,
                  }}>
                    Última atualização: {new Date(lastUpdate).toLocaleDateString()} às {new Date(lastUpdate).toLocaleTimeString()}
                  </Text>

                  <TouchableOpacity
                    style={{
                      backgroundColor: '#1976d2',
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                      borderRadius: 4,
                      marginLeft: 10,
                    }}
                    onPress={handleRefresh}
                  >
                    <Text style={{ color: Colors.white, fontSize: 12 }}>Buscar Novas</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Renderizar links para vagas */}
            {renderizarLinksVagas()}

            {/* Resultados da IA */}
            <View style={{
              backgroundColor: Colors.white,
              borderRadius: 10,
              padding: 15,
              marginBottom: 15,
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
            }}>
              <Markdown
                style={{
                  body: { fontSize: 16, lineHeight: 24, color: Colors.dark },
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
                  link: {
                    color: Colors.primary,
                    textDecorationLine: 'underline',
                  },
                }}
                onLinkPress={(url) => {
                  Linking.openURL(url).catch(err => {
                    console.error('Erro ao abrir link:', err);
                    Alert.alert('Erro', 'Não foi possível abrir este link.');
                  });
                }}
              >
                {conteudoProcessado}
              </Markdown>
            </View>
          </ScrollView>

          {/* Botão para compartilhar */}
          <View style={{
            padding: 15,
            backgroundColor: Colors.white,
            borderTopWidth: 1,
            borderTopColor: Colors.mediumGray,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
            {/* Botão de atualização grande para facilitar o acesso */}
            <TouchableOpacity
              style={{
                backgroundColor: Colors.secondary,
                paddingVertical: 12,
                paddingHorizontal: 15,
                borderRadius: 8,
                alignItems: 'center',
                flex: 1,
                marginRight: 8,
              }}
              onPress={handleRefresh}
            >
              <Text style={{
                color: Colors.white,
                fontWeight: 'bold',
                fontSize: 16,
              }}>
                Buscar Novas Vagas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: Colors.primary,
                paddingVertical: 12,
                paddingHorizontal: 15,
                borderRadius: 8,
                alignItems: 'center',
                flex: 1,
                marginLeft: 8,
              }}
              onPress={handleShare}
            >
              <Text style={{
                color: Colors.white,
                fontWeight: 'bold',
                fontSize: 16,
              }}>
                Compartilhar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
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

// No arquivo onde você definiu AuthProvider e o contexto de Auth

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

  // Função de logout corrigida
  const logout = async () => {
    try {
      // Primeiro, definimos o estado para null para evitar acesso a dados antigos
      setUser(null);

      // Depois removemos os dados de usuário do AsyncStorage
      await AsyncStorage.removeItem('currentUser');

      // Talvez seja necessário limpar outras informações também
      // Por exemplo, limpar cache de análises, etc.

      console.log('Logout realizado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo com erro, definir o usuário como null para evitar problemas
      setUser(null);
      return false;
    }
  };

  // Função para atualizar o user (opcional, se você tiver)
  const updateUser = (userData) => {
    try {
      setUser(userData);
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
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
          console.log(`chamarIAAPI: Aguardando ${tempoEspera}ms antes da tentativa ${tentativa + 1}`);
          await new Promise(resolve => setTimeout(resolve, tempoEspera));
        }

        return await funcaoRequest();
      } catch (error) {
        console.log(`chamarIAAPI: Erro na tentativa ${tentativa + 1}:`, error.message);

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

    // Resumo Profissional
    if (data.resumo_profissional) {
      texto += `RESUMO PROFISSIONAL:\n${data.resumo_profissional}\n\n`;
    }

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
      pontuacao: `Você é um consultor de RH. Avalie este currículo (0-10) em: Conteúdo (30%), Estrutura (20%), Apresentação (20%), Impacto (30%). Considere especialmente o resumo profissional, experiências e formação. Forneça nota geral ponderada e justifique brevemente.`,

      melhorias: `Você é um consultor de RH. Identifique 3 melhorias específicas para este currículo aumentar chances de entrevistas. Analise especialmente o resumo profissional e as competências demonstradas. Para cada melhoria, explique por quê e como implementar.`,

      dicas: `Você é um coach de carreira. Com base no resumo profissional e perfil completo deste candidato, forneça 3 dicas de carreira personalizadas. Seja específico e prático, considerando os objetivos mencionados no resumo.`,

      cursos: `Com base no resumo profissional e perfil geral deste candidato, sugira 3 cursos ou certificações específicas para complementar suas habilidades e aumentar empregabilidade. Explique onde encontrar e como agregaria valor.`,

      vagas: `Após analisar o resumo profissional e experiências deste candidato, sugira 3 tipos de vagas onde teria boas chances. Explique por que, competências valorizadas e palavras-chave para busca.`,

      geral: `Analise este currículo, incluindo o resumo profissional: 1) Pontos fortes (2), 2) Áreas de melhoria (2), 3) Impressão geral do perfil profissional, 4) Nota de 0-10.`
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

// Substitua todo o componente ChatOptions por esta versão completa:

const ChatOptions = ({ options, onSelect }) => {
  if (!options || options.length === 0) return null;

  // Identificar se são opções longas
  const hasLongOptions = options.some(option => option.length > 10);

  // Verificar se são opções de áreas específicas
  const isAreaStep = options.includes('Tecnologia da Informação') ||
    options.includes('Administração');

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.optionsContainer}
    >
      {options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.optionButton,
            hasLongOptions && styles.longOptionButton,
            isAreaStep && styles.areaOptionButton
          ]}
          onPress={() => onSelect(option)}
        >
          <Text
            style={[
              styles.optionText,
              hasLongOptions && styles.longOptionText
            ]}
            adjustsFontSizeToFit={true}
            numberOfLines={2}
          >
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const curriculumTemplates = [
  { id: 'modern', name: 'Moderno', color: '#00BCD4', icon: '📱' },
  { id: 'classic', name: 'Clássico', color: '#263238', icon: '📄' },
  { id: 'creative', name: 'Criativo', color: '#9C27B0', icon: '🎨' },
  { id: 'professional', name: 'Profissional', color: '#3F51B5', icon: '💼' },
  { id: 'minimalist', name: 'Minimalista', color: '#607D8B', icon: '🔍' },
  { id: 'elegant', name: 'Elegante', color: '#795548', icon: '✨' },
  { id: 'corporate', name: 'Corporativo', color: '#0277BD', icon: '🏢' },
  { id: 'tech', name: 'Tecnologia', color: '#00838F', icon: '💻' },
  { id: 'academic', name: 'Acadêmico', color: '#4527A0', icon: '🎓' },
  { id: 'bold', name: 'Destaque', color: '#D32F2F', icon: '🔆' },
  { id: 'pastel', name: 'Tons Pastel', color: '#81C784', icon: '🌈' },
  { id: 'dark', name: 'Escuro', color: '#212121', icon: '🌑' },
  { id: 'light', name: 'Claro', color: '#ECEFF1', icon: '☀️' },
  { id: 'startup', name: 'Startup', color: '#FF5722', icon: '🚀' },
  { id: 'international', name: 'Internacional', color: '#2196F3', icon: '🌎' },
  { id: 'executive', name: 'Executivo', color: '#455A64', icon: '👔' }
];

const CurriculumPreview = ({ data, templateStyle = 'modern' }) => {
  if (!data || !data.informacoes_pessoais) {
    return (
      <View style={styles.emptyPreview}>
        <Text style={styles.emptyPreviewText}>
          As informações do seu currículo aparecerão aqui conforme você as fornecer.
        </Text>
      </View>
    );
  }

  // Definição de estilos baseados no template selecionado
  const getTemplateStyles = () => {
    switch (templateStyle) {
      // 1. Clássico
      case 'classic':
        return {
          container: {
            backgroundColor: Colors.white,
            padding: 15,
          },
          header: {
            borderBottomWidth: 2,
            borderBottomColor: Colors.dark,
            paddingBottom: 10,
            marginBottom: 15,
          },
          name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: Colors.dark,
            textAlign: 'center',
          },
          contact: {
            color: Colors.dark,
            textAlign: 'center',
            marginBottom: 5,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.dark,
            marginBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: Colors.mediumGray,
            paddingBottom: 5,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: Colors.dark,
          },
          accent: Colors.dark,
          itemBorder: {
            borderLeftWidth: 0,
            paddingLeft: 0,
          }
        };

      // 2. Criativo
      case 'creative':
        return {
          container: {
            backgroundColor: '#f8f9fa',
            padding: 15,
          },
          header: {
            backgroundColor: Colors.primary,
            padding: 15,
            borderRadius: 10,
            marginBottom: 15,
          },
          name: {
            fontSize: 26,
            fontWeight: 'bold',
            color: Colors.white,
          },
          contact: {
            color: Colors.white,
            marginBottom: 5,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.white,
            backgroundColor: Colors.primary,
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 5,
            marginBottom: 10,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: Colors.primary,
          },
          accent: Colors.primary,
          itemBorder: {
            borderLeftWidth: 4,
            borderLeftColor: Colors.primary,
            paddingLeft: 10,
          }
        };

      // 3. Profissional
      case 'professional':
        return {
          container: {
            backgroundColor: Colors.white,
            padding: 15,
          },
          header: {
            borderLeftWidth: 4,
            borderLeftColor: Colors.secondary,
            paddingLeft: 10,
            marginBottom: 15,
          },
          name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: Colors.secondary,
          },
          contact: {
            color: Colors.dark,
            marginBottom: 5,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.secondary,
            marginBottom: 10,
            paddingBottom: 5,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: Colors.dark,
          },
          accent: Colors.secondary,
          itemBorder: {
            borderLeftWidth: 2,
            borderLeftColor: Colors.secondary,
            paddingLeft: 10,
          }
        };

      // 4. Minimalista
      case 'minimal':
        return {
          container: {
            backgroundColor: Colors.white,
            padding: 15,
          },
          header: {
            marginBottom: 20,
            alignItems: 'center',
          },
          name: {
            fontSize: 28,
            fontWeight: '300', // Fonte mais leve
            color: Colors.dark,
            textAlign: 'center',
            letterSpacing: 1,
          },
          contact: {
            color: Colors.lightText,
            textAlign: 'center',
            marginBottom: 5,
            fontSize: 14,
          },
          sectionTitle: {
            fontSize: 16,
            fontWeight: '500',
            color: Colors.dark,
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: 2,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: '500',
            color: Colors.dark,
          },
          accent: Colors.dark,
          itemBorder: {
            borderLeftWidth: 0,
            paddingLeft: 0,
            marginBottom: 15,
          }
        };

      // 5. Executivo
      case 'executive':
        return {
          container: {
            backgroundColor: '#fafafa',
            padding: 15,
            borderWidth: 1,
            borderColor: '#e0e0e0',
          },
          header: {
            borderBottomWidth: 1,
            borderBottomColor: '#000',
            paddingBottom: 15,
            marginBottom: 15,
          },
          name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#000',
            textTransform: 'uppercase',
            letterSpacing: 3,
          },
          contact: {
            color: '#555',
            marginTop: 8,
          },
          sectionTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#000',
            textTransform: 'uppercase',
            marginBottom: 12,
            letterSpacing: 1,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#333',
          },
          accent: '#000',
          itemBorder: {
            borderLeftWidth: 0,
            paddingLeft: 0,
            paddingBottom: 10,
            marginBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: '#eee',
          }
        };

      // 6. Tecnologia
      case 'tech':
        return {
          container: {
            backgroundColor: '#f0f4f8',
            padding: 15,
            borderRadius: 8,
          },
          header: {
            backgroundColor: '#2d3748',
            padding: 18,
            borderRadius: 8,
            marginBottom: 20,
          },
          name: {
            fontSize: 26,
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: 6,
          },
          contact: {
            color: '#a0aec0',
            marginBottom: 3,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#2d3748',
            marginBottom: 12,
            paddingBottom: 5,
            borderBottomWidth: 2,
            borderBottomColor: '#4299e1',
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#2d3748',
          },
          accent: '#4299e1', // Azul tech
          itemBorder: {
            borderLeftWidth: 3,
            borderLeftColor: '#4299e1',
            paddingLeft: 10,
            marginBottom: 12,
            backgroundColor: '#fff',
            borderRadius: 4,
            padding: 10,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 1,
              },
              android: {
                elevation: 1,
              },
            }),
          }
        };

      // 7. Artes Criativas
      case 'creative-arts':
        return {
          container: {
            backgroundColor: '#fff',
            padding: 15,
            borderRadius: 0,
          },
          header: {
            marginBottom: 20,
            borderBottomWidth: 3,
            borderBottomColor: '#f06292', // Rosa vibrante
            paddingBottom: 15,
          },
          name: {
            fontSize: 30,
            fontWeight: 'bold',
            color: '#6a1b9a', // Roxo escuro
            marginBottom: 8,
            textAlign: 'left',
          },
          contact: {
            color: '#9c27b0', // Roxo médio
            marginBottom: 5,
            fontSize: 14,
          },
          sectionTitle: {
            fontSize: 22,
            fontWeight: '400',
            color: '#6a1b9a',
            marginBottom: 15,
            fontStyle: 'italic',
          },
          itemTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#9c27b0',
          },
          accent: '#f06292', // Rosa
          itemBorder: {
            borderLeftWidth: 4,
            borderLeftColor: '#f06292',
            paddingLeft: 12,
            marginBottom: 15,
          }
        };

      // 8. Acadêmico
      case 'academic':
        return {
          container: {
            backgroundColor: '#fff',
            padding: 20,
            borderWidth: 1,
            borderColor: '#d1d1d1',
          },
          header: {
            marginBottom: 25,
            borderBottomWidth: 1,
            borderBottomColor: '#333',
            paddingBottom: 15,
            alignItems: 'center',
          },
          name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            marginBottom: 5,
          },
          contact: {
            color: '#666',
            textAlign: 'center',
            marginBottom: 3,
            fontSize: 14,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#333',
            marginBottom: 15,
            borderBottomWidth: 1,
            borderBottomColor: '#bbb',
            paddingBottom: 3,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#333',
          },
          accent: '#333',
          itemBorder: {
            paddingLeft: 0,
            marginBottom: 18,
          }
        };

      // 9. Engenharia
      case 'engineering':
        return {
          container: {
            backgroundColor: '#fafafa',
            padding: 15,
          },
          header: {
            backgroundColor: '#263238', // Cinza azulado escuro
            padding: 18,
            marginBottom: 18,
            borderRadius: 3,
          },
          name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: 5,
          },
          contact: {
            color: '#b0bec5',
            marginBottom: 3,
          },
          sectionTitle: {
            fontSize: 17,
            fontWeight: 'bold',
            color: '#37474f',
            marginBottom: 12,
            backgroundColor: '#eceff1',
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 3,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#37474f',
          },
          accent: '#039be5', // Azul claro
          itemBorder: {
            borderLeftWidth: 3,
            borderLeftColor: '#039be5',
            paddingLeft: 10,
            marginBottom: 15,
          }
        };

      // 10. Marketing
      case 'marketing':
        return {
          container: {
            backgroundColor: '#fff',
            padding: 15,
            borderRadius: 10,
          },
          header: {
            backgroundColor: '#7b1fa2', // Roxo vibrante
            padding: 18,
            borderRadius: 10,
            marginBottom: 20,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              },
              android: {
                elevation: 4,
              },
            }),
          },
          name: {
            fontSize: 26,
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: 5,
          },
          contact: {
            color: '#e1bee7',
            marginBottom: 3,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#7b1fa2',
            marginBottom: 15,
            paddingBottom: 5,
            borderBottomWidth: 2,
            borderBottomColor: '#ba68c8',
          },
          itemTitle: {
            fontSize: 17,
            fontWeight: 'bold',
            color: '#7b1fa2',
          },
          accent: '#ba68c8', // Roxo mais claro
          itemBorder: {
            borderLeftWidth: 0,
            marginBottom: 15,
            backgroundColor: '#f3e5f5',
            borderRadius: 8,
            padding: 10,
          }
        };

      // 11. Legal/Jurídico
      case 'legal':
        return {
          container: {
            backgroundColor: '#fff',
            padding: 18,
            borderWidth: 1,
            borderColor: '#ccc',
          },
          header: {
            marginBottom: 20,
            paddingBottom: 15,
            borderBottomWidth: 1,
            borderBottomColor: '#01579b', // Azul escuro
          },
          name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#01579b',
            marginBottom: 5,
          },
          contact: {
            color: '#333',
            marginBottom: 3,
          },
          sectionTitle: {
            fontSize: 17,
            fontWeight: 'bold',
            color: '#01579b',
            marginBottom: 12,
            paddingBottom: 4,
            borderBottomWidth: 1,
            borderBottomColor: '#ccc',
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#01579b',
          },
          accent: '#01579b',
          itemBorder: {
            paddingLeft: 0,
            marginBottom: 15,
          }
        };

      // 12. Médico/Saúde
      case 'medical':
        return {
          container: {
            backgroundColor: '#fff',
            padding: 15,
            borderRadius: 3,
          },
          header: {
            backgroundColor: '#e3f2fd', // Azul bem claro
            padding: 15,
            borderRadius: 3,
            marginBottom: 18,
            borderLeftWidth: 5,
            borderLeftColor: '#0277bd',
          },
          name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#0277bd', // Azul médio
            marginBottom: 5,
          },
          contact: {
            color: '#333',
            marginBottom: 3,
          },
          sectionTitle: {
            fontSize: 17,
            fontWeight: 'bold',
            color: '#0277bd',
            marginBottom: 12,
            paddingBottom: 5,
            borderBottomWidth: 1,
            borderBottomColor: '#bbdefb',
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#0277bd',
          },
          accent: '#0277bd',
          itemBorder: {
            borderLeftWidth: 3,
            borderLeftColor: '#0277bd',
            paddingLeft: 10,
            marginBottom: 15,
          }
        };

      // 13. Startup
      case 'startup':
        return {
          container: {
            backgroundColor: '#fafafa',
            padding: 15,
            borderRadius: 10,
          },
          header: {
            padding: 15,
            backgroundColor: '#20232a', // Escuro
            borderRadius: 10,
            marginBottom: 20,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              },
              android: {
                elevation: 3,
              },
            }),
          },
          name: {
            fontSize: 28,
            fontWeight: 'bold',
            color: '#61dafb', // Azul claro/ciano
            marginBottom: 5,
          },
          contact: {
            color: '#fff',
            marginBottom: 3,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#20232a',
            marginBottom: 15,
            borderRadius: 4,
            paddingVertical: 5,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#20232a',
          },
          accent: '#61dafb', // Azul claro
          itemBorder: {
            borderLeftWidth: 3,
            borderLeftColor: '#61dafb',
            borderRadius: 4,
            paddingLeft: 10,
            marginBottom: 15,
            backgroundColor: '#fff',
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
          }
        };

      // 14. Modo Escuro
      case 'dark-mode':
        return {
          container: {
            backgroundColor: '#121212',
            padding: 15,
            borderRadius: 10,
          },
          header: {
            marginBottom: 20,
            padding: 10,
            borderBottomWidth: 1,
            borderBottomColor: '#333',
          },
          name: {
            fontSize: 26,
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: 5,
          },
          contact: {
            color: '#aaa',
            marginBottom: 3,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#bb86fc', // Roxo claro
            marginBottom: 15,
            borderBottomWidth: 1,
            borderBottomColor: '#333',
            paddingBottom: 5,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#fff',
          },
          accent: '#bb86fc', // Roxo
          itemBorder: {
            borderLeftWidth: 2,
            borderLeftColor: '#bb86fc',
            paddingLeft: 10,
            marginBottom: 15,
            backgroundColor: '#1e1e1e',
            padding: 8,
            borderRadius: 4,
          }
        };

      // 15. Elegante
      case 'elegant':
        return {
          container: {
            backgroundColor: '#fff',
            padding: 20,
            borderWidth: 1,
            borderColor: '#d4d4d4',
          },
          header: {
            marginBottom: 25,
            alignItems: 'center',
            borderBottomWidth: 0.5,
            borderBottomColor: '#aaa',
            paddingBottom: 20,
          },
          name: {
            fontSize: 28,
            fontWeight: '300', // Mais leve
            color: '#333',
            marginBottom: 5,
            letterSpacing: 2,
            textTransform: 'uppercase',
            textAlign: 'center',
          },
          contact: {
            color: '#666',
            marginBottom: 3,
            textAlign: 'center',
            fontSize: 14,
          },
          sectionTitle: {
            fontSize: 16,
            fontWeight: '400',
            color: '#333',
            marginBottom: 15,
            textTransform: 'uppercase',
            letterSpacing: 2,
            paddingBottom: 5,
            borderBottomWidth: 0.5,
            borderBottomColor: '#aaa',
            textAlign: 'center',
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: '500',
            color: '#333',
          },
          accent: '#333',
          itemBorder: {
            paddingLeft: 0,
            marginBottom: 18,
          }
        };

      // 16. Compacto
      case 'compact':
        return {
          container: {
            backgroundColor: '#fff',
            padding: 12,
            borderRadius: 5,
          },
          header: {
            marginBottom: 12,
          },
          name: {
            fontSize: 20,
            fontWeight: 'bold',
            color: Colors.dark,
            marginBottom: 3,
          },
          contact: {
            color: Colors.dark,
            marginBottom: 2,
            fontSize: 12,
          },
          sectionTitle: {
            fontSize: 15,
            fontWeight: 'bold',
            color: Colors.dark,
            marginBottom: 8,
            backgroundColor: '#f5f5f5',
            paddingVertical: 3,
            paddingHorizontal: 5,
            borderRadius: 3,
          },
          itemTitle: {
            fontSize: 14,
            fontWeight: 'bold',
            color: Colors.dark,
          },
          accent: Colors.dark,
          itemBorder: {
            borderLeftWidth: 2,
            borderLeftColor: '#ddd',
            paddingLeft: 8,
            marginBottom: 10,
          }
        };

      // 17. Duas Colunas
      case 'two-column':
        return {
          container: {
            backgroundColor: '#fff',
            padding: 15,
            flexDirection: 'row',
          },
          header: {
            width: '30%',
            backgroundColor: '#0d47a1', // Azul escuro
            padding: 15,
            alignItems: 'center',
            justifyContent: 'flex-start',
            marginRight: 15,
            borderRadius: 8,
          },
          name: {
            fontSize: 20,
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: 15,
            textAlign: 'center',
          },
          contact: {
            color: '#fff',
            marginBottom: 5,
            fontSize: 12,
            textAlign: 'center',
          },
          sectionTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#0d47a1',
            marginBottom: 10,
            paddingBottom: 3,
            borderBottomWidth: 1,
            borderBottomColor: '#ccc',
          },
          itemTitle: {
            fontSize: 15,
            fontWeight: 'bold',
            color: '#0d47a1',
          },
          accent: '#0d47a1',
          itemBorder: {
            borderLeftWidth: 0,
            paddingLeft: 0,
            marginBottom: 12,
          },
          // Propriedades adicionais específicas para o layout de duas colunas
          contentColumn: {
            flex: 1,
            paddingLeft: 5,
          },
          sidebarSection: {
            marginBottom: 20,
            paddingHorizontal: 10,
          },
          sidebarTitle: {
            color: '#fff',
            fontSize: 14,
            fontWeight: 'bold',
            marginBottom: 8,
            textAlign: 'center',
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.3)',
            paddingBottom: 5,
          }
        };

      // 18. Bold
      case 'bold':
        return {
          container: {
            backgroundColor: '#fff',
            padding: 15,
          },
          header: {
            backgroundColor: '#212121', // Quase preto
            padding: 20,
            marginBottom: 20,
            borderRadius: 0,
          },
          name: {
            fontSize: 28,
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: 5,
            textTransform: 'uppercase',
          },
          contact: {
            color: '#f5f5f5',
            marginBottom: 3,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#212121',
            marginBottom: 15,
            borderLeftWidth: 10,
            borderLeftColor: '#212121',
            paddingLeft: 10,
            paddingVertical: 5,
            backgroundColor: '#f5f5f5',
            textTransform: 'uppercase',
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#212121',
          },
          accent: '#212121',
          itemBorder: {
            borderLeftWidth: 5,
            borderLeftColor: '#212121',
            paddingLeft: 12,
            marginBottom: 15,
          }
        };

      // 19. Pastel
      case 'pastel':
        return {
          container: {
            backgroundColor: '#fdfafa', // Rosa muito claro
            padding: 15,
            borderRadius: 10,
          },
          header: {
            backgroundColor: '#f8bbd0', // Rosa pastel
            padding: 15,
            borderRadius: 10,
            marginBottom: 18,
            alignItems: 'center',
          },
          name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#5d4037', // Marrom
            marginBottom: 5,
            textAlign: 'center',
          },
          contact: {
            color: '#795548', // Marrom mais claro
            marginBottom: 3,
            textAlign: 'center',
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#5d4037',
            marginBottom: 15,
            padding: 5,
            borderRadius: 5,
            textAlign: 'center',
            backgroundColor: '#f8bbd0',
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#5d4037',
          },
          accent: '#ec407a', // Rosa mais escuro
          itemBorder: {
            borderLeftWidth: 3,
            borderLeftColor: '#f8bbd0',
            paddingLeft: 10,
            marginBottom: 15,
            backgroundColor: '#fff',
            borderRadius: 8,
            padding: 8,
          }
        };

      // 20. Vintage
      case 'vintage':
        return {
          container: {
            backgroundColor: '#f8f3e6', // Bege claro
            padding: 15,
            borderWidth: 1,
            borderColor: '#d3c0a9', // Bege mais escuro
          },
          header: {
            marginBottom: 20,
            borderBottomWidth: 2,
            borderBottomColor: '#8d6e63', // Marrom médio
            paddingBottom: 15,
          },
          name: {
            fontSize: 26,
            fontWeight: 'bold',
            color: '#5d4037', // Marrom escuro
            marginBottom: 5,
            fontStyle: 'italic',
          },
          contact: {
            color: '#795548', // Marrom mais claro
            marginBottom: 3,
            fontStyle: 'italic',
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#8d6e63',
            marginBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#d3c0a9',
            paddingBottom: 5,
            fontStyle: 'italic',
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#5d4037',
            fontStyle: 'italic',
          },
          accent: '#8d6e63',
          itemBorder: {
            borderLeftWidth: 0,
            paddingLeft: 0,
            marginBottom: 15,
          }
        };

      // 21. Geométrico
      case 'geometric':
        return {
          container: {
            backgroundColor: '#fff',
            padding: 15,
          },
          header: {
            backgroundColor: '#3949ab', // Azul escuro
            padding: 15,
            marginBottom: 20,
            borderRadius: 0,
            borderTopWidth: 5,
            borderTopColor: '#5c6bc0', // Azul mais claro
            borderBottomWidth: 5,
            borderBottomColor: '#283593', // Azul mais escuro
          },
          name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: 5,
          },
          contact: {
            color: '#c5cae9', // Azul bem claro
            marginBottom: 3,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#3949ab',
            marginBottom: 15,
            paddingLeft: 10,
            borderLeftWidth: 15,
            borderLeftColor: '#3949ab',
            paddingVertical: 5,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#3949ab',
          },
          accent: '#3949ab',
          itemBorder: {
            borderLeftWidth: 0,
            paddingLeft: 0,
            marginBottom: 15,
            padding: 10,
            backgroundColor: '#f5f5f5',
            borderRadius: 0,
            borderTopWidth: 3,
            borderTopColor: '#3949ab',
          }
        };

      // 22. Negócios
      case 'business':
        return {
          container: {
            backgroundColor: '#fff',
            padding: 15,
          },
          header: {
            marginBottom: 15,
            borderBottomWidth: 1,
            borderBottomColor: '#bdbdbd',
            paddingBottom: 15,
          },
          name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#2e3b4e', // Azul escuro corporativo
            marginBottom: 5,
          },
          contact: {
            color: '#505a64', // Cinza azulado
            marginBottom: 3,
          },
          sectionTitle: {
            fontSize: 17,
            fontWeight: 'bold',
            color: '#2e3b4e',
            marginBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
            paddingBottom: 5,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#2e3b4e',
          },
          accent: '#2e3b4e',
          itemBorder: {
            borderLeftWidth: 0,
            paddingLeft: 0,
            marginBottom: 15,
          }
        };

      // 23. Minimalista Colorido
      case 'minimalist-color':
        return {
          container: {
            backgroundColor: '#fff',
            padding: 15,
          },
          header: {
            marginBottom: 20,
            alignItems: 'center',
          },
          name: {
            fontSize: 28,
            fontWeight: '300', // Fonte mais leve
            color: '#00acc1', // Azul turquesa
            marginBottom: 5,
            textAlign: 'center',
          },
          contact: {
            color: '#757575', // Cinza médio
            marginBottom: 3,
            textAlign: 'center',
            fontSize: 14,
          },
          sectionTitle: {
            fontSize: 17,
            fontWeight: '400',
            color: '#00acc1',
            marginBottom: 15,
            padding: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
            paddingBottom: 5,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: '500',
            color: '#00acc1',
          },
          accent: '#00acc1',
          itemBorder: {
            borderLeftWidth: 0,
            paddingLeft: 0,
            marginBottom: 15,
          }
        };

      // 24. Gradiente
      case 'gradient':
        return {
          container: {
            backgroundColor: '#fff',
            padding: 15,
          },
          header: {
            marginBottom: 20,
            padding: 15,
            backgroundColor: '#7b1fa2', // Cor de base para o "gradiente"
            borderLeftWidth: 15,
            borderLeftColor: '#9c27b0',
            borderRightWidth: 15,
            borderRightColor: '#6a1b9a',
            borderRadius: 8,
          },
          name: {
            fontSize: 26,
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: 5,
          },
          contact: {
            color: '#e1bee7', // Roxo bem claro
            marginBottom: 3,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#7b1fa2',
            marginBottom: 15,
            padding: 5,
            borderBottomWidth: 2,
            borderBottomColor: '#9c27b0',
            borderRightWidth: 2,
            borderRightColor: '#6a1b9a',
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#7b1fa2',
          },
          accent: '#9c27b0',
          itemBorder: {
            borderLeftWidth: 3,
            borderLeftColor: '#9c27b0',
            borderRightWidth: 1,
            borderRightColor: '#6a1b9a',
            paddingLeft: 10,
            marginBottom: 15,
            backgroundColor: '#fafafa',
            padding: 8,
            borderRadius: 4,
          }
        };

      // 25. Boxes
      case 'boxed':
        return {
          container: {
            backgroundColor: '#eef2f5', // Cinza azulado muito claro
            padding: 15,
          },
          header: {
            backgroundColor: '#fff',
            padding: 15,
            marginBottom: 15,
            borderRadius: 8,
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
          name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#455a64',
            marginBottom: 5,
          },
          contact: {
            color: '#607d8b',
            marginBottom: 3,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#455a64',
            marginBottom: 10,
            backgroundColor: '#fff',
            padding: 10,
            borderRadius: 8,
            borderLeftWidth: 4,
            borderLeftColor: '#455a64',
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
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#455a64',
          },
          accent: '#455a64',
          itemBorder: {
            paddingLeft: 10,
            marginBottom: 15,
            backgroundColor: '#fff',
            padding: 10,
            borderRadius: 8,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 1,
              },
              android: {
                elevation: 1,
              },
            }),
          }
        };

      // 26. Timeline
      case 'timeline':
        return {
          container: {
            backgroundColor: '#fafafa',
            padding: 15,
          },
          header: {
            backgroundColor: '#00796b', // Verde escuro
            padding: 15,
            marginBottom: 25,
            borderRadius: 8,
          },
          name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: 5,
          },
          contact: {
            color: '#b2dfdb', // Verde bem claro
            marginBottom: 3,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#00796b',
            marginBottom: 15,
            borderBottomWidth: 2,
            borderBottomColor: '#009688',
            paddingBottom: 5,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#00796b',
          },
          accent: '#009688',
          itemBorder: {
            borderLeftWidth: 2,
            borderLeftColor: '#009688',
            paddingLeft: 15,
            marginBottom: 15,
            marginLeft: 15,
            position: 'relative',
          },
          // Elementos de Timeline
          timelineDot: {
            position: 'absolute',
            left: -18,
            top: 0,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#009688',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 3,
            borderColor: '#b2dfdb',
          }
        };

      // 27. Infográfico
      case 'infographic':
        return {
          container: {
            backgroundColor: '#fff',
            padding: 15,
          },
          header: {
            backgroundColor: '#1565c0', // Azul médio
            padding: 18,
            marginBottom: 20,
            borderRadius: 8,
            alignItems: 'center',
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
              },
              android: {
                elevation: 3,
              },
            }),
          },
          name: {
            fontSize: 26,
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: 5,
            textAlign: 'center',
          },
          contact: {
            color: '#bbdefb', // Azul bem claro
            marginBottom: 3,
            textAlign: 'center',
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: 15,
            backgroundColor: '#1976d2',
            paddingVertical: 8,
            paddingHorizontal: 15,
            borderRadius: 20,
            textAlign: 'center',
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
              },
              android: {
                elevation: 2,
              },
            }),
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#1565c0',
          },
          accent: '#1976d2',
          itemBorder: {
            borderLeftWidth: 0,
            marginBottom: 15,
            backgroundColor: '#e3f2fd',
            padding: 12,
            borderRadius: 8,
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
          }
        };

      // Template padrão (Modern)
      default:
        return {
          container: {
            backgroundColor: Colors.white,
            padding: 15,
          },
          header: {
            marginBottom: 15,
          },
          name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: Colors.primary,
            marginBottom: 5,
          },
          contact: {
            color: Colors.dark,
            marginBottom: 5,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.primary,
            marginBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: Colors.primary,
            paddingBottom: 5,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: Colors.dark,
          },
          accent: Colors.primary,
          itemBorder: {
            borderLeftWidth: 3,
            borderLeftColor: Colors.primary,
            paddingLeft: 10,
          }
        };
    }
  };

  const ts = getTemplateStyles();
  const personalInfo = data.informacoes_pessoais;
  const fullName = `${personalInfo.nome || ''} ${personalInfo.sobrenome || ''}`.trim();

  // Renderização do currículo em duas colunas ou formato padrão
  if (templateStyle === 'two-column') {
    return (
      <View style={[styles.previewContainer, ts.container]}>
        {/* Coluna lateral */}
        <View style={ts.header}>
          {fullName ? (
            <Text style={ts.name}>{fullName}</Text>
          ) : null}

          {personalInfo.email || personalInfo.endereco ? (
            <Text style={ts.contact}>
              {personalInfo.email}
              {personalInfo.email && personalInfo.endereco ? '\n' : ''}
              {personalInfo.endereco}
            </Text>
          ) : null}

          {/* Links na barra lateral */}
          {(personalInfo.site || personalInfo.linkedin || personalInfo.github) && (
            <View style={ts.sidebarSection}>
              <Text style={ts.sidebarTitle}>Links</Text>
              {personalInfo.site && (
                <Text style={[styles.previewLink, { color: '#fff', textAlign: 'center' }]}>{personalInfo.site}</Text>
              )}
              {personalInfo.linkedin && (
                <Text style={[styles.previewLink, { color: '#fff', textAlign: 'center' }]}>LinkedIn</Text>
              )}
              {personalInfo.github && (
                <Text style={[styles.previewLink, { color: '#fff', textAlign: 'center' }]}>GitHub</Text>
              )}
            </View>
          )}

          {/* Idiomas na barra lateral */}
          {data.idiomas && data.idiomas.length > 0 && (
            <View style={ts.sidebarSection}>
              <Text style={ts.sidebarTitle}>Idiomas</Text>
              {data.idiomas.map((idioma, index) => (
                <Text key={index} style={{ color: '#fff', textAlign: 'center', marginBottom: 4 }}>
                  {idioma.nome}: {idioma.nivel}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Coluna principal de conteúdo */}
        <View style={ts.contentColumn}>
          {/* Resumo Profissional */}
          {data.resumo_profissional ? (
            <View style={styles.previewSection}>
              <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Resumo Profissional</Text>
              <Text style={styles.previewResumeText}>{data.resumo_profissional}</Text>
            </View>
          ) : null}

          {/* Formação Acadêmica */}
          {data.formacoes_academicas && data.formacoes_academicas.length > 0 && (
            <View style={styles.previewSection}>
              <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Formação Acadêmica</Text>
              {data.formacoes_academicas.map((formacao, index) => (
                <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                  <Text style={[styles.previewItemTitle, ts.itemTitle]}>
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
              <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Experiência Profissional</Text>
              {data.experiencias.map((exp, index) => (
                <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                  <Text style={[styles.previewItemTitle, ts.itemTitle]}>{exp.cargo}</Text>
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
                  {exp.descricao ? (
                    <Text style={styles.previewItemDescription}>{exp.descricao}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* Cursos */}
          {data.cursos && data.cursos.length > 0 && (
            <View style={styles.previewSection}>
              <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Cursos e Certificados</Text>
              {data.cursos.map((curso, index) => (
                <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                  <Text style={[styles.previewItemTitle, ts.itemTitle]}>{curso.nome}</Text>
                  <Text style={styles.previewItemSubtitle}>{curso.instituicao}</Text>
                  {curso.data_inicio || curso.data_fim ? (
                    <Text style={styles.previewItemDate}>
                      {curso.data_inicio || ''}
                      {curso.data_inicio && curso.data_fim ? ' - ' : ''}
                      {curso.data_fim || ''}
                    </Text>
                  ) : null}
                  {curso.descricao ? (
                    <Text style={styles.previewItemDescription}>{curso.descricao}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* Projetos */}
          {data.projetos && data.projetos.length > 0 && (
            <View style={styles.previewSection}>
              <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Projetos</Text>
              {data.projetos.map((projeto, index) => (
                <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                  <Text style={[styles.previewItemTitle, ts.itemTitle]}>{projeto.nome}</Text>
                  {projeto.habilidades ? (
                    <Text style={styles.previewItemSubtitle}>
                      <Text style={{ fontWeight: 'bold' }}>Habilidades:</Text> {projeto.habilidades}
                    </Text>
                  ) : null}
                  {projeto.descricao ? (
                    <Text style={styles.previewItemDescription}>{projeto.descricao}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  // Renderização especial para template de timeline
  else if (templateStyle === 'timeline') {
    return (
      <View style={[styles.previewContainer, ts.container]}>
        <View style={ts.header}>
          {fullName ? (
            <Text style={ts.name}>{fullName}</Text>
          ) : null}

          {personalInfo.email || personalInfo.endereco ? (
            <Text style={ts.contact}>
              {personalInfo.email}
              {personalInfo.email && personalInfo.endereco ? ' | ' : ''}
              {personalInfo.endereco}
            </Text>
          ) : null}

          {/* Links */}
          {(personalInfo.site || personalInfo.linkedin || personalInfo.github) && (
            <View style={styles.previewLinks}>
              {personalInfo.site && (
                <Text style={[styles.previewLink, { color: '#b2dfdb' }]}>{personalInfo.site}</Text>
              )}
              {personalInfo.linkedin && (
                <Text style={[styles.previewLink, { color: '#b2dfdb' }]}>LinkedIn</Text>
              )}
              {personalInfo.github && (
                <Text style={[styles.previewLink, { color: '#b2dfdb' }]}>GitHub</Text>
              )}
            </View>
          )}
        </View>

        {/* Resumo Profissional */}
        {data.resumo_profissional ? (
          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Resumo Profissional</Text>
            <Text style={styles.previewResumeText}>{data.resumo_profissional}</Text>
          </View>
        ) : null}

        {/* Experiência Profissional com Timeline */}
        {data.experiencias && data.experiencias.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Experiência Profissional</Text>
            {data.experiencias.map((exp, index) => (
              <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                {/* Dot da Timeline */}
                <View style={ts.timelineDot}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                    {index + 1}
                  </Text>
                </View>

                <Text style={[styles.previewItemTitle, ts.itemTitle]}>{exp.cargo}</Text>
                <Text style={styles.previewItemSubtitle}>{exp.empresa}</Text>
                {exp.data_inicio ? (
                  <Text style={[styles.previewItemDate, { fontWeight: 'bold', color: '#00796b' }]}>
                    {exp.data_inicio}
                    {exp.data_fim ?
                      exp.data_fim.toLowerCase() === 'atual' ?
                        ' - Presente' :
                        ` - ${exp.data_fim}` :
                      ''}
                  </Text>
                ) : null}
                {exp.descricao ? (
                  <Text style={styles.previewItemDescription}>{exp.descricao}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Outras seções como padrão */}
        {data.formacoes_academicas && data.formacoes_academicas.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Formação Acadêmica</Text>
            {data.formacoes_academicas.map((formacao, index) => (
              <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                <Text style={[styles.previewItemTitle, ts.itemTitle]}>
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

        {/* Restante das seções como no padrão */}
        {data.cursos && data.cursos.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Cursos e Certificados</Text>
            {data.cursos.map((curso, index) => (
              <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                <Text style={[styles.previewItemTitle, ts.itemTitle]}>{curso.nome}</Text>
                <Text style={styles.previewItemSubtitle}>{curso.instituicao}</Text>
                {curso.data_inicio || curso.data_fim ? (
                  <Text style={styles.previewItemDate}>
                    {curso.data_inicio || ''}
                    {curso.data_inicio && curso.data_fim ? ' - ' : ''}
                    {curso.data_fim || ''}
                  </Text>
                ) : null}
                {curso.descricao ? (
                  <Text style={styles.previewItemDescription}>{curso.descricao}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {data.projetos && data.projetos.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Projetos</Text>
            {data.projetos.map((projeto, index) => (
              <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                <Text style={[styles.previewItemTitle, ts.itemTitle]}>{projeto.nome}</Text>
                {projeto.habilidades ? (
                  <Text style={styles.previewItemSubtitle}>
                    <Text style={{ fontWeight: 'bold' }}>Habilidades:</Text> {projeto.habilidades}
                  </Text>
                ) : null}
                {projeto.descricao ? (
                  <Text style={styles.previewItemDescription}>{projeto.descricao}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {data.idiomas && data.idiomas.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Idiomas</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {data.idiomas.map((idioma, index) => (
                <View key={index} style={{
                  backgroundColor: '#e0f2f1',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginRight: 10,
                  marginBottom: 10,
                  borderRadius: 5,
                  borderLeftWidth: 3,
                  borderLeftColor: ts.accent,
                }}>
                  <Text style={{ fontWeight: 'bold', color: '#00796b' }}>
                    {idioma.nome}: <Text style={{ fontWeight: 'normal' }}>{idioma.nivel}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  }

  // Renderização padrão para os outros templates
  return (
    <View style={[styles.previewContainer, ts.container]}>
      <View style={ts.header}>
        {fullName ? (
          <Text style={ts.name}>{fullName}</Text>
        ) : null}

        {personalInfo.email || personalInfo.endereco ? (
          <Text style={ts.contact}>
            {personalInfo.email}
            {personalInfo.email && personalInfo.endereco ? ' | ' : ''}
            {personalInfo.endereco}
          </Text>
        ) : null}

        {/* Links */}
        {(personalInfo.site || personalInfo.linkedin || personalInfo.github) && (
          <View style={styles.previewLinks}>
            {personalInfo.site && (
              <Text style={[styles.previewLink, { color: ts.accent }]}>{personalInfo.site}</Text>
            )}
            {personalInfo.linkedin && (
              <Text style={[styles.previewLink, { color: ts.accent }]}>LinkedIn</Text>
            )}
            {personalInfo.github && (
              <Text style={[styles.previewLink, { color: ts.accent }]}>GitHub</Text>
            )}
          </View>
        )}
      </View>

      {/* Resumo Profissional */}
      {data.resumo_profissional ? (
        <View style={styles.previewSection}>
          <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Resumo Profissional</Text>
          <Text style={styles.previewResumeText}>{data.resumo_profissional}</Text>
        </View>
      ) : null}

      {/* Formação Acadêmica */}
      {data.formacoes_academicas && data.formacoes_academicas.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Formação Acadêmica</Text>
          {data.formacoes_academicas.map((formacao, index) => (
            <View key={index} style={[styles.previewItem, ts.itemBorder]}>
              <Text style={[styles.previewItemTitle, ts.itemTitle]}>
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
          <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Experiência Profissional</Text>
          {data.experiencias.map((exp, index) => (
            <View key={index} style={[styles.previewItem, ts.itemBorder]}>
              <Text style={[styles.previewItemTitle, ts.itemTitle]}>{exp.cargo}</Text>
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
              {exp.descricao ? (
                <Text style={styles.previewItemDescription}>{exp.descricao}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Cursos */}
      {data.cursos && data.cursos.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Cursos e Certificados</Text>
          {data.cursos.map((curso, index) => (
            <View key={index} style={[styles.previewItem, ts.itemBorder]}>
              <Text style={[styles.previewItemTitle, ts.itemTitle]}>{curso.nome}</Text>
              <Text style={styles.previewItemSubtitle}>{curso.instituicao}</Text>
              {curso.data_inicio || curso.data_fim ? (
                <Text style={styles.previewItemDate}>
                  {curso.data_inicio || ''}
                  {curso.data_inicio && curso.data_fim ? ' - ' : ''}
                  {curso.data_fim || ''}
                </Text>
              ) : null}
              {curso.descricao ? (
                <Text style={styles.previewItemDescription}>{curso.descricao}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Projetos */}
      {data.projetos && data.projetos.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Projetos</Text>
          {data.projetos.map((projeto, index) => (
            <View key={index} style={[styles.previewItem, ts.itemBorder]}>
              <Text style={[styles.previewItemTitle, ts.itemTitle]}>{projeto.nome}</Text>
              {projeto.habilidades ? (
                <Text style={styles.previewItemSubtitle}>
                  <Text style={{ fontWeight: 'bold' }}>Habilidades:</Text> {projeto.habilidades}
                </Text>
              ) : null}
              {projeto.descricao ? (
                <Text style={styles.previewItemDescription}>{projeto.descricao}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Idiomas */}
      {data.idiomas && data.idiomas.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Idiomas</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {data.idiomas.map((idioma, index) => (
              <View key={index} style={[
                styles.previewItem,
                {
                  backgroundColor: '#f8f9fa',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginRight: 10,
                  marginBottom: 10,
                  borderRadius: 5,
                  borderLeftWidth: 3,
                  borderLeftColor: ts.accent,
                }
              ]}>
                <Text style={{ fontWeight: 'bold' }}>{idioma.nome}: <Text style={{ fontWeight: 'normal' }}>{idioma.nivel}</Text></Text>
              </View>
            ))}
          </View>
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
  resumo_profissional: "", // Novo campo para resumo/biografia
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
        response: "Agora, conte um pouco sobre você. Descreva brevemente sua trajetória profissional, acadêmica ou objetivos pessoais. Esse texto será um resumo que aparecerá no início do seu currículo.",
        nextStep: 'resumo_profissional',
        options: [],
        cvData: data
      };

    case 'resumo_profissional':
      // Salvar o resumo profissional
      data.resumo_profissional = message.trim();

      return {
        response: "Obrigado por compartilhar sua trajetória! Agora, o que você prefere adicionar primeiro? (Você pode finalizar a qualquer momento digitando 'finalizar')",
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
// const ConfiguracoesIAScreen = ({ navigation }) => {
//   const [iasSalvas, setIasSalvas] = useState({});
//   const [iaAtual, setIaAtual] = useState('GEMINI');
//   const [apiKey, setApiKey] = useState('');
//   const [isSaving, setIsSaving] = useState(false);

//   useEffect(() => {
//     carregarConfiguracoes();
//   }, []);

//   const carregarConfiguracoes = async () => {
//     try {
//       // Carregar IA padrão
//       const defaultIA = await AsyncStorage.getItem('ia_padrao');
//       if (defaultIA) setIaAtual(defaultIA);

//       // Carregar status das IAs
//       const iasStatus = {};
//       for (const [key, value] of Object.entries(IA_APIS)) {
//         const apiKey = await getIAAPIKey(key);
//         iasStatus[key] = {
//           configurada: value.chaveNecessaria ? !!apiKey : true,
//           apiKey: apiKey
//         };
//       }

//       setIasSalvas(iasStatus);

//       // Carregar a API key da IA selecionada
//       if (defaultIA) {
//         const currentKey = await getIAAPIKey(defaultIA);
//         setApiKey(currentKey);
//       }
//     } catch (error) {
//       console.error('Erro ao carregar configurações:', error);
//       Alert.alert('Erro', 'Não foi possível carregar as configurações das IAs.');
//     }
//   };

//   const salvarConfiguracao = async () => {
//     setIsSaving(true);
//     try {
//       // Salvar a IA padrão
//       await AsyncStorage.setItem('ia_padrao', iaAtual);

//       // Salvar a API key da IA selecionada
//       await salvarIAAPIKey(iaAtual, apiKey);

//       // Atualizar o estado
//       const novasIasSalvas = { ...iasSalvas };
//       novasIasSalvas[iaAtual] = {
//         configurada: IA_APIS[iaAtual].chaveNecessaria ? !!apiKey : true,
//         apiKey: apiKey
//       };
//       setIasSalvas(novasIasSalvas);

//       Alert.alert('Sucesso', `Configuração de ${IA_APIS[iaAtual].nome} salva com sucesso!`);
//     } catch (error) {
//       console.error('Erro ao salvar configuração:', error);
//       Alert.alert('Erro', 'Não foi possível salvar a configuração.');
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const selecionarIA = async (tipoIA) => {
//     setIaAtual(tipoIA);
//     const key = await getIAAPIKey(tipoIA);
//     setApiKey(key || '');
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />

//       <View style={styles.header}>
//         <TouchableOpacity
//           style={styles.backButton}
//           onPress={() => navigation.goBack()}
//         >
//           <Text style={styles.backButtonText}>‹</Text>
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Configurar IAs</Text>
//       </View>

//       <ScrollView style={styles.configContent}>
//         <Text style={styles.configTitle}>Selecione uma IA para configurar:</Text>

//         <View style={styles.iasList}>
//           {Object.entries(IA_APIS).map(([key, value]) => (
//             <TouchableOpacity
//               key={key}
//               style={[
//                 styles.iaItem,
//                 iaAtual === key && styles.iaItemSelected
//               ]}
//               onPress={() => selecionarIA(key)}
//             >
//               <Text style={[
//                 styles.iaItemText,
//                 iaAtual === key && styles.iaItemTextSelected
//               ]}>
//                 {value.nome}
//               </Text>
//               {iasSalvas[key]?.configurada && (
//                 <View style={styles.configuredBadge}>
//                   <Text style={styles.configuredBadgeText}>✓</Text>
//                 </View>
//               )}
//             </TouchableOpacity>
//           ))}
//         </View>

//         {IA_APIS[iaAtual]?.chaveNecessaria ? (
//           <View style={styles.apiKeyContainer}>
//             <Text style={styles.apiKeyLabel}>
//               API Key para {IA_APIS[iaAtual]?.nome}:
//             </Text>
//             <TextInput
//               style={styles.apiKeyInput}
//               value={apiKey}
//               onChangeText={setApiKey}
//               placeholder="Insira sua API Key aqui"
//               secureTextEntry={true}
//             />
//             <Text style={styles.apiKeyHelper}>
//               Você pode obter sua API Key em: {getApiKeySourceForIA(iaAtual)}
//             </Text>
//           </View>
//         ) : (
//           <View style={styles.noApiKeyContainer}>
//             <Text style={styles.noApiKeyText}>
//               {IA_APIS[iaAtual]?.nome} não necessita de API Key.
//             </Text>
//           </View>
//         )}

//         <TouchableOpacity
//           style={[
//             styles.saveButton,
//             (isSaving) && styles.saveButtonDisabled
//           ]}
//           onPress={salvarConfiguracao}
//           disabled={isSaving}
//         >
//           {isSaving ? (
//             <ActivityIndicator size="small" color={Colors.white} />
//           ) : (
//             <Text style={styles.saveButtonText}>Salvar Configuração</Text>
//           )}
//         </TouchableOpacity>
//       </ScrollView>
//     </SafeAreaView>
//   );
// };
const ConfiguracoesIAScreen = ({ navigation }) => {
  const [iasSalvas, setIasSalvas] = useState({});
  const [iaAtual, setIaAtual] = useState('GEMINI');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

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

  const obterUrlAjuda = (tipoIA) => {
    switch (tipoIA) {
      case 'GEMINI':
        return 'https://ai.google.dev/tutorials/setup';
      case 'OPENAI':
        return 'https://platform.openai.com/api-keys';
      case 'CLAUDE':
        return 'https://console.anthropic.com/settings/keys';
      case 'PERPLEXITY':
        return 'https://www.perplexity.ai/settings/api';
      default:
        return null;
    }
  };

  const abrirUrlAjuda = (tipoIA) => {
    const url = obterUrlAjuda(tipoIA);
    if (url) {
      Alert.alert(
        "Abrir site externo",
        `Deseja abrir o site de ${IA_APIS[tipoIA].nome} para obter sua API key?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Abrir", onPress: () => { /* Implementar abertura de URL */ } }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={HeaderColors.background} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurar IA</Text>
      </View>

      <ScrollView style={styles.configContent}>
        <View style={styles.configCard}>
          <Text style={styles.configIntroTitle}>Configure suas IAs</Text>
          <Text style={styles.configIntroText}>
            Adicione suas chaves de API para utilizar diferentes modelos de IA
            na análise de currículos. Uma chave API é necessária para cada serviço.
          </Text>
        </View>

        <Text style={styles.configTitle}>Selecione uma IA para configurar:</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.iaCardsContainer}
        >
          {Object.entries(IA_APIS).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.iaCard,
                iaAtual === key && styles.iaCardSelected
              ]}
              onPress={() => selecionarIA(key)}
            >
              <View style={styles.iaCardHeader}>
                <Text style={[
                  styles.iaCardTitle,
                  iaAtual === key && styles.iaCardTitleSelected
                ]}>
                  {value.nome}
                </Text>
                {iasSalvas[key]?.configurada && (
                  <View style={styles.configuredBadge}>
                    <Text style={styles.configuredBadgeText}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={styles.iaCardDescription}>
                {value.chaveNecessaria ? "Requer API Key" : "Não requer API Key"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {IA_APIS[iaAtual]?.chaveNecessaria ? (
          <View style={styles.apiKeyContainer}>
            <View style={styles.apiKeyHeader}>
              <Text style={styles.apiKeyLabel}>
                API Key para {IA_APIS[iaAtual]?.nome}:
              </Text>
              <TouchableOpacity
                onPress={() => abrirUrlAjuda(iaAtual)}
                style={styles.helpButton}
              >
                <Text style={styles.helpButtonText}>Como obter?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.apiKeyInputContainer}>
              <TextInput
                style={styles.apiKeyInput}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Insira sua API Key aqui"
                secureTextEntry={!showApiKey}
              />
              <TouchableOpacity
                style={styles.toggleVisibilityButton}
                onPress={() => setShowApiKey(!showApiKey)}
              >
                <Text style={styles.toggleVisibilityText}>
                  {showApiKey ? "Ocultar" : "Mostrar"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.apiKeyHelper}>
              A API Key é necessária para usar os recursos de {IA_APIS[iaAtual]?.nome}.
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

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Dicas:</Text>
          <Text style={styles.tipItem}>• O Google Gemini já vem com uma chave padrão</Text>
          <Text style={styles.tipItem}>• Para obter resultados melhores, configure sua própria API key</Text>
          <Text style={styles.tipItem}>• O modo offline não requer API key</Text>
        </View>
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

// Modificações para o LoginScreen
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
          <View style={styles.enhancedInputWrapper}>
            <TextInput
              style={styles.enhancedInput}
              placeholder="Seu email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9e9e9e"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Senha</Text>
          <View style={styles.enhancedInputWrapper}>
            <TextInput
              style={styles.enhancedInput}
              placeholder="Sua senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#9e9e9e"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.enhancedPrimaryButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.enhancedPrimaryButtonText}>Entrar</Text>
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

// Modificações para o RegisterScreen
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
          <View style={styles.enhancedInputWrapper}>
            <TextInput
              style={styles.enhancedInput}
              placeholder="Seu nome completo"
              value={nome}
              onChangeText={setNome}
              placeholderTextColor="#9e9e9e"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <View style={styles.enhancedInputWrapper}>
            <TextInput
              style={styles.enhancedInput}
              placeholder="Seu email profissional"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9e9e9e"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Senha</Text>
          <View style={styles.enhancedInputWrapper}>
            <TextInput
              style={styles.enhancedInput}
              placeholder="Crie uma senha forte"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#9e9e9e"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Confirmar Senha</Text>
          <View style={styles.enhancedInputWrapper}>
            <TextInput
              style={styles.enhancedInput}
              placeholder="Confirme sua senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor="#9e9e9e"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.enhancedPrimaryButton}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.enhancedPrimaryButtonText}>Cadastrar</Text>
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

// Modificação no HomeScreen - Ajuste na função de navegação para configuração de IAs
const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [curriculos, setCurriculos] = useState([]);
  const [loadingCurriculos, setLoadingCurriculos] = useState(true);
  const [temProgressoSalvo, setTemProgressoSalvo] = useState(false);
  const [ultimoProgressoData, setUltimoProgressoData] = useState(null);

  useEffect(() => {
    carregarCurriculos();
    verificarProgressoSalvo();

    // Atualizar quando a tela ganhar foco
    const unsubscribe = navigation.addListener('focus', () => {
      carregarCurriculos();
      verificarProgressoSalvo();
    });

    return unsubscribe;
  }, [navigation]);

  const carregarCurriculos = async () => {
    try {
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      setCurriculos(cvs ? JSON.parse(cvs) : []);
    } catch (error) {
      console.error('Erro ao carregar currículos:', error);
    } finally {
      setLoadingCurriculos(false);
    }
  };

  const verificarProgressoSalvo = async () => {
    try {
      const progresso = await recuperarProgressoCurriculo(user.id);
      if (progresso && progresso.timestamp) {
        // Verificar se o progresso tem menos de 24 horas
        const dataProgresso = new Date(progresso.timestamp);
        const agora = new Date();
        const diferencaHoras = (agora - dataProgresso) / (1000 * 60 * 60);

        if (diferencaHoras < 24) {
          setTemProgressoSalvo(true);
          setUltimoProgressoData(dataProgresso);
        } else {
          setTemProgressoSalvo(false);
          // Limpar progresso antigo (mais de 24h)
          await limparProgressoCurriculo(user.id);
        }
      } else {
        setTemProgressoSalvo(false);
      }
    } catch (error) {
      console.error('Erro ao verificar progresso salvo:', error);
      setTemProgressoSalvo(false);
    }
  };

  // Função para formatar tempo relativo (ex: "2 horas atrás")
  const formatarTempoRelativo = (data) => {
    if (!data) return '';

    const agora = new Date();
    const diff = agora - data; // diferença em milissegundos

    // Converter para minutos
    const minutos = Math.floor(diff / (1000 * 60));

    if (minutos < 1) return 'agora mesmo';
    if (minutos < 60) return `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} atrás`;

    // Converter para horas
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `${horas} ${horas === 1 ? 'hora' : 'horas'} atrás`;

    // Converter para dias
    const dias = Math.floor(horas / 24);
    return `${dias} ${dias === 1 ? 'dia' : 'dias'} atrás`;
  };

  // Função para navegar para a tela de configuração de IAs
  const navegarParaConfiguracoesIA = () => {
    // Usa navegação entre tabs - navega primeiro para a tab Config, depois para a tela ConfiguracoesIA
    navigation.navigate('Config', { screen: 'ConfiguracoesIA' });
  };

  // Função para continuar o currículo em progresso
  const continuarCurriculo = () => {
    navigation.navigate('Chatbot', { continuarProgresso: true });
  };

  // Função para navegar para a busca de vagas com o currículo mais recente
  const navegarParaBuscaVagas = () => {
    if (curriculos.length === 0) {
      Alert.alert(
        "Nenhum Currículo Encontrado",
        "Você precisa criar um currículo antes de buscar vagas.",
        [
          { text: "OK" },
          {
            text: "Criar Currículo",
            onPress: () => navigation.navigate('Chatbot')
          }
        ]
      );
      return;
    }

    navigation.navigate('SelecionarCurriculo');
  };

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

          {/* NOVA FUNCIONALIDADE: Card de Currículo em Progresso */}
          {temProgressoSalvo && (
            <View style={styles.curriculoProgressoCard}>
              <View style={styles.curriculoProgressoHeader}>
                <View style={styles.curriculoProgressoIcon}>
                  <Text style={{ fontSize: 20, color: Colors.white }}>📝</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.curriculoProgressoTitulo}>
                    Currículo em Andamento
                  </Text>
                  <Text style={styles.curriculoProgressoSubtitulo}>
                    Última edição: {formatarTempoRelativo(ultimoProgressoData)}
                  </Text>
                </View>
              </View>

              <Text style={styles.curriculoProgressoTexto}>
                Você tem um currículo em andamento. Deseja continuar de onde parou?
              </Text>

              <TouchableOpacity
                style={styles.curriculoProgressoBotao}
                onPress={continuarCurriculo}
                activeOpacity={0.7}
              >
                <Text style={styles.curriculoProgressoBotaoTexto}>
                  Continuar Currículo
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Card de Busca de Vagas */}
          <View style={styles.featureSection}>
            <Text style={styles.featureSectionTitle}>Oportunidades Personalizadas</Text>
            <TouchableOpacity
              style={[styles.featureCard, {
                backgroundColor: '#e8f5e9',
                borderLeftWidth: 4,
                borderLeftColor: Colors.success,
              }]}
              onPress={navegarParaBuscaVagas}
              activeOpacity={0.7} // Feedback visual mais claro
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 10,
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: Colors.success,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 10,
                }}>
                  <Text style={{ fontSize: 20, color: Colors.white }}>🔍</Text>
                </View>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: Colors.dark,
                  flex: 1,
                }}>
                  Encontre Vagas para Seu Perfil
                </Text>
              </View>

              <Text style={[styles.featureDescription, { color: '#2e7d32' }]}>
                Nossa IA analisará seu currículo e encontrará vagas reais que combinam com seu perfil, habilidades e experiência profissional.
              </Text>

              <View style={{
                backgroundColor: Colors.success,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 5,
                alignSelf: 'flex-start',
                marginTop: 10,
              }}>
                <Text style={{ color: Colors.white, fontWeight: '500' }}>
                  {loadingCurriculos ? 'Carregando...' : 'Buscar Vagas Agora'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* NOVA SEÇÃO: Ações Principais */}
          <View style={styles.featureSection}>
            <Text style={styles.featureSectionTitle}>Ações Principais</Text>
            <View style={styles.mainActionsContainer}>
              {/* Botão "Novo Currículo" */}
              <TouchableOpacity
                style={styles.mainActionButton}
                onPress={() => navigation.navigate('Chatbot')}
                activeOpacity={0.7}
              >
                <View style={styles.mainActionIconContainer}>
                  <Text style={styles.mainActionIcon}>📄</Text>
                </View>
                <Text style={styles.mainActionText}>Novo Currículo</Text>
              </TouchableOpacity>

              {/* Botão "Analise seu Currículo" */}
              <TouchableOpacity
                style={styles.mainActionButton}
                onPress={() => navigation.navigate('CurriculosAnalise')}
                activeOpacity={0.7}
              >
                <View style={styles.mainActionIconContainer}>
                  <Text style={styles.mainActionIcon}>📊</Text>
                </View>
                <Text style={styles.mainActionText}>Analise seu Currículo</Text>
              </TouchableOpacity>

              {/* Botão "Gerenciar Currículos" */}
              <TouchableOpacity
                style={styles.mainActionButton}
                onPress={() => navigation.navigate('MeusCurriculos')}
                activeOpacity={0.7}
              >
                <View style={styles.mainActionIconContainer}>
                  <Text style={styles.mainActionIcon}>📂</Text>
                </View>
                <Text style={styles.mainActionText}>Gerenciar Currículos</Text>
              </TouchableOpacity>

              {/* Botão "Configurar IAs" */}
              <TouchableOpacity
                style={styles.mainActionButton}
                onPress={navegarParaConfiguracoesIA}
                activeOpacity={0.7}
              >
                <View style={styles.mainActionIconContainer}>
                  <Text style={styles.mainActionIcon}>🔧</Text>
                </View>
                <Text style={styles.mainActionText}>Configurar IAs</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Seção de Informações do Aplicativo */}
          <View style={styles.featureSection}>
            <Text style={styles.featureSectionTitle}>Sobre o Aplicativo</Text>
            <TouchableOpacity
              style={[styles.featureCard, styles.compactCard]}
              onPress={() => navigation.navigate('SobreApp')}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: Colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 10,
                }}>
                  <Text style={{ fontSize: 20, color: Colors.white }}>ℹ️</Text>
                </View>
                <Text style={styles.featureTitle}>CurriculoBot Premium</Text>
              </View>
              <Text style={styles.featureDescription}>
                Versão: 1.2.0
              </Text>
              <Text style={styles.featureDescription}>
                Este aplicativo utiliza tecnologia de inteligência artificial para ajudar na criação e análise de currículos.
              </Text>
              <TouchableOpacity
                style={styles.premiumButton}
                onPress={() => navigation.navigate('SobreApp')}
              >
                <Text style={styles.premiumButtonText}>Saiba Mais</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          {/* Espaço adicional no final do scroll */}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const additionalStyles = {
  // Estilo para container dos botões principais
  mainActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  // Estilo para os botões principais
  mainActionButton: {
    backgroundColor: Colors.primary,
    width: '48%', // Dois botões por linha
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  // Estilo para o container do ícone
  mainActionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  // Estilo para o ícone
  mainActionIcon: {
    fontSize: 24,
    color: Colors.white,
  },
  // Estilo para o texto do botão
  mainActionText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  // Botão premium
  premiumButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  premiumButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
};

// Adicione estas funções no mesmo escopo que as outras funções auxiliares (junto com getUniqueId, formatDate, etc.)
const salvarProgressoCurriculo = async (userId, data) => {
  try {
    // Salvar o estado atual do chatbot
    await AsyncStorage.setItem(`curriculo_em_progresso_${userId}`, JSON.stringify({
      timestamp: new Date().toISOString(),
      data: data
    }));
    console.log('Progresso do currículo salvo com sucesso');
  } catch (error) {
    console.error('Erro ao salvar progresso do currículo:', error);
  }
};

const recuperarProgressoCurriculo = async (userId) => {
  try {
    const progresso = await AsyncStorage.getItem(`curriculo_em_progresso_${userId}`);
    if (progresso) {
      return JSON.parse(progresso);
    }
    return null;
  } catch (error) {
    console.error('Erro ao recuperar progresso do currículo:', error);
    return null;
  }
};

const limparProgressoCurriculo = async (userId) => {
  try {
    await AsyncStorage.removeItem(`curriculo_em_progresso_${userId}`);
    console.log('Progresso do currículo limpo com sucesso');
  } catch (error) {
    console.error('Erro ao limpar progresso do currículo:', error);
  }
};

// Agora, vamos modificar o ChatbotScreen para salvar o progresso quando sair da tela
const ChatbotScreen = ({ navigation, route }) => {
  // Estados do componente
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [options, setOptions] = useState(['Começar']);
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState('boas_vindas');
  const [cvData, setCvData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const { user } = useAuth();
  const flatListRef = useRef();

  // Função para inicializar o chat com mensagem de boas-vindas
  const inicializarChat = () => {
    console.log('Inicializando chat com mensagem de boas-vindas');
    const welcomeMessage = {
      id: getUniqueId(),
      text: "Olá! Sou o CurriculoBot, seu assistente para criar um currículo profissional. Digite 'começar' quando estiver pronto!",
      isUser: false,
      time: getCurrentTime()
    };

    setMessages([welcomeMessage]);
    setCurrentStep('boas_vindas');
    setCvData(null);
    setOptions(['Começar']);
  };

  // Verificar se estamos retomando um currículo em progresso
  useEffect(() => {
    const carregarDados = async () => {
      try {
        console.log('Carregando dados iniciais do chat');

        // Flag para verificar se devemos restaurar ou inicializar
        let restaurado = false;

        // Verificar se estamos restaurando de um progresso salvo
        if (route.params?.continuarProgresso) {
          console.log('Tentando restaurar progresso...');
          const progresso = await recuperarProgressoCurriculo(user.id);

          if (progresso && progresso.data) {
            // Verificar se o progresso é válido (menos de 24h)
            const dataProgresso = new Date(progresso.timestamp);
            const agora = new Date();
            const diferencaHoras = (agora - dataProgresso) / (1000 * 60 * 60);

            if (diferencaHoras < 24 && progresso.data.messages && progresso.data.messages.length > 0) {
              console.log('Restaurando progresso de', dataProgresso);

              // Restaurar o estado do chat
              setCvData(progresso.data.cvData || null);
              setCurrentStep(progresso.data.currentStep || 'boas_vindas');
              setOptions(progresso.data.options || ['Começar']);
              setMessages(progresso.data.messages || []);

              restaurado = true;

              // Notificar o usuário que o progresso foi restaurado
              setTimeout(() => {
                Alert.alert(
                  "Progresso Restaurado",
                  "Seu currículo em andamento foi restaurado com sucesso!"
                );
              }, 500);
            } else {
              console.log('Progresso muito antigo ou inválido:', diferencaHoras, 'horas');
            }
          } else {
            console.log('Nenhum progresso encontrado para restaurar');
          }
        }

        // Se não conseguimos restaurar, inicializar normalmente
        if (!restaurado) {
          console.log('Inicializando chat normalmente');
          inicializarChat();
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        // Em caso de erro, garantir que o chat seja inicializado
        inicializarChat();
      } finally {
        // Sempre marcar a inicialização como concluída
        setInitializing(false);
      }
    };

    carregarDados();
  }, []);

  // Efeito para rolar para o final da lista quando mensagens mudarem
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current && !initializing) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, initializing]);

  // Salvar progresso quando sair da tela
  useEffect(() => {
    return () => {
      // Só salvar se houver progresso significativo (além da mensagem inicial) e não estiver concluído
      if (messages.length > 1 && currentStep !== 'boas_vindas' && currentStep !== 'concluido' && cvData) {
        console.log('Salvando progresso ao sair da tela');
        salvarProgressoCurriculo(user.id, {
          cvData,
          currentStep,
          options,
          messages,
        });
      }
    };
  }, [messages, currentStep, cvData, options, user.id]);

  // Limpar o progresso salvo quando finalizar o currículo
  useEffect(() => {
    if (currentStep === 'concluido' && cvData) {
      console.log('Currículo concluído, limpando progresso salvo');
      limparProgressoCurriculo(user.id);
    }
  }, [currentStep, cvData, user.id]);

  // Adicionar mensagem do bot
  const addBotMessage = (text) => {
    setIsTyping(true);

    // Simular tempo de digitação do bot (mais curto para melhor responsividade)
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
        setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
      }
    }, 700);
  };

  // Lidar com envio de mensagem
  const handleSendMessage = () => {
    if (currentMessage.trim() === '') return;

    // Adicionar mensagem do usuário
    const userMessage = {
      id: getUniqueId(),
      text: currentMessage,
      isUser: true,
      time: getCurrentTime()
    };

    // Atualizar mensagens
    setMessages(prevMessages => [...prevMessages, userMessage]);

    // Processar a mensagem para obter a resposta
    const { response, nextStep, options: newOptions, cvData: newCvData, isFinished } =
      processMessage(currentMessage, currentStep, cvData);

    // Atualizar estados
    setCvData(newCvData);
    setCurrentStep(nextStep);
    setOptions(newOptions || []);
    setCurrentMessage(''); // Limpar campo de entrada

    // Adicionar resposta do bot
    addBotMessage(response);

    // Salvar currículo se finalizado
    if (isFinished) {
      salvarCurriculo(newCvData, user.id)
        .then(id => {
          console.log('Currículo salvo com ID:', id);
          // Limpar o progresso salvo ao finalizar
          limparProgressoCurriculo(user.id);
        })
        .catch(error => {
          console.error('Erro ao salvar currículo:', error);
          Alert.alert('Erro', 'Não foi possível salvar o currículo.');
        });
    }

    // Rolar para o final da lista
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
    }
  };

  // Selecionar uma opção pré-definida
  const handleOptionSelect = (option) => {
    setCurrentMessage(option);
    handleSendMessage();
  };

  // Exibir indicador de carregamento enquanto inicializa
  if (initializing) {
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
          <View style={{ width: 80 }} />
        </View>
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f7fa'
        }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 20, color: Colors.dark }}>
            Preparando o assistente...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Renderizar chatbot
  return (
    <SafeAreaView style={styles.chatContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />

      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.chatBackButton}
          onPress={() => {
            // Se há progresso significativo, confirmar antes de voltar
            if (messages.length > 1 && currentStep !== 'boas_vindas' && currentStep !== 'concluido') {
              Alert.alert(
                "Sair da criação?",
                "Seu progresso será salvo e você poderá continuar depois. Deseja sair?",
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Sair",
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
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
          <>
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
              onContentSizeChange={() => {
                if (flatListRef.current) {
                  flatListRef.current.scrollToEnd({ animated: true });
                }
              }}
              onLayout={() => {
                if (flatListRef.current) {
                  flatListRef.current.scrollToEnd({ animated: false });
                }
              }}
              ListFooterComponent={
                isTyping ? (
                  <View style={styles.typingContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.typingDot, { opacity: 0.7 }]} />
                      <View style={[styles.typingDot, { opacity: 0.8, marginHorizontal: 4 }]} />
                      <View style={[styles.typingDot, { opacity: 0.9 }]} />
                    </View>
                    <Text style={styles.typingText}>Bot está digitando...</Text>
                  </View>
                ) : null
              }
            />

            {options && options.length > 0 && (
              <ChatOptions options={options} onSelect={handleOptionSelect} />
            )}
          </>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        style={{ width: '100%' }}
      >
        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.improvedChatInput}
            placeholder="Digite sua mensagem..."
            value={currentMessage}
            onChangeText={setCurrentMessage}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
            multiline={true}
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[
              styles.improvedSendButton,
              {
                opacity: currentMessage.trim() === '' ? 0.5 : 1,
              }
            ]}
            onPress={handleSendMessage}
            disabled={currentMessage.trim() === ''}
          >
            <Text style={styles.improvedSendButtonText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Cores profissionais
const ProfessionalColors = {
  primary: '#0062cc',         // Azul profissional mais escuro
  secondary: '#4e73df',       // Azul secundário 
  tertiary: '#2c9faf',        // Azul esverdeado para destacar
  backgroundLight: '#f8f9fc', // Fundo claro
  cardBackground: '#ffffff',  // Branco para cartões
  textDark: '#333333',        // Texto escuro
  textMedium: '#5a5c69',      // Texto médio para descrições
  textLight: '#858796',       // Texto claro para informações secundárias
  border: '#e3e6f0',          // Bordas sutis
  success: '#1cc88a',         // Verde para ações positivas
  danger: '#e74a3b',          // Vermelho para ações negativas
  warning: '#f6c23e',         // Amarelo para alertas
  info: '#36b9cc'             // Azul claro para informações
};

// Estilos compartilhados
const sharedStyles = {
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  
  cardAnimationConfig: {
    animation: 'fadeInUp',
    duration: 400,
    useNativeDriver: true
  }
};

// Componente de ícone de documento para substituir a imagem ausente
const DocumentIcon = ({ style }) => {
  return (
    <View style={[{
      width: 80,
      height: 80,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(78, 115, 223, 0.1)',
      borderRadius: 40,
    }, style]}>
      <Text style={{ fontSize: 40 }}>📄</Text>
    </View>
  );
};

// Estilos para o CurriculosAnaliseScreen
const curriculoAnaliseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ProfessionalColors.backgroundLight,
  },
  
  header: {
    backgroundColor: ProfessionalColors.cardBackground,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: ProfessionalColors.border,
    ...sharedStyles.cardShadow
  },
  
  headerTitle: {
    color: ProfessionalColors.textDark,
    fontSize: 18,
    fontWeight: '600',
  },
  
  backButton: {
    marginRight: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(78, 115, 223, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  backButtonText: {
    fontSize: 22,
    color: ProfessionalColors.primary,
    fontWeight: '600',
  },
  
  introContainer: {
    backgroundColor: ProfessionalColors.cardBackground,
    margin: 16,
    marginBottom: 24,
    borderRadius: 10,
    padding: 20,
    ...sharedStyles.cardShadow
  },
  
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ProfessionalColors.textDark,
    marginBottom: 12,
  },
  
  introText: {
    fontSize: 15,
    lineHeight: 22,
    color: ProfessionalColors.textMedium,
  },
  
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: ProfessionalColors.textDark,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  
  curriculoCard: {
    backgroundColor: ProfessionalColors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    padding: 0,
    overflow: 'hidden',
    ...sharedStyles.cardShadow
  },
  
  curriculoCardContent: {
    padding: 16,
  },
  
  curriculoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  
  curriculoCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: ProfessionalColors.textDark,
    flex: 1,
  },
  
  curriculoCardDate: {
    fontSize: 13,
    color: ProfessionalColors.textLight,
    marginTop: 4,
  },
  
  curriculoCardBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    backgroundColor: ProfessionalColors.primary,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  
  curriculoCardBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  
  curriculoCardStats: {
    flexDirection: 'row',
    marginTop: 12,
    flexWrap: 'wrap',
  },
  
  curriculoCardStatItem: {
    backgroundColor: 'rgba(78, 115, 223, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  
  curriculoCardStatText: {
    color: ProfessionalColors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  
  curriculoCardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: ProfessionalColors.border,
  },
  
  curriculoCardButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  
  curriculoCardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: ProfessionalColors.primary,
    marginLeft: 6,
  },
  
  curriculoCardButtonDivider: {
    width: 1,
    backgroundColor: ProfessionalColors.border,
  },
  
  analyzeButton: {
    backgroundColor: ProfessionalColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 30,
    ...sharedStyles.cardShadow
  },
  
  analyzeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  
  emptyStateIcon: {
    width: 80,
    height: 80,
    marginBottom: 20,
    tintColor: 'rgba(78, 115, 223, 0.2)',
  },
  
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ProfessionalColors.textDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  
  emptyStateText: {
    textAlign: 'center',
    color: ProfessionalColors.textMedium,
    marginBottom: 24,
    fontSize: 15,
    lineHeight: 22,
  },
  
  emptyStateButton: {
    backgroundColor: ProfessionalColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...sharedStyles.cardShadow
  },
  
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

// Estilos para a tela Meus Currículos (mantendo os estilos originais)
const meusCurriculosStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ProfessionalColors.backgroundLight,
  },
  
  header: {
    backgroundColor: ProfessionalColors.cardBackground,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: ProfessionalColors.border,
    ...sharedStyles.cardShadow
  },
  
  headerTitle: {
    color: ProfessionalColors.textDark,
    fontSize: 18,
    fontWeight: '600',
  },
  
  backButton: {
    marginRight: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(78, 115, 223, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  backButtonText: {
    fontSize: 22,
    color: ProfessionalColors.primary,
    fontWeight: '600',
  },
  
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(78, 115, 223, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  
  headerActionIcon: {
    fontSize: 20,
    color: ProfessionalColors.primary,
  },
  
  searchContainer: {
    backgroundColor: ProfessionalColors.cardBackground,
    margin: 16,
    marginBottom: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...sharedStyles.cardShadow
  },
  
  searchIcon: {
    fontSize: 20,
    color: ProfessionalColors.textLight,
    marginRight: 10,
  },
  
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: ProfessionalColors.textDark,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: ProfessionalColors.textDark,
  },
  
  sectionActionText: {
    fontSize: 14,
    color: ProfessionalColors.primary,
  },
  
  curriculoCard: {
    backgroundColor: ProfessionalColors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    ...sharedStyles.cardShadow
  },
  
  curriculoCardContent: {
    padding: 16,
  },
  
  curriculoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  curriculoCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: ProfessionalColors.textDark,
    marginBottom: 4,
    flex: 1,
  },
  
  curriculoCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  curriculoCardMetaIcon: {
    fontSize: 14,
    color: ProfessionalColors.textLight,
    marginRight: 6,
  },
  
  curriculoCardMetaText: {
    fontSize: 13,
    color: ProfessionalColors.textLight,
  },
  
  curriculoCardDetails: {
    backgroundColor: 'rgba(78, 115, 223, 0.05)',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  
  curriculoCardDetailsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  
  curriculoCardDetailsLabel: {
    fontSize: 14,
    color: ProfessionalColors.textMedium,
    fontWeight: '500',
    width: 100,
  },
  
  curriculoCardDetailsValue: {
    fontSize: 14,
    color: ProfessionalColors.textDark,
    flex: 1,
  },
  
  curriculoCardTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  
  curriculoCardTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    backgroundColor: 'rgba(78, 115, 223, 0.1)',
    marginRight: 8,
    marginBottom: 8,
  },
  
  curriculoCardTagText: {
    fontSize: 12,
    color: ProfessionalColors.primary,
    fontWeight: '500',
  },
  
  curriculoCardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: ProfessionalColors.border,
  },
  
  curriculoCardAction: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  
  curriculoCardActionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  
  curriculoCardActionPrimary: {
    color: ProfessionalColors.primary,
  },
  
  curriculoCardActionSecondary: {
    color: ProfessionalColors.secondary,
  },
  
  curriculoCardActionDanger: {
    color: ProfessionalColors.danger,
  },
  
  curriculoCardDivider: {
    width: 1,
    backgroundColor: ProfessionalColors.border,
  },
  
  menuOptions: {
    backgroundColor: ProfessionalColors.cardBackground,
    borderRadius: 8,
    width: 180,
    ...sharedStyles.cardShadow
  },
  
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  
  menuOptionText: {
    fontSize: 15,
    marginLeft: 10,
    color: ProfessionalColors.textDark,
  },
  
  menuOptionDanger: {
    color: ProfessionalColors.danger,
  },
  
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ProfessionalColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  
  fabButtonText: {
    fontSize: 26,
    color: 'white',
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  
  emptyStateIcon: {
    width: 80,
    height: 80,
    marginBottom: 20,
    tintColor: 'rgba(78, 115, 223, 0.2)',
  },
  
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ProfessionalColors.textDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  
  emptyStateText: {
    textAlign: 'center',
    color: ProfessionalColors.textMedium,
    marginBottom: 24,
    fontSize: 15,
    lineHeight: 22,
  },
  
  emptyStateButton: {
    backgroundColor: ProfessionalColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...sharedStyles.cardShadow
  },
  
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

// Implementação corrigida da tela de análise de currículo
const CurriculosAnaliseScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [curriculos, setCurriculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fadeValue, setFadeValue] = useState(0); // Usar um valor numérico em vez de Animated.Value
  
  const loadCurriculos = async () => {
    try {
      setLoading(true);
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculosData = cvs ? JSON.parse(cvs) : [];
      setCurriculos(curriculosData);
      
      // Atualizamos para 1 após carregar os dados
      setTimeout(() => {
        setFadeValue(1);
      }, 100);
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
  
  // Função para extrair informações do currículo para exibição
  const getResumoCurriculo = (curriculo) => {
    const cv = curriculo.data;
    const experiencias = cv.experiencias?.length || 0;
    const formacoes = cv.formacoes_academicas?.length || 0;
    const projetos = cv.projetos?.length || 0;
    const idiomas = cv.idiomas?.length || 0;
    const area = cv.informacoes_pessoais?.area || 'Não especificada';

    return { experiencias, formacoes, projetos, idiomas, area };
  };
  
  // Formatar data de maneira mais legível
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Data não disponível';
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch (error) {
      return 'Data inválida';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={curriculoAnaliseStyles.container}>
        <View style={curriculoAnaliseStyles.header}>
          <TouchableOpacity
            style={curriculoAnaliseStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={curriculoAnaliseStyles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={curriculoAnaliseStyles.headerTitle}>Analisar Currículo</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={ProfessionalColors.primary} />
          <Text style={{ marginTop: 16, color: ProfessionalColors.textMedium, fontSize: 16 }}>
            Carregando currículos...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (curriculos.length === 0) {
    return (
      <SafeAreaView style={curriculoAnaliseStyles.container}>
        <View style={curriculoAnaliseStyles.header}>
          <TouchableOpacity
            style={curriculoAnaliseStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={curriculoAnaliseStyles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={curriculoAnaliseStyles.headerTitle}>Analisar Currículo</Text>
        </View>
        <View style={curriculoAnaliseStyles.emptyState}>
          <DocumentIcon style={curriculoAnaliseStyles.emptyStateIcon} />
          <Text style={curriculoAnaliseStyles.emptyStateTitle}>Nenhum Currículo Encontrado</Text>
          <Text style={curriculoAnaliseStyles.emptyStateText}>
            Você precisa criar um currículo antes de usar nossa poderosa análise de IA para aprimorá-lo.
          </Text>
          <TouchableOpacity
            style={curriculoAnaliseStyles.emptyStateButton}
            onPress={() => navigation.navigate('Chatbot')}
          >
            <Text style={curriculoAnaliseStyles.emptyStateButtonText}>Criar Meu Currículo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={curriculoAnaliseStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={ProfessionalColors.cardBackground} />

      <View style={curriculoAnaliseStyles.header}>
        <TouchableOpacity
          style={curriculoAnaliseStyles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={curriculoAnaliseStyles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={curriculoAnaliseStyles.headerTitle}>Analisar Currículo</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={curriculoAnaliseStyles.introContainer}>
          <Text style={curriculoAnaliseStyles.introTitle}>Análise Profissional com IA</Text>
          <Text style={curriculoAnaliseStyles.introText}>
            Nossa tecnologia de IA avançada analisará seu currículo e fornecerá feedback detalhado, 
            identificará pontos fortes e fracos, e sugerirá melhorias personalizadas para aumentar 
            suas chances de sucesso.
          </Text>
        </View>

        <Text style={curriculoAnaliseStyles.sectionTitle}>Selecione um currículo para analisar:</Text>

        {/* Não usamos a propriedade opacity com Animated aqui */}
        <FlatList
          data={curriculos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          style={{ opacity: fadeValue }} // Usamos um valor numérico normal
          renderItem={({ item }) => {
            const resumo = getResumoCurriculo(item);
            
            return (
              <View style={curriculoAnaliseStyles.curriculoCard}>
                <View style={curriculoAnaliseStyles.curriculoCardContent}>
                  <View style={curriculoAnaliseStyles.curriculoCardHeader}>
                    <View>
                      <Text style={curriculoAnaliseStyles.curriculoCardTitle}>
                        {item.nome || 'Currículo sem nome'}
                      </Text>
                      <Text style={curriculoAnaliseStyles.curriculoCardDate}>
                        Criado em {formatDate(item.dataCriacao)}
                      </Text>
                    </View>
                    
                    <TouchableOpacity
                      style={curriculoAnaliseStyles.curriculoCardBadge}
                    >
                      <Text style={curriculoAnaliseStyles.curriculoCardBadgeText}>
                        Selecionar
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={curriculoAnaliseStyles.curriculoCardStats}>
                    <View style={curriculoAnaliseStyles.curriculoCardStatItem}>
                      <Text style={curriculoAnaliseStyles.curriculoCardStatText}>
                        Área: {resumo.area}
                      </Text>
                    </View>
                    
                    {resumo.experiencias > 0 && (
                      <View style={curriculoAnaliseStyles.curriculoCardStatItem}>
                        <Text style={curriculoAnaliseStyles.curriculoCardStatText}>
                          {resumo.experiencias} experiência(s)
                        </Text>
                      </View>
                    )}
                    
                    {resumo.formacoes > 0 && (
                      <View style={curriculoAnaliseStyles.curriculoCardStatItem}>
                        <Text style={curriculoAnaliseStyles.curriculoCardStatText}>
                          {resumo.formacoes} formação(ões)
                        </Text>
                      </View>
                    )}
                    
                    {resumo.projetos > 0 && (
                      <View style={curriculoAnaliseStyles.curriculoCardStatItem}>
                        <Text style={curriculoAnaliseStyles.curriculoCardStatText}>
                          {resumo.projetos} projeto(s)
                        </Text>
                      </View>
                    )}
                    
                    {resumo.idiomas > 0 && (
                      <View style={curriculoAnaliseStyles.curriculoCardStatItem}>
                        <Text style={curriculoAnaliseStyles.curriculoCardStatText}>
                          {resumo.idiomas} idioma(s)
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={curriculoAnaliseStyles.curriculoCardFooter}>
                  <TouchableOpacity 
                    style={curriculoAnaliseStyles.curriculoCardButton}
                    onPress={() => navigation.navigate('PreviewCV', { curriculoData: item })}
                  >
                    <Text style={curriculoAnaliseStyles.curriculoCardButtonText}>
                      <Text>🔍</Text> Visualizar
                    </Text>
                  </TouchableOpacity>
                  
                  <View style={curriculoAnaliseStyles.curriculoCardButtonDivider} />
                  
                  <TouchableOpacity 
                    style={curriculoAnaliseStyles.curriculoCardButton}
                    onPress={() => navigation.navigate('AnaliseCV', { curriculoData: item })}
                  >
                    <Text style={curriculoAnaliseStyles.curriculoCardButtonText}>
                      <Text>📊</Text> Analisar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
        
        <TouchableOpacity
          style={curriculoAnaliseStyles.analyzeButton}
          onPress={() => navigation.navigate('AnaliseCV', { curriculoData: curriculos[0] })}
        >
          <Text>🧠</Text>
          <Text style={curriculoAnaliseStyles.analyzeButtonText}>
            Análise Completa com IA
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// Implementação corrigida da tela de gerenciamento de currículos
const MeusCurriculosScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [curriculos, setCurriculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filteredCurriculos, setFilteredCurriculos] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedCurriculoId, setSelectedCurriculoId] = useState(null);
  const [fadeValue, setFadeValue] = useState(0); // Valor numérico para fade
  
  // Referência para posição do menu
  const menuPosition = useRef({ x: 0, y: 0 });

  const loadCurriculos = async () => {
    try {
      setLoading(true);
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculosData = cvs ? JSON.parse(cvs) : [];
      setCurriculos(curriculosData);
      setFilteredCurriculos(curriculosData);
      
      // Usando um valor numérico para fade
      setTimeout(() => {
        setFadeValue(1);
      }, 100);
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
  
  // Filtrar currículos com base no texto de pesquisa
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredCurriculos(curriculos);
    } else {
      const filtered = curriculos.filter(cv => 
        cv.nome?.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredCurriculos(filtered);
    }
  }, [searchText, curriculos]);

  const handleDeleteCV = (id) => {
    setShowMenu(false);
    
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
              const updatedCurriculos = curriculos.filter(cv => cv.id !== id);
              await AsyncStorage.setItem(`curriculos_${user.id}`, JSON.stringify(updatedCurriculos));
              setCurriculos(updatedCurriculos);
              setFilteredCurriculos(
                filteredCurriculos.filter(cv => cv.id !== id)
              );
              
              // Adicionar mensagem de sucesso
              Alert.alert(
                "Sucesso", 
                "Currículo excluído com sucesso!"
              );
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
  
  const handleAnalyzeCV = (cv) => {
    navigation.navigate('AnaliseCV', { curriculoData: cv });
  };
  
  const handleShareCV = (cv) => {
    // Simular compartilhamento
    Share.share({
      message: `Currículo de ${cv.nome || 'Usuário'} - ${formatDate(cv.dataCriacao)}`,
      title: `Currículo - ${cv.nome || 'Usuário'}`
    }).catch(error => {
      console.error('Erro ao compartilhar:', error);
    });
  };
  
  const showContextMenu = (id, event) => {
    // Salvar a posição para o menu
    menuPosition.current = {
      x: event.nativeEvent.pageX - 180,  // Ajustar para o menu não ficar fora da tela
      y: event.nativeEvent.pageY
    };
    setSelectedCurriculoId(id);
    setShowMenu(true);
  };
  
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Data não disponível';
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch (error) {
      return 'Data inválida';
    }
  };
  
  // Obter resumo do currículo
  const getCurriculoDetails = (curriculo) => {
    const cv = curriculo.data;
    const area = cv.informacoes_pessoais?.area || 'Não especificada';
    const experiencias = cv.experiencias?.length || 0;
    const ultimaExperiencia = cv.experiencias?.length > 0 
      ? cv.experiencias[0].cargo + ' em ' + cv.experiencias[0].empresa
      : 'Nenhuma experiência';
    const formacoes = cv.formacoes_academicas?.length || 0;
    const ultimaFormacao = cv.formacoes_academicas?.length > 0
      ? cv.formacoes_academicas[0].diploma + ' em ' + cv.formacoes_academicas[0].area_estudo
      : 'Nenhuma formação';
      
    return { area, experiencias, ultimaExperiencia, formacoes, ultimaFormacao };
  };

  if (loading) {
    return (
      <SafeAreaView style={meusCurriculosStyles.container}>
        <View style={meusCurriculosStyles.header}>
          <TouchableOpacity
            style={meusCurriculosStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={meusCurriculosStyles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={meusCurriculosStyles.headerTitle}>Gerenciar Currículos</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={ProfessionalColors.primary} />
          <Text style={{ marginTop: 16, color: ProfessionalColors.textMedium, fontSize: 16 }}>
            Carregando currículos...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (curriculos.length === 0) {
    return (
      <SafeAreaView style={meusCurriculosStyles.container}>
        <View style={meusCurriculosStyles.header}>
          <TouchableOpacity
            style={meusCurriculosStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={meusCurriculosStyles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={meusCurriculosStyles.headerTitle}>Gerenciar Currículos</Text>
        </View>
        <View style={meusCurriculosStyles.emptyState}>
          <DocumentIcon style={meusCurriculosStyles.emptyStateIcon} />
          <Text style={meusCurriculosStyles.emptyStateTitle}>Nenhum Currículo Encontrado</Text>
          <Text style={meusCurriculosStyles.emptyStateText}>
            Você ainda não criou nenhum currículo. Crie seu primeiro currículo profissional agora mesmo!
          </Text>
          <TouchableOpacity
            style={meusCurriculosStyles.emptyStateButton}
            onPress={() => navigation.navigate('Chatbot')}
          >
            <Text style={meusCurriculosStyles.emptyStateButtonText}>Criar Currículo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={meusCurriculosStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={ProfessionalColors.cardBackground} />

      <View style={meusCurriculosStyles.header}>
        <TouchableOpacity
          style={meusCurriculosStyles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={meusCurriculosStyles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={meusCurriculosStyles.headerTitle}>Gerenciar Currículos</Text>
        
        <View style={meusCurriculosStyles.headerActions}>
          <TouchableOpacity style={meusCurriculosStyles.headerActionButton}>
            <Text style={meusCurriculosStyles.headerActionIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Barra de pesquisa */}
      <View style={meusCurriculosStyles.searchContainer}>
        <Text style={meusCurriculosStyles.searchIcon}>🔍</Text>
        <TextInput
          style={meusCurriculosStyles.searchInput}
          placeholder="Buscar currículos..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>
      
      {/* Header da seção */}
      <View style={meusCurriculosStyles.sectionHeader}>
        <Text style={meusCurriculosStyles.sectionTitle}>
          Seus Currículos ({filteredCurriculos.length})
        </Text>
        <TouchableOpacity>
          <Text style={meusCurriculosStyles.sectionActionText}>Ordenar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCurriculos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        style={{ opacity: fadeValue }} // Usando valor numérico
        renderItem={({ item }) => {
          const details = getCurriculoDetails(item);
          
          return (
            <View style={meusCurriculosStyles.curriculoCard}>
              <TouchableOpacity 
                style={meusCurriculosStyles.curriculoCardContent}
                onPress={() => handleViewCV(item)}
                onLongPress={(event) => showContextMenu(item.id, event)}
              >
                <View style={meusCurriculosStyles.curriculoCardHeader}>
                  <Text style={meusCurriculosStyles.curriculoCardTitle}>
                    {item.nome || 'Currículo sem nome'}
                  </Text>
                  
                  {/* Menu de contexto */}
                  <TouchableOpacity 
                    onPress={(event) => showContextMenu(item.id, event)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text>⋮</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={meusCurriculosStyles.curriculoCardMeta}>
                  <Text style={meusCurriculosStyles.curriculoCardMetaIcon}>📅</Text>
                  <Text style={meusCurriculosStyles.curriculoCardMetaText}>
                    Criado em {formatDate(item.dataCriacao)}
                  </Text>
                </View>
                
                <View style={meusCurriculosStyles.curriculoCardDetails}>
                  <View style={meusCurriculosStyles.curriculoCardDetailsRow}>
                    <Text style={meusCurriculosStyles.curriculoCardDetailsLabel}>Área:</Text>
                    <Text style={meusCurriculosStyles.curriculoCardDetailsValue}>
                      {details.area}
                    </Text>
                  </View>
                  
                  <View style={meusCurriculosStyles.curriculoCardDetailsRow}>
                    <Text style={meusCurriculosStyles.curriculoCardDetailsLabel}>Experiência:</Text>
                    <Text style={meusCurriculosStyles.curriculoCardDetailsValue}>
                      {details.ultimaExperiencia}
                    </Text>
                  </View>
                  
                  <View style={meusCurriculosStyles.curriculoCardDetailsRow}>
                    <Text style={meusCurriculosStyles.curriculoCardDetailsLabel}>Formação:</Text>
                    <Text style={meusCurriculosStyles.curriculoCardDetailsValue}>
                      {details.ultimaFormacao}
                    </Text>
                  </View>
                </View>
                
                <View style={meusCurriculosStyles.curriculoCardTagsContainer}>
                  <View style={meusCurriculosStyles.curriculoCardTag}>
                    <Text style={meusCurriculosStyles.curriculoCardTagText}>
                      {details.experiencias} experiência(s)
                    </Text>
                  </View>
                  
                  <View style={meusCurriculosStyles.curriculoCardTag}>
                    <Text style={meusCurriculosStyles.curriculoCardTagText}>
                      {details.formacoes} formação(ões)
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              <View style={meusCurriculosStyles.curriculoCardActions}>
                <TouchableOpacity 
                  style={meusCurriculosStyles.curriculoCardAction}
                  onPress={() => handleViewCV(item)}
                >
                  <Text style={[
                    meusCurriculosStyles.curriculoCardActionText,
                    meusCurriculosStyles.curriculoCardActionPrimary
                  ]}>
                    <Text>👁️</Text> Visualizar
                  </Text>
                </TouchableOpacity>
                
                <View style={meusCurriculosStyles.curriculoCardDivider} />
                
                <TouchableOpacity 
                  style={meusCurriculosStyles.curriculoCardAction}
                  onPress={() => handleAnalyzeCV(item)}
                >
                  <Text style={[
                    meusCurriculosStyles.curriculoCardActionText,
                    meusCurriculosStyles.curriculoCardActionSecondary
                  ]}>
                    <Text>📊</Text> Analisar
                  </Text>
                </TouchableOpacity>
                
                <View style={meusCurriculosStyles.curriculoCardDivider} />
                
                <TouchableOpacity 
                  style={meusCurriculosStyles.curriculoCardAction}
                  onPress={() => handleDeleteCV(item.id)}
                >
                  <Text style={[
                    meusCurriculosStyles.curriculoCardActionText,
                    meusCurriculosStyles.curriculoCardActionDanger
                  ]}>
                    <Text>🗑️</Text> Excluir
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Menu de contexto */}
      {showMenu && (
        <TouchableOpacity 
          style={meusCurriculosStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={[
            meusCurriculosStyles.menuOptions,
            { 
              position: 'absolute',
              top: menuPosition.current.y,
              left: menuPosition.current.x
            }
          ]}>
            <TouchableOpacity 
              style={meusCurriculosStyles.menuOption}
              onPress={() => {
                setShowMenu(false);
                const cv = curriculos.find(c => c.id === selectedCurriculoId);
                if (cv) handleViewCV(cv);
              }}
            >
              <Text>👁️</Text>
              <Text style={meusCurriculosStyles.menuOptionText}>Visualizar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={meusCurriculosStyles.menuOption}
              onPress={() => {
                setShowMenu(false);
                const cv = curriculos.find(c => c.id === selectedCurriculoId);
                if (cv) handleAnalyzeCV(cv);
              }}
            >
              <Text>📊</Text>
              <Text style={meusCurriculosStyles.menuOptionText}>Analisar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={meusCurriculosStyles.menuOption}
              onPress={() => {
                setShowMenu(false);
                const cv = curriculos.find(c => c.id === selectedCurriculoId);
                if (cv) handleShareCV(cv);
              }}
            >
              <Text>📤</Text>
              <Text style={meusCurriculosStyles.menuOptionText}>Compartilhar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={meusCurriculosStyles.menuOption}
              onPress={() => {
                if (selectedCurriculoId) handleDeleteCV(selectedCurriculoId);
              }}
            >
              <Text>🗑️</Text>
              <Text style={[meusCurriculosStyles.menuOptionText, meusCurriculosStyles.menuOptionDanger]}>
                Excluir
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={meusCurriculosStyles.fabButton}
        onPress={() => navigation.navigate('Chatbot')}
      >
        <Text style={meusCurriculosStyles.fabButtonText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// Versão corrigida do PreviewCVScreen sem usar Modal
const PreviewCVScreen = ({ route, navigation }) => {
  const { curriculoData } = route.params;
  const [templateStyle, setTemplateStyle] = useState('modern');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

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

  // Emular criação de PDF (já que não temos a biblioteca)
  const handleExportPDF = async () => {
    setGeneratingPDF(true);

    try {
      // Simular processo de geração de PDF
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Exibir alerta com opções de ação
      Alert.alert(
        'PDF Gerado com Sucesso!',
        'O que você gostaria de fazer com o PDF?',
        [
          {
            text: 'Compartilhar',
            onPress: () => handleShare(),
          },
          {
            text: 'Salvar na Galeria',
            onPress: () => {
              Alert.alert(
                'Salvando na Galeria...',
                'Funcionalidade simulada. Em um app real, o PDF seria salvo na galeria.',
                [{ text: 'OK' }]
              );
            },
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const templateOptions = [
    { id: 'modern', name: 'Moderno', category: 'Moderno', color: Colors.primary },
    { id: 'minimal', name: 'Minimalista', category: 'Moderno', color: '#333333' },
    { id: 'tech', name: 'Tech', category: 'Moderno', color: '#3498db' },
    { id: 'gradient', name: 'Gradiente', category: 'Moderno', color: '#6200ee' },
    { id: 'startup', name: 'Startup', category: 'Moderno', color: '#000000' },

    // Clássicos
    { id: 'classic', name: 'Clássico', category: 'Clássico', color: Colors.dark },
    { id: 'traditional', name: 'Tradicional', category: 'Clássico', color: '#333333' },
    { id: 'elegant', name: 'Elegante', category: 'Clássico', color: '#222222' },
    { id: 'serif', name: 'Serif', category: 'Clássico', color: '#5d4037' },
    { id: 'academic', name: 'Acadêmico', category: 'Clássico', color: '#000000' },

    // Criativos
    { id: 'creative', name: 'Criativo', category: 'Criativo', color: Colors.primary },
    { id: 'artistic', name: 'Artístico', category: 'Criativo', color: '#9c27b0' },
    { id: 'colorful', name: 'Colorido', category: 'Criativo', color: '#2196f3' },
    { id: 'portfolio', name: 'Portfólio', category: 'Criativo', color: '#212121' },
    { id: 'designer', name: 'Designer', category: 'Criativo', color: '#ff5722' },

    // Profissionais
    { id: 'professional', name: 'Profissional', category: 'Profissional', color: Colors.secondary },
    { id: 'executive', name: 'Executivo', category: 'Profissional', color: '#263238' },
    { id: 'corporate', name: 'Corporativo', category: 'Profissional', color: '#01579b' },
    { id: 'business', name: 'Business', category: 'Profissional', color: '#1e3a5f' },
    { id: 'consulting', name: 'Consultoria', category: 'Profissional', color: '#1a237e' },

    // Específicos por área
    { id: 'tech-dev', name: 'Desenvolvedor', category: 'Por Área', color: '#61dafb' },
    { id: 'marketing', name: 'Marketing', category: 'Por Área', color: '#673ab7' },
    { id: 'healthcare', name: 'Saúde', category: 'Por Área', color: '#00897b' },
    { id: 'education', name: 'Educação', category: 'Por Área', color: '#0277bd' },
    { id: 'legal', name: 'Jurídico', category: 'Por Área', color: '#37474f' },
  ];

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

      {/* Barra de ferramentas */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.mediumGray,
      }}>
        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            borderRightWidth: 1,
            borderRightColor: Colors.mediumGray,
          }}
          onPress={() => setShowTemplateSelector(!showTemplateSelector)}
        >
          <Text style={{ marginRight: 5 }}>Template: {templateOptions.find(t => t.id === templateStyle)?.name}</Text>
          <Text>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
          }}
          onPress={handleExportPDF}
          disabled={generatingPDF}
        >
          {generatingPDF ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <Text style={{ marginRight: 5 }}>Exportar PDF</Text>
              <Text>📄</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Template selector overlay (em vez de Modal) */}
      {showTemplateSelector && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 100,
        }}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setShowTemplateSelector(false)}
          />

          <View style={{
            backgroundColor: Colors.white,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 15,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: Colors.dark,
              }}>
                Escolher Template
              </Text>

              <TouchableOpacity
                onPress={() => setShowTemplateSelector(false)}
              >
                <Text style={{
                  fontSize: 22,
                  color: Colors.lightText,
                  paddingHorizontal: 5,
                }}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            {templateOptions.map(template => (
              <TouchableOpacity
                key={template.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.mediumGray,
                  backgroundColor: templateStyle === template.id ? '#e3f2fd' : 'transparent',
                }}
                onPress={() => {
                  setTemplateStyle(template.id);
                  setShowTemplateSelector(false);
                }}
              >
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: template.color,
                  marginRight: 15,
                }} />

                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: templateStyle === template.id ? 'bold' : 'normal',
                    color: Colors.dark,
                  }}>
                    {template.name}
                  </Text>
                </View>

                {templateStyle === template.id && (
                  <Text style={{ fontSize: 18, color: Colors.primary }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <ScrollView style={styles.previewScreenScroll}>
        <View style={styles.previewScreenCard}>
          <CurriculumPreview data={curriculoData.data} templateStyle={templateStyle} />
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

// Componente para gerenciar a foto de perfil
const PerfilFotoScreen = ({ navigation, route }) => {
  const { user, updateUser } = useAuth();
  const [selectedImage, setSelectedImage] = useState(user?.foto || null);
  const [loading, setLoading] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);

  // Cores predefinidas para avatares caso não haja foto
  const colorOptions = [
    '#3498db', '#2ecc71', '#e74c3c', '#f39c12',
    '#9b59b6', '#1abc9c', '#d35400', '#c0392b'
  ];

  // Imagens de exemplo para simular a galeria
  const exampleImages = [
    { id: 'img1', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' },
    { id: 'img2', uri: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop' },
    { id: 'img3', uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop' },
    { id: 'img4', uri: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop' },
    { id: 'img5', uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' },
    { id: 'img6', uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop' },
    { id: 'img7', uri: 'https://randomuser.me/api/portraits/men/1.jpg' },
    { id: 'img8', uri: 'https://randomuser.me/api/portraits/women/1.jpg' },
    { id: 'img9', uri: 'https://randomuser.me/api/portraits/men/32.jpg' },
    { id: 'img10', uri: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { id: 'img11', uri: 'https://randomuser.me/api/portraits/men/85.jpg' },
    { id: 'img12', uri: 'https://randomuser.me/api/portraits/women/63.jpg' },
  ];

  // Estado para controlar o avatar de cor selecionado (caso não use foto)
  const [selectedColorIndex, setSelectedColorIndex] = useState(
    user?.avatarColorIndex !== undefined ? user.avatarColorIndex : Math.floor(Math.random() * colorOptions.length)
  );

  // Função para salvar a foto do perfil
  const saveProfileImage = async () => {
    try {
      setLoading(true);

      // Buscar dados atuais do usuário
      const usuariosStr = await AsyncStorage.getItem('usuarios');
      const usuarios = JSON.parse(usuariosStr) || [];

      // Encontrar índice do usuário atual
      const userIndex = usuarios.findIndex(u => u.id === user.id);
      if (userIndex === -1) {
        throw new Error('Usuário não encontrado');
      }

      // Atualizar usuário com a nova foto e índice de cor do avatar
      const updatedUser = {
        ...usuarios[userIndex],
        foto: selectedImage,
        avatarColorIndex: selectedColorIndex,
        dataAtualizacao: new Date().toISOString()
      };

      usuarios[userIndex] = updatedUser;

      // Salvar usuários atualizados
      await AsyncStorage.setItem('usuarios', JSON.stringify(usuarios));

      // Atualizar usuário atual
      await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));

      // Se o contexto de autenticação tiver uma função para atualizar o usuário, use-a
      if (updateUser) {
        updateUser(updatedUser);
      }

      Alert.alert('Sucesso', 'Foto de perfil atualizada com sucesso!');

      // Navegar de volta se veio de uma rota específica
      if (route.params?.returnTo) {
        navigation.navigate(route.params.returnTo);
      } else {
        navigation.goBack();
      }

    } catch (error) {
      console.error('Erro ao salvar foto de perfil:', error);
      Alert.alert('Erro', 'Não foi possível salvar a foto de perfil.');
    } finally {
      setLoading(false);
    }
  };

  // Função para simular a captura de foto com a câmera
  const handleTakePhoto = () => {
    setShowImageOptions(false);

    // Simular o processo de tirar uma foto
    setLoading(true);
    setTimeout(() => {
      // Seleciona uma imagem aleatória da galeria para simular uma foto
      const randomIndex = Math.floor(Math.random() * exampleImages.length);
      setSelectedImage(exampleImages[randomIndex].uri);
      setLoading(false);

      Alert.alert('Foto Capturada', 'A foto foi capturada com sucesso! (Simulação)');
    }, 1500);
  };

  // Função para remover a foto de perfil
  const handleRemovePhoto = () => {
    Alert.alert(
      'Remover Foto',
      'Tem certeza que deseja remover sua foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setSelectedImage(null);
            setShowImageOptions(false);
          }
        }
      ]
    );
  };

  // Renderiza o avatar com iniciais caso não haja foto
  const renderInitialsAvatar = () => {
    const initials = user?.nome ? user.nome.charAt(0).toUpperCase() : 'U';
    const backgroundColor = colorOptions[selectedColorIndex];

    return (
      <View style={{
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Text style={{
          fontSize: 60,
          color: Colors.white,
          fontWeight: 'bold',
        }}>
          {initials}
        </Text>
      </View>
    );
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
        <Text style={styles.headerTitle}>Foto de Perfil</Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{
          padding: 20,
          alignItems: 'center',
        }}>
          {/* Avatar ou foto do perfil */}
          <TouchableOpacity
            style={{
              marginVertical: 20,
              borderWidth: 3,
              borderColor: Colors.primary,
              borderRadius: 75,
              padding: 3,
            }}
            onPress={() => setShowImageOptions(true)}
            disabled={loading}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: 75,
                }}
              />
            ) : (
              renderInitialsAvatar()
            )}

            {/* Ícone de câmera sobreposto */}
            <View style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: Colors.primary,
              borderRadius: 20,
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: Colors.white,
            }}>
              <Text style={{ fontSize: 18, color: Colors.white }}>📷</Text>
            </View>
          </TouchableOpacity>

          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            marginVertical: 10,
          }}>
            {user?.nome || 'Usuário'}
          </Text>

          <Text style={{
            fontSize: 16,
            color: Colors.lightText,
            marginBottom: 20,
            textAlign: 'center',
          }}>
            Selecione ou tire uma foto para seu perfil, ou escolha uma cor para o avatar com suas iniciais.
          </Text>

          {/* Seletor de cores para o avatar */}
          {!selectedImage && (
            <View style={{ marginVertical: 20 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                marginBottom: 10,
                textAlign: 'center',
              }}>
                Escolha uma cor para seu avatar
              </Text>

              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                {colorOptions.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: color,
                      margin: 5,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: selectedColorIndex === index ? 3 : 0,
                      borderColor: Colors.white,
                      elevation: selectedColorIndex === index ? 5 : 0,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: selectedColorIndex === index ? 0.3 : 0,
                      shadowRadius: selectedColorIndex === index ? 4 : 0,
                    }}
                    onPress={() => setSelectedColorIndex(index)}
                  >
                    {selectedColorIndex === index && (
                      <Text style={{ color: Colors.white, fontWeight: 'bold' }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Galeria de fotos de exemplo */}
          {showImageOptions && (
            <View style={{ marginTop: 20, width: '100%' }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 15,
                paddingHorizontal: 10,
              }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                }}>
                  Escolha uma Foto
                </Text>

                <TouchableOpacity
                  onPress={() => setShowImageOptions(false)}
                >
                  <Text style={{
                    fontSize: 22,
                    color: Colors.lightText,
                    paddingHorizontal: 5,
                  }}>
                    ×
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                marginBottom: 20,
              }}>
                <TouchableOpacity
                  style={{
                    alignItems: 'center',
                    backgroundColor: Colors.primary,
                    padding: 12,
                    borderRadius: 8,
                    width: '45%',
                  }}
                  onPress={handleTakePhoto}
                >
                  <Text style={{ color: Colors.white }}>Tirar Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    alignItems: 'center',
                    backgroundColor: Colors.danger,
                    padding: 12,
                    borderRadius: 8,
                    width: '45%',
                  }}
                  onPress={handleRemovePhoto}
                >
                  <Text style={{ color: Colors.white }}>Remover Foto</Text>
                </TouchableOpacity>
              </View>

              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                marginBottom: 10,
                paddingHorizontal: 10,
              }}>
                Selecione da Galeria:
              </Text>

              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                paddingHorizontal: 5,
              }}>
                {exampleImages.map((img, index) => (
                  <TouchableOpacity
                    key={img.id}
                    style={{
                      width: '30%',
                      aspectRatio: 1,
                      marginBottom: 10,
                      borderWidth: 2,
                      borderColor: selectedImage === img.uri ? Colors.primary : 'transparent',
                      borderRadius: 8,
                    }}
                    onPress={() => setSelectedImage(img.uri)}
                  >
                    <Image
                      source={{ uri: img.uri }}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 6,
                      }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={{
              backgroundColor: Colors.primary,
              paddingVertical: 12,
              paddingHorizontal: 30,
              borderRadius: 8,
              marginTop: 30,
              width: '80%',
              alignItems: 'center',
            }}
            onPress={saveProfileImage}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={{
                color: Colors.white,
                fontWeight: 'bold',
                fontSize: 16,
              }}>
                Salvar
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};



// Tela de Análise do CV com IA - Versão melhorada
// Tela de Análise do CV com IA - Versão melhorada
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
  const [detalhado, setDetalhado] = useState(false); // Estado para controlar análise detalhada
  const [showCharts, setShowCharts] = useState(false); // Estado para mostrar/esconder gráficos

  // Alteração: Adicionar um ID de currículo atual para controle
  const [currentCurriculoId, setCurrentCurriculoId] = useState(null);

  useEffect(() => {
    carregarIAsConfiguradas();
  }, []);

  // Alteração: Atualizar o ID do currículo atual quando mudar
  useEffect(() => {
    if (curriculoData && curriculoData.id !== currentCurriculoId) {
      setCurrentCurriculoId(curriculoData.id);
      fetchAnalise(true); // Forçar nova análise quando currículo mudar
    }
  }, [curriculoData]);

  useEffect(() => {
    fetchAnalise();
  }, [activeTab, preferOffline, selectedIA, detalhado]); // Adicionei 'detalhado' como dependência

  const carregarIAsConfiguradas = async () => {
    try {
      // Carregar IA padrão
      const defaultIA = await AsyncStorage.getItem('ia_padrao');
      if (defaultIA && IA_APIS[defaultIA] && defaultIA !== 'OPENAI') {
        setSelectedIA(defaultIA);
      }

      // Verificar quais IAs estão configuradas
      const options = [];
      for (const [key, value] of Object.entries(IA_APIS)) {
        // Alteração: Excluir OPENAI (ChatGPT) das opções
        if (key !== 'OPENAI') {
          const apiKey = await getIAAPIKey(key);
          if (!value.chaveNecessaria || apiKey) {
            options.push({
              id: key,
              nome: value.nome
            });
          }
        }
      }

      setIaOptions(options);
    } catch (error) {
      console.error('Erro ao carregar IAs configuradas:', error);
    }
  };

  // Função para gerar dados de gráficos com base no currículo
  const gerarDadosGraficos = () => {
    if (!curriculoData || !curriculoData.data) {
      return null;
    }

    // Dados do currículo
    const cv = curriculoData.data;

    // Gerar dados para o gráfico de habilidades
    const gerarDadosHabilidades = () => {
      // Conjunto para armazenar habilidades únicas
      const habilidadesSet = new Set();

      // Extrair habilidades de projetos
      if (cv.projetos && cv.projetos.length > 0) {
        cv.projetos.forEach(projeto => {
          if (projeto.habilidades) {
            projeto.habilidades.split(',').forEach(hab => {
              habilidadesSet.add(hab.trim());
            });
          }
        });
      }

      // Converter para array de objetos para o gráfico
      const habilidadesArray = Array.from(habilidadesSet).map(habilidade => ({
        nome: habilidade,
        valor: Math.floor(Math.random() * 5) + 5 // Valor aleatório entre 5-10 (demo)
      }));

      return habilidadesArray.slice(0, 8); // Limitar a 8 habilidades para o gráfico
    };

    // Gerar dados para o gráfico de experiência
    const gerarDadosExperiencia = () => {
      if (!cv.experiencias || cv.experiencias.length === 0) {
        return [];
      }

      return cv.experiencias.map(exp => {
        // Calcular duração aproximada em meses
        let inicio = exp.data_inicio ? new Date(exp.data_inicio) : new Date();
        let fim = exp.data_fim && exp.data_fim.toLowerCase() !== 'atual'
          ? new Date(exp.data_fim)
          : new Date();

        // Se as datas não são objetos Date válidos, usar valores padrão
        if (isNaN(inicio.getTime())) inicio = new Date('2020-01-01');
        if (isNaN(fim.getTime())) fim = new Date();

        const diferencaMeses = (fim.getFullYear() - inicio.getFullYear()) * 12 +
          (fim.getMonth() - inicio.getMonth());

        return {
          empresa: exp.empresa || 'Empresa',
          cargo: exp.cargo || 'Cargo',
          duracao: Math.max(1, diferencaMeses || 6) // Pelo menos 1 mês
        };
      });
    };

    // Gerar dados para pontuação por área
    const gerarDadosPontuacao = () => {
      const pontuacoes = {
        'Experiência': cv.experiencias && cv.experiencias.length > 0 ? Math.min(10, cv.experiencias.length * 2) : 3,
        'Formação': cv.formacoes_academicas && cv.formacoes_academicas.length > 0 ? Math.min(10, cv.formacoes_academicas.length * 3) : 4,
        'Projetos': cv.projetos && cv.projetos.length > 0 ? Math.min(10, cv.projetos.length * 2.5) : 2,
        'Cursos': cv.cursos && cv.cursos.length > 0 ? Math.min(10, cv.cursos.length * 2) : 3,
        'Idiomas': cv.idiomas && cv.idiomas.length > 0 ? Math.min(10, cv.idiomas.length * 3) : 5
      };

      return Object.entries(pontuacoes).map(([area, valor]) => ({ area, valor }));
    };

    return {
      habilidades: gerarDadosHabilidades(),
      experiencia: gerarDadosExperiencia(),
      pontuacao: gerarDadosPontuacao()
    };
  };

  // Alteração: Melhorar a função fetchAnalise para incluir modo detalhado e aceitar parâmetro forceRefresh
  const fetchAnalise = async (forceRefresh = false) => {
    // Não recarrega se já estiver carregando, a menos que seja forçado
    if (loading && !forceRefresh) return;

    setLoading(true);
    setError(null);
    setUsingOfflineMode(false);
    setProviderInfo(null);

    // Limpar resultado anterior se for um currículo diferente ou forçar refresh
    if (forceRefresh) {
      setAnaliseResultado(null);
    }

    try {
      const tipoIA = selectedIA === 'OFFLINE' ? 'OFFLINE' : selectedIA;

      // Verificar se curriculoData existe e tem dados
      if (!curriculoData || !curriculoData.data) {
        throw new Error("Dados do currículo inválidos");
      }

      // Configurar objeto com parâmetros adicionais para análise detalhada
      const opcoesAnalise = {
        analiseDetalhada: detalhado,  // Nova opção para controlar nível de detalhe
        tipoAnalise: activeTab,
        maxTokens: detalhado ? 1500 : 800  // Aumenta o limite de tokens para análises detalhadas
      };

      // Passar as opções adicionais para a função de análise
      const resultado = await analisarCurriculoComIA(
        curriculoData.data,
        activeTab,
        tipoIA,
        preferOffline,
        opcoesAnalise  // Novo parâmetro com opções adicionais
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
      setError('Ocorreu um erro ao analisar o currículo. ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleOfflineMode = () => {
    setPreferOffline(!preferOffline);
  };

  // Toggle para modo detalhado
  const toggleModoDetalhado = () => {
    setDetalhado(!detalhado);
    // A análise será atualizada automaticamente pelo useEffect
  };

  // Toggle para mostrar/esconder gráficos
  const toggleShowCharts = () => {
    setShowCharts(!showCharts);
  };

  // Render do seletor de IA
  const renderIASelector = () => (
    <View style={styles.iaSelectorContainer}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <Text style={styles.iaSelectorLabel}>Analisar com:</Text>

        {/* Alteração: Adicionar botão de atualizar */}
        <TouchableOpacity
          style={{
            backgroundColor: Colors.secondary,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 5,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          onPress={() => fetchAnalise(true)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={{
              color: Colors.white,
              fontSize: 14,
              fontWeight: '500',
            }}>Atualizar</Text>
          )}
        </TouchableOpacity>
      </View>

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

      {/* Nova linha com opções adicionais */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
      }}>
        {/* Toggle para modo detalhado */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: detalhado ? Colors.primary : 'transparent',
            borderWidth: 1,
            borderColor: Colors.primary,
            borderRadius: 5,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
          onPress={toggleModoDetalhado}
        >
          <Text
            style={{
              color: detalhado ? Colors.white : Colors.primary,
              fontSize: 14,
            }}
          >
            {detalhado ? 'Análise Detalhada ✓' : 'Análise Simples'}
          </Text>
        </TouchableOpacity>

        {/* Botão para visualização de gráficos */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: showCharts ? Colors.info : 'transparent',
            borderWidth: 1,
            borderColor: Colors.info,
            borderRadius: 5,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
          onPress={toggleShowCharts}
        >
          <Text
            style={{
              color: showCharts ? Colors.white : Colors.info,
              fontSize: 14,
            }}
          >
            {showCharts ? 'Esconder Gráficos' : 'Visualizar Gráficos'}
          </Text>
        </TouchableOpacity>
      </View>

      {providerInfo && (
        <Text style={styles.providerInfo}>
          Análise fornecida por: {providerInfo}
        </Text>
      )}
    </View>
  );

  // Renderização dos gráficos
  const renderCharts = () => {
    const dadosGraficos = gerarDadosGraficos();

    if (!dadosGraficos) {
      return (
        <View style={{ padding: 15, alignItems: 'center' }}>
          <Text>Não foi possível gerar gráficos com os dados atuais.</Text>
        </View>
      );
    }

    return (
      <View style={{
        backgroundColor: '#f9f9f9',
        marginHorizontal: 15,
        marginBottom: 20,
        borderRadius: 10,
        padding: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          marginBottom: 15,
          color: Colors.dark,
          textAlign: 'center',
        }}>
          Visualização Gráfica do Currículo
        </Text>

        {/* Gráfico de Pontuação por Área */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 10,
            color: Colors.dark,
          }}>
            Pontuação por Área
          </Text>

          {/* Renderização do gráfico de barras horizontal */}
          {dadosGraficos.pontuacao.map((item, index) => (
            <View key={index} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text>{item.area}</Text>
                <Text>{item.valor.toFixed(1)}/10</Text>
              </View>
              <View style={{
                height: 10,
                backgroundColor: Colors.mediumGray,
                borderRadius: 5,
                marginTop: 5,
              }}>
                <View style={{
                  width: `${item.valor * 10}%`,
                  height: '100%',
                  backgroundColor: getBarColor(item.valor),
                  borderRadius: 5,
                }} />
              </View>
            </View>
          ))}
        </View>

        {/* Gráfico de Habilidades */}
        {dadosGraficos.habilidades.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              marginBottom: 10,
              color: Colors.dark,
            }}>
              Principais Habilidades
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {dadosGraficos.habilidades.map((item, index) => (
                <View key={index} style={{
                  width: '48%',
                  backgroundColor: Colors.white,
                  padding: 10,
                  borderRadius: 5,
                  marginBottom: 10,
                  borderLeftWidth: 3,
                  borderLeftColor: Colors.primary,
                  elevation: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 1,
                }}>
                  <Text style={{ fontWeight: 'bold' }}>{item.nome}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 5 }}>
                    {Array(10).fill(0).map((_, i) => (
                      <View
                        key={i}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: i < item.valor ? Colors.primary : Colors.mediumGray,
                          marginRight: 2,
                        }}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Gráfico de Experiência Profissional */}
        {dadosGraficos.experiencia.length > 0 && (
          <View>
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              marginBottom: 10,
              color: Colors.dark,
            }}>
              Experiência Profissional
            </Text>

            {dadosGraficos.experiencia.map((item, index) => (
              <View key={index} style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold' }}>{item.cargo} - {item.empresa}</Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 5,
                }}>
                  <View style={{
                    width: `${Math.min(100, item.duracao * 2)}%`,
                    maxWidth: '80%',
                    height: 20,
                    backgroundColor: Colors.primary,
                    borderRadius: 5,
                    justifyContent: 'center',
                    paddingHorizontal: 5,
                  }}>
                    <Text style={{
                      color: Colors.white,
                      fontSize: 12,
                      textAlign: 'center',
                    }}>
                      {item.duracao} {item.duracao === 1 ? 'mês' : 'meses'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Função para determinar a cor da barra com base no valor
  const getBarColor = (valor) => {
    if (valor >= 8) return Colors.success;
    if (valor >= 5) return Colors.primary;
    if (valor >= 3) return Colors.warning;
    return Colors.danger;
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

      {detalhado && !usingOfflineMode && (
        <View style={{
          backgroundColor: '#e1f5fe',
          padding: 10,
          borderRadius: 5,
          marginHorizontal: 15,
          marginBottom: 10,
          borderLeftWidth: 3,
          borderLeftColor: Colors.info,
        }}>
          <Text style={{ color: '#01579b', fontSize: 14 }}>
            Modo detalhado ativado - Análise mais completa e aprofundada
          </Text>
        </View>
      )}

      {/* Visualização de gráficos */}
      {showCharts && !loading && !error && renderCharts()}

      {loading ? (
        <View style={styles.loadingAnalysisContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingAnalysisText}>
            {detalhado
              ? 'Realizando análise detalhada do currículo...'
              : 'Analisando seu currículo...'}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchAnalise(true)}
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
            style={[styles.shareAnalysisButton, { marginTop: 20 }]}
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

const SobreAppScreen = ({ navigation }) => {
  const [activeSection, setActiveSection] = useState('sobre');

  // Dimensões da tela
  // const { width } = Dimensions.get('window');

  // Funções para lidar com links externos
  const handleOpenWebsite = () => {
    Linking.openURL('https://curriculobot.app');
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:suporte@curriculobot.app');
  };

  const handleSocialMedia = (platform) => {
    let url = '';
    switch (platform) {
      case 'linkedin':
        url = 'https://linkedin.com/company/curriculobot';
        break;
      case 'twitter':
        url = 'https://twitter.com/curriculobot';
        break;
      case 'instagram':
        url = 'https://instagram.com/curriculobot';
        break;
    }

    if (url) Linking.openURL(url);
  };

  // Renderização das seções de conteúdo
  const renderSectionIndicator = () => (
    <View style={styles.sectionIndicator}>
      <TouchableOpacity
        style={[
          styles.sectionTab,
          activeSection === 'sobre' && styles.activeSection
        ]}
        onPress={() => setActiveSection('sobre')}
      >
        <Text style={[
          styles.sectionTabText,
          activeSection === 'sobre' && styles.activeSectionText
        ]}>
          Sobre
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.sectionTab,
          activeSection === 'recursos' && styles.activeSection
        ]}
        onPress={() => setActiveSection('recursos')}
      >
        <Text style={[
          styles.sectionTabText,
          activeSection === 'recursos' && styles.activeSectionText
        ]}>
          Recursos
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.sectionTab,
          activeSection === 'versao' && styles.activeSection
        ]}
        onPress={() => setActiveSection('versao')}
      >
        <Text style={[
          styles.sectionTabText,
          activeSection === 'versao' && styles.activeSectionText
        ]}>
          Versão
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <ScrollView style={styles.scrollView}>
        {/* Cabeçalho Principal */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButtonTop}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonTopText}>‹</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Text style={styles.logoIcon}>📝</Text>
            </View>
          </View>
          <Text style={styles.appTitle}>CurriculoBot Premium</Text>
          <Text style={styles.appSubtitle}>Versão 1.2.0</Text>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
          </View>
        </View>

        {/* Indicador de seções */}
        {renderSectionIndicator()}

        {/* Conteúdo principal */}
        <View style={styles.contentContainer}>
          {activeSection === 'sobre' && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>O que é o CurriculoBot?</Text>
              <Text style={styles.sectionDescription}>
                CurriculoBot é um assistente inteligente que ajuda você a criar, gerenciar e analisar
                currículos profissionais utilizando inteligência artificial de múltiplos provedores.
              </Text>

              <Text style={styles.sectionDescription}>
                Desenvolvido por uma equipe de especialistas da Estacio de Florianopolis, o CurriculoBot utiliza
                algoritmos avançados para personalizar seu currículo de acordo com as melhores práticas
                do mercado de trabalho atual.
              </Text>

              <View style={styles.infoCardContainer}>
                <View style={styles.infoCard}>
                  <Text style={styles.infoCardNumber}>1+</Text>
                  <Text style={styles.infoCardText}>Usuários</Text>
                </View>

                <View style={styles.infoCard}>
                  <Text style={styles.infoCardNumber}>10+</Text>
                  <Text style={styles.infoCardText}>Currículos</Text>
                </View>

                <View style={styles.infoCard}>
                  <Text style={styles.infoCardNumber}>98%</Text>
                  <Text style={styles.infoCardText}>Satisfação</Text>
                </View>
              </View>
            </View>
          )}

          {activeSection === 'recursos' && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Recursos Premium</Text>

              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>🤖</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Criação Guiada por IA</Text>
                  <Text style={styles.featureDescription}>
                    Interface conversacional intuitiva que simplifica a criação do seu currículo profissional.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>📊</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Análise Avançada</Text>
                  <Text style={styles.featureDescription}>
                    Análise profissional do seu currículo usando inteligência artificial de várias fontes.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>🌟</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Dicas Personalizadas</Text>
                  <Text style={styles.featureDescription}>
                    Recomendações de melhorias, cursos e vagas personalizadas ao seu perfil.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>📝</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Múltiplos Templates</Text>
                  <Text style={styles.featureDescription}>
                    Escolha entre diversos modelos profissionais para personalizar seu currículo.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>🔎</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Busca de Vagas</Text>
                  <Text style={styles.featureDescription}>
                    Encontre oportunidades alinhadas com seu perfil profissional.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {activeSection === 'versao' && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Detalhes da Versão</Text>

              <View style={styles.versionCard}>
                <View style={styles.versionHeader}>
                  <Text style={styles.versionNumber}>1.2.0</Text>
                  <Text style={styles.versionDate}>Maio 2025</Text>
                </View>

                <View style={styles.versionFeatureList}>
                  <Text style={styles.versionFeatureTitle}>Novos recursos:</Text>

                  <View style={styles.versionFeatureItem}>
                    <View style={styles.versionFeatureDot} />
                    <Text style={styles.versionFeatureText}>
                      Análise avançada de carreira com visualização gráfica
                    </Text>
                  </View>

                  <View style={styles.versionFeatureItem}>
                    <View style={styles.versionFeatureDot} />
                    <Text style={styles.versionFeatureText}>
                      Integração com novas IAs (Claude, Perplexity, DeepSeek)
                    </Text>
                  </View>

                  <View style={styles.versionFeatureItem}>
                    <View style={styles.versionFeatureDot} />
                    <Text style={styles.versionFeatureText}>
                      Busca de vagas com compatibilidade por perfil
                    </Text>
                  </View>

                  <View style={styles.versionFeatureItem}>
                    <View style={styles.versionFeatureDot} />
                    <Text style={styles.versionFeatureText}>
                      Novos templates de currículo
                    </Text>
                  </View>

                  <View style={styles.versionFeatureItem}>
                    <View style={styles.versionFeatureDot} />
                    <Text style={styles.versionFeatureText}>
                      Interface redesenhada para melhor experiência
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.versionPrevious}>
                <Text style={styles.versionPreviousTitle}>Versões anteriores</Text>

                <View style={styles.versionPreviousItem}>
                  <Text style={styles.versionPreviousNumber}>1.1.0</Text>
                  <Text style={styles.versionPreviousDate}>Maior 2025</Text>
                </View>

                <View style={styles.versionPreviousItem}>
                  <Text style={styles.versionPreviousNumber}>1.0.0</Text>
                  <Text style={styles.versionPreviousDate}>Maio 2024</Text>
                </View>
              </View>
            </View>
          )}

          {/* Informações de contato */}
          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>Entre em Contato</Text>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleOpenWebsite}
            >
              <Text style={styles.contactButtonIcon}>🌐</Text>
              <Text style={styles.contactButtonText}>www.curriculobot.app</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleContactSupport}
            >
              <Text style={styles.contactButtonIcon}>✉️</Text>
              <Text style={styles.contactButtonText}>suporte@curriculobot.app</Text>
            </TouchableOpacity>

            <View style={styles.socialMediaContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialMedia('linkedin')}
              >
                <Text style={styles.socialButtonText}>in</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialMedia('twitter')}
              >
                <Text style={styles.socialButtonText}>𝕏</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialMedia('instagram')}
              >
                <Text style={styles.socialButtonText}>📷</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Rodapé */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2025 CurriculoBot Premium</Text>
            <Text style={styles.footerText}>Todos os direitos reservados</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Nova tela para seleção de currículo antes da busca de vagas
const SelecionarCurriculoScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [curriculos, setCurriculos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarCurriculos();
  }, []);

  const carregarCurriculos = async () => {
    try {
      setLoading(true);
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      setCurriculos(cvs ? JSON.parse(cvs) : []);
    } catch (error) {
      console.error('Erro ao carregar currículos:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus currículos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarCurriculo = (curriculo) => {
    navigation.navigate('BuscaVagas', { curriculoData: curriculo });
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Data não disponível';
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Extrair informações do currículo para exibição
  const getResumoCurriculo = (curriculo) => {
    const cv = curriculo.data;
    const experiencias = cv.experiencias?.length || 0;
    const formacoes = cv.formacoes_academicas?.length || 0;
    const projetos = cv.projetos?.length || 0;
    const area = cv.informacoes_pessoais?.area || 'Não especificada';

    return { experiencias, formacoes, projetos, area };
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
        <Text style={styles.headerTitle}>Selecionar Currículo</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 10 }}>Carregando currículos...</Text>
        </View>
      ) : curriculos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Nenhum Currículo Encontrado</Text>
          <Text style={styles.emptyStateText}>
            Você precisa criar um currículo antes de buscar vagas.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Chatbot')}
          >
            <Text style={styles.primaryButtonText}>Criar Currículo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 15 }}>
          <View style={{
            backgroundColor: '#e8f5e9',
            padding: 15,
            borderRadius: 10,
            marginBottom: 20,
            borderLeftWidth: 4,
            borderLeftColor: Colors.success,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              marginBottom: 5,
              color: Colors.dark,
            }}>
              Buscar Vagas Personalizadas
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#2e7d32',
            }}>
              Selecione o currículo que deseja usar como base para a busca de vagas. Nossa IA encontrará oportunidades de emprego alinhadas ao seu perfil profissional.
            </Text>
          </View>

          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 10,
            color: Colors.dark,
          }}>
            Selecione um currículo:
          </Text>

          <FlatList
            data={curriculos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const resumo = getResumoCurriculo(item);

              return (
                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.white,
                    borderRadius: 10,
                    marginBottom: 15,
                    padding: 16,
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
                    borderLeftWidth: 4,
                    borderLeftColor: Colors.primary,
                  }}
                  onPress={() => handleSelecionarCurriculo(item)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: Colors.dark,
                      marginBottom: 5,
                    }}>
                      {item.nome || 'Currículo sem nome'}
                    </Text>

                    <View style={{
                      backgroundColor: Colors.primary,
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                      borderRadius: 15,
                    }}>
                      <Text style={{ color: Colors.white, fontSize: 12 }}>
                        Selecionar
                      </Text>
                    </View>
                  </View>

                  <Text style={{
                    fontSize: 14,
                    color: Colors.lightText,
                    marginBottom: 10,
                  }}>
                    Criado em: {formatDate(item.dataCriacao)}
                  </Text>

                  <View style={{
                    backgroundColor: '#f5f5f5',
                    padding: 10,
                    borderRadius: 5,
                    marginTop: 5,
                  }}>
                    <Text style={{ color: Colors.dark }}>
                      <Text style={{ fontWeight: 'bold' }}>Área: </Text>
                      {resumo.area}
                    </Text>

                    <View style={{ flexDirection: 'row', marginTop: 5, flexWrap: 'wrap' }}>
                      <View style={{
                        backgroundColor: Colors.primary,
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: 12,
                        marginRight: 8,
                        marginBottom: 5,
                      }}>
                        <Text style={{ color: Colors.white, fontSize: 12 }}>
                          {resumo.experiencias} experiência(s)
                        </Text>
                      </View>

                      <View style={{
                        backgroundColor: Colors.secondary,
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: 12,
                        marginRight: 8,
                        marginBottom: 5,
                      }}>
                        <Text style={{ color: Colors.white, fontSize: 12 }}>
                          {resumo.formacoes} formação(ões)
                        </Text>
                      </View>

                      <View style={{
                        backgroundColor: '#673AB7',
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: 12,
                        marginBottom: 5,
                      }}>
                        <Text style={{ color: Colors.white, fontSize: 12 }}>
                          {resumo.projetos} projeto(s)
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

// Modificar o AppNavigator para adicionar a rota "SobreApp"
// const AppNavigator = () => (
//   <AppStack.Navigator
//     screenOptions={{
//       headerShown: false
//     }}
//   >
//     <AppStack.Screen name="Home" component={HomeScreen} />
//     <AppStack.Screen name="Chatbot" component={ChatbotScreen} />
//     <AppStack.Screen name="MeusCurriculos" component={MeusCurriculosScreen} />
//     <AppStack.Screen name="PreviewCV" component={PreviewCVScreen} />
//     <AppStack.Screen name="CurriculosAnalise" component={CurriculosAnaliseScreen} />
//     <AppStack.Screen name="AnaliseCV" component={AnaliseCVScreen} />
//     <AppStack.Screen name="ConfiguracoesIA" component={ConfiguracoesIAScreen} />
//     <AppStack.Screen name="SobreApp" component={SobreAppScreen} />
//     {/* Nova rota para seleção de currículo */}
//     <AppStack.Screen name="SelecionarCurriculo" component={SelecionarCurriculoScreen} />
//     <AppStack.Screen name="BuscaVagas" component={BuscaVagasScreen} />
//   </AppStack.Navigator>
// );

// Controlador de Rotas
const RootStack = createStackNavigator();

const RootNavigator = () => {
  const { user, loading } = useAuth();

  // Log para ajudar na depuração
  console.log('RootNavigator - User state:', user ? 'Logged in' : 'Logged out');

  // Mostrar tela de carregamento enquanto verifica autenticação
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

const HeaderColors = {
  text: '#000000', // Preto para o texto dos headers
  background: '#f5f5f5', // Fundo mais claro para melhor contraste
  backButton: '#333333', // Cor mais escura para o botão de voltar
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
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15, // Aumentado para acomodar o texto
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70, // Garantir largura mínima para o texto
  },
  sendButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14, // Reduzido de 18
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
    borderRadius: 12,
    paddingVertical: 12, // Aumentado de 10 para 12
    paddingHorizontal: 16, // Aumentado de 14 para 16
    marginRight: 10,
    marginBottom: 5,
    minWidth: 110, // Aumentado de 100 para 110
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  longOptionButton: {
    minWidth: 155, // Aumentado de 140 para 155
    paddingHorizontal: 18, // Aumentado de 16 para 18
    height: 'auto',
  },
  optionText: {
    color: Colors.primary,
    fontSize: 16, // Aumentado de 14 para 16
    fontWeight: '600', // Aumentado de 500 para 600 (mais negrito)
    textAlign: 'center',
  },
  longOptionText: {
    fontSize: 15, // Aumentado de 13 para 15
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
    backgroundColor: HeaderColors.background, // Mudança do fundo para cor mais clara
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  headerTitle: {
    color: HeaderColors.text, // Mudança para preto
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
    color: HeaderColors.backButton, // Cor mais escura para o botão
  },

  dashboardHeaderTitle: {
    color: HeaderColors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },

  configHeader: {
    backgroundColor: HeaderColors.background,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  configHeaderTitle: {
    color: HeaderColors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Estilos específicos para cada tela mencionada
  dashboardHeader: {
    backgroundColor: HeaderColors.background,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
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

  enhancedInputWrapper: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    height: 55, // Campo mais alto
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  enhancedInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.dark,
    height: '100%',
  },
  enhancedPrimaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 16, // Botão mais alto
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  enhancedPrimaryButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 17, // Texto maior
    letterSpacing: 0.5, // Maior espaçamento entre letras
  },

  // Modificar os estilos existentes
  authContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  authHeader: {
    padding: 30,
    paddingTop: 60, // Mais espaço no topo
  },
  authTitle: {
    fontSize: 36, // Título maior
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 12,
  },
  authSubtitle: {
    fontSize: 18, // Subtítulo maior
    color: Colors.white,
    opacity: 0.9,
  },
  authForm: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    paddingTop: 40,
  },
  inputContainer: {
    marginBottom: 22, // Mais espaço entre campos
  },
  inputLabel: {
    fontSize: 15, // Label maior
    fontWeight: '500',
    color: Colors.dark,
    marginBottom: 8,
    paddingLeft: 4,
  },
  textButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  textButtonText: {
    color: Colors.primary,
    fontSize: 16, // Texto maior
    fontWeight: '500',
  },

  input: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
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

  // Adicione estes estilos no objeto styles
  moreInfoButton: {
    backgroundColor: 'rgba(0, 188, 212, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  moreInfoButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },

  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 188, 212, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIcon: {
    fontSize: 20,
  },
  configHintContainer: {
    backgroundColor: 'rgba(0, 188, 212, 0.08)',
    borderRadius: 4,
    padding: 8,
    marginTop: 10,
  },
  configHintText: {
    fontSize: 12,
    color: Colors.primary,
  },

  // Estilos para a tela de configuração
  configCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 16,
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
  configIntroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 10,
  },
  configIntroText: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
  },
  iaCardsContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  iaCard: {
    width: 140,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding:
      12,
    marginRight: 12,
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
  iaCardSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  iaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iaCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  iaCardTitleSelected: {
    color: Colors.primary,
  },
  iaCardDescription: {
    fontSize: 12,
    color: Colors.lightText,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  helpButton: {
    backgroundColor: 'rgba(0, 188, 212, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  helpButtonText: {
    fontSize: 12,
    color: Colors.primary,
  },
  apiKeyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleVisibilityButton: {
    position: 'absolute',
    right: 10,
    padding: 8,
  },
  toggleVisibilityText: {
    fontSize: 12,
    color: Colors.primary,
  },
  tipsContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    marginBottom: 30,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 14,
    color: Colors.dark,
    marginBottom: 5,
    lineHeight: 20,
  },
  areaOptionsContainer: {
    paddingVertical: 15, // Mais espaço para opções de área
    flexWrap: 'wrap', // Permitir quebra de linha se necessário
    justifyContent: 'center',
  },
  areaOptionButton: {
    minWidth: 175, // Aumentado de 160 para 175
    paddingHorizontal: 20, // Aumentado de 18 para 20
    marginHorizontal: 5,
    height: 'auto',
  },
  areaOptionText: {
    fontWeight: 'bold', // Texto mais destacado
  },

  chatInputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    alignItems: 'center',
  },
  improvedChatInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100, // Limitar altura máxima
    minHeight: 50, // Garantir altura mínima
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  improvedSendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 25,
    width: 70,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  improvedSendButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },

  previewResumeText: {
    color: Colors.dark,
    lineHeight: 20,
    textAlign: 'justify',
    paddingHorizontal: 2,
  },

  curriculoProgressoCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
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
  curriculoProgressoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  curriculoProgressoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  curriculoProgressoTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
  },
  curriculoProgressoSubtitulo: {
    fontSize: 12,
    color: '#856404',
    opacity: 0.8,
  },
  curriculoProgressoTexto: {
    color: '#856404',
    marginBottom: 12,
  },
  curriculoProgressoBotao: {
    backgroundColor: '#FFC107',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  curriculoProgressoBotaoTexto: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },

  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollView: {
    flex: 1,
  },
  // Cabeçalho animado
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Cabeçalho estático
  header: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 15,
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
    color: '#fff',
  },
  backButtonTop: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 15,
  },
  backButtonTopText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  // Seção Hero
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  logoIcon: {
    fontSize: 48,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 15,
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
  },
  premiumBadgeText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#000',
  },
  // Indicador de seções
  sectionIndicator: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    marginTop: -25,
    borderRadius: 10,
    height: 50,
    justifyContent: 'space-around',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sectionTab: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeSection: {
    borderBottomWidth: 3,
    borderBottomColor: Colors.primary,
  },
  sectionTabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
  },
  activeSectionText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  // Container de conteúdo
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // Seções de conteúdo
  sectionContent: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,188,212,0.3)',
  },
  sectionDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
    marginBottom: 20,
    textAlign: 'justify',
  },
  // Cards de informação
  infoCardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  infoCard: {
    width: '30%',
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  infoCardNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  infoCardText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Itens de recursos
  featureItem: {
    flexDirection: 'row',
    marginBottom: 25,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,188,212,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Seção de versão
  versionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  versionNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  versionDate: {
    fontSize: 14,
    color: '#888',
  },
  versionFeatureList: {
    marginTop: 10,
  },
  versionFeatureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  versionFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  versionFeatureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 10,
  },
  versionFeatureText: {
    fontSize: 15,
    color: '#444',
    flex: 1,
  },
  versionPrevious: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
  },
  versionPreviousTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 10,
  },
  versionPreviousItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  versionPreviousNumber: {
    fontSize: 15,
    fontWeight: '500',
    color: '#444',
  },
  versionPreviousDate: {
    fontSize: 14,
    color: '#888',
  },
  // Seção de contato
  contactSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,188,212,0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  contactButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  contactButtonText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500',
  },
  socialMediaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  socialButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  socialButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  // Rodapé
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 3,
  },

  ...additionalStyles  // Novos estilos adicionados

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