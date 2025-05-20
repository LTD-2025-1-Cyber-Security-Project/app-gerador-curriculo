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

// AuthContext e useAuth com verificações de segurança
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Retorna um objeto vazio com estrutura padrão se o contexto não existir
    return { user: null, isLoading: true };
  }
  return context;
};

const DashboardScreen = ({ navigation }) => {
  const authContext = useAuth();

  // Verificação de segurança para o contexto de autenticação
  const [contextLoading, setContextLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Estados do dashboard
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

  // No useEffect de verificação do contexto
  useEffect(() => {
    const checkAuthContext = async () => {
      try {
        setContextLoading(true);

        // Tratamento defensivo do contexto
        if (authContext && typeof authContext === 'object' && authContext.user) {
          setUser(authContext.user);
        } else {
          console.log('Contexto de autenticação indisponível ou sem usuário, tentando fallback...');
          // Fallback para AsyncStorage
          try {
            const storedUser = await AsyncStorage.getItem('currentUser');
            if (storedUser) {
              const userData = JSON.parse(storedUser);
              setUser(userData);
              console.log('Usuário recuperado do AsyncStorage com sucesso');
            } else {
              console.warn('Nenhum usuário encontrado no AsyncStorage');
              // Manter user como null - a UI tratará este caso
            }
          } catch (storageError) {
            console.error('Erro ao acessar AsyncStorage:', storageError);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar contexto de autenticação:', error);
      } finally {
        setContextLoading(false);
      }
    };

    checkAuthContext();
  }, []);

  useEffect(() => {
    if (user && !contextLoading) {
      carregarDados();
      carregarCurriculos();

      // Atualizar quando a tela ganhar foco
      const unsubscribe = navigation.addListener('focus', () => {
        carregarDados();
        carregarCurriculos();
      });

      return unsubscribe;
    }
  }, [navigation, user, contextLoading]);

  // Carregar lista de currículos para o seletor de análise
  const carregarCurriculos = async () => {
    try {
      // Verificar se o usuário existe antes de continuar
      if (!user || !user.id) {
        console.log('Usuário não encontrado ao carregar currículos');
        return;
      }

      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculos = cvs ? JSON.parse(cvs) : [];
      setCurriculosList(curriculos);
    } catch (error) {
      console.error('Erro ao carregar currículos:', error);
    }
  };

  const carregarDados = async () => {
    try {
      // Verificar se o usuário existe antes de continuar
      if (!user || !user.id) {
        console.log('Usuário não encontrado ao carregar dados');
        return;
      }

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
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
      return;
    }
    navigation.navigate('Chatbot');
  };

  const navegarParaBuscarVagas = () => {
    // Verificar se o usuário existe antes de continuar
    if (!user || !user.id) {
      Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
      return;
    }

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
    }).catch(error => {
      console.error('Erro ao verificar currículos:', error);
      Alert.alert('Erro', 'Não foi possível verificar seus currículos.');
    });
  };

  // Função navegarParaAnalisarCV modificada para evitar o problema com useAuth
  const navegarParaAnalisarCV = () => {
    // Verificação de segurança mais robusta
    if (!user) {
      console.warn('Tentativa de navegar para análise de CV sem usuário válido');
      Alert.alert(
        "Sessão Expirada",
        "Sua sessão expirou ou você não está autenticado. Por favor, faça login novamente.",
        [
          {
            text: "OK",
            onPress: () => {
              // Redirecionar para login ou mostrar formulário de login
              // Para fins de desenvolvimento, apenas registro no console
              console.log('Redirecionando para login...');
            }
          }
        ]
      );
      return;
    }

    // Verificar ID do usuário de forma defensiva
    if (!user.id) {
      console.error('Usuário sem ID válido ao acessar Análise CV');
      Alert.alert('Erro', 'Informações de usuário incompletas. Tente fazer login novamente.');
      return;
    }

    // Usar try/catch para evitar exceções não tratadas
    try {
      // Verificar se há currículos antes
      AsyncStorage.getItem(`curriculos_${user.id}`)
        .then(cvs => {
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
            // Navegação segura com verificação
            if (navigation && navigation.navigate) {
              navigation.navigate('CurriculosAnalise');
            } else {
              console.error('Objeto de navegação indisponível');
              Alert.alert('Erro', 'Não foi possível navegar para a tela de análise.');
            }
          }
        })
        .catch(error => {
          console.error('Erro ao verificar currículos:', error);
          Alert.alert('Erro', 'Não foi possível verificar seus currículos: ' + error.message);
        });
    } catch (error) {
      console.error('Erro crítico ao tentar navegar para Análise CV:', error);
      Alert.alert('Erro Inesperado', 'Ocorreu um erro ao tentar acessar a análise de currículos.');
    }
  };

  const navegarParaMeusCurriculos = () => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
      return;
    }
    navigation.navigate('MeusCurriculos');
  };

  // FUNÇÃO: Realizar análise de carreira com IA
  const realizarAnaliseCarreira = async (curriculoId) => {
    try {
      // Verificar se o usuário existe antes de continuar
      if (!user || !user.id) {
        Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
        return;
      }

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
                      "Esta funcionalidade estará disponível em uma atualização futura. A análise completa poderá ser exportada em PDF.",
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

  // Loading screen se o contexto ainda está carregando
  if (contextLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 10 }}>Verificando autenticação...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Verificar se user é null antes de renderizar o conteúdo principal
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 10 }}>Usuário não autenticado</Text>
          <TouchableOpacity
            style={{
              backgroundColor: Colors.primary,
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 8,
              marginTop: 20,
            }}
            onPress={() => {
              // navigation.navigate('Login'); // Implementar navegação para login
              console.log('Navegar para login');
            }}
          >
            <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
              Fazer Login
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Renderização principal do dashboard
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

          {/* Estatísticas do usuário */}
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
              Estatísticas de {user.nome || 'Usuário'}
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
                  flexDirection: 'row',
                  justifyContent: 'center',
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
                }}
                onPress={navegarParaNovoCurriculo}
              >
                <Ionicons name="add-circle-outline" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={{ color: Colors.white, fontWeight: 'bold', fontSize: 14 }}>
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
                  flexDirection: 'row',
                  justifyContent: 'center',
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
                }}
                onPress={navegarParaAnalisarCV}
              >
                <Ionicons name="analytics-outline" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={{ color: Colors.white, fontWeight: 'bold', fontSize: 14 }}>
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
                  flexDirection: 'row',
                  justifyContent: 'center',
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
                }}
                onPress={navegarParaBuscarVagas}
              >
                <Ionicons name="search-outline" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={{ color: Colors.white, fontWeight: 'bold', fontSize: 14 }}>
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
                  flexDirection: 'row',
                  justifyContent: 'center',
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
                }}
                onPress={navegarParaMeusCurriculos}
              >
                <Ionicons name="document-text-outline" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={{ color: Colors.white, fontWeight: 'bold', fontSize: 14 }}>
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

export default DashboardScreen;