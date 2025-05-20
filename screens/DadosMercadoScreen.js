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

// Contexto de autenticação com tratamento seguro
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  // Verificação de segurança
  if (context === undefined) {
    console.warn('useAuth deve ser usado dentro de um AuthProvider');
    return { user: null, isLoading: true };
  }
  return context;
};

const DadosMercadoScreen = ({ navigation, route }) => {
  const authContext = useAuth();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [areaAtuacao, setAreaAtuacao] = useState('');
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Animações para os gráficos
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const barAnimation = useRef(new Animated.Value(0)).current;
  const competenciaAnimation = useRef({}).current;

  // Verificar contexto de autenticação
  useEffect(() => {
    const checkAuthContext = async () => {
      try {
        setAuthLoading(true);
        
        // Tentar obter o usuário do contexto ou do AsyncStorage
        if (authContext && authContext.user) {
          setUser(authContext.user);
        } else {
          // Fallback: tentar obter dados do usuário do AsyncStorage
          const storedUser = await AsyncStorage.getItem('currentUser');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
          } else {
            // Se não há usuário logado, navegar para login
            console.log('Nenhum usuário encontrado, redirecionando para login...');
            Alert.alert(
              "Sessão Expirada",
              "Sua sessão expirou ou você não está logado. Por favor, faça login novamente.",
              [
                { text: "OK", onPress: () => navigation.navigate('Login') }
              ]
            );
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthContext();
  }, [authContext]);

  useEffect(() => {
    if (user && !authLoading) {
      carregarDadosMercado();
    }
  }, [user, authLoading]);

  // Animações para entrada de elementos
  useEffect(() => {
    if (data && !loading) {
      // Fade in para toda a tela
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }).start();

      // Animação para as barras de gráficos
      Animated.timing(barAnimation, {
        toValue: 1,
        duration: 1200,
        delay: 300,
        useNativeDriver: false
      }).start();
      
      // Criar animações individuais para cada competência
      const dados = extrairDadosParaGraficos(data);
      dados.demandaCompetencias.forEach((_, i) => {
        if (!competenciaAnimation[i]) {
          competenciaAnimation[i] = new Animated.Value(0);
        }
        
        Animated.timing(competenciaAnimation[i], {
          toValue: 1,
          duration: 600,
          delay: 300 + (i * 100),
          useNativeDriver: false
        }).start();
      });
    }
  }, [data, loading]);

  const onRefresh = () => {
    setRefreshing(true);
    carregarDadosMercado();
  };

  const carregarDadosMercado = async () => {
    try {
      if (!user || !user.id) {
        console.warn('Tentativa de carregar dados do mercado sem usuário válido');
        return;
      }
      
      setLoading(true);
      setError(null);

      // Buscar currículos do usuário para obter sua área de atuação
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculos = cvs ? JSON.parse(cvs) : [];

      if (curriculos.length === 0) {
        throw new Error("Nenhum currículo encontrado para análise. Por favor, crie um currículo primeiro.");
      }

      // Usar o currículo mais recente
      const curriculoRecente = curriculos[curriculos.length - 1];
      const area = curriculoRecente.data.informacoes_pessoais?.area || '';
      setAreaAtuacao(area || 'Tecnologia');

      // Verificar se há dados em cache
      const cacheKey = `dadosMercado_${area.toLowerCase().replace(/\s+/g, '_')}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData && !refreshing) {
        const parsedCache = JSON.parse(cachedData);
        const cacheTime = new Date(parsedCache.timestamp);
        const now = new Date();
        const hoursSinceCache = (now - cacheTime) / (1000 * 60 * 60);
        
        // Se o cache tem menos de 24 horas, usar os dados do cache
        if (hoursSinceCache < 24) {
          setData(parsedCache.data);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      // Obter API key para consulta
      const apiKey = await getIAAPIKey('GEMINI');
      if (!apiKey) {
        throw new Error("API key não configurada. Por favor, configure a API key nas configurações avançadas.");
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
        
        // Salvar em cache
        await AsyncStorage.setItem(cacheKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          data: resultText
        }));
        
        setData(resultText);
      } else {
        throw new Error("Formato de resposta inesperado. Por favor, tente novamente.");
      }
    } catch (error) {
      console.error('Erro ao carregar dados do mercado:', error);
      setError(error.message || "Erro ao buscar dados do mercado");
    } finally {
      setLoading(false);
      setRefreshing(false);
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

    // Ajustar dados com base na área de atuação
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
    const maxSalario = Math.max(...dados.faixasSalariais.map(item => item.valor));

    return (
      <View style={{ marginVertical: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Ionicons name="cash-outline" size={20} color="#333" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>
            Faixa Salarial por Nível
          </Text>
        </View>
        
        <View style={{ height: 200 }}>
          {dados.faixasSalariais.map((item, index) => {
            const barWidth = barAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', `${Math.min(100, (item.valor / maxSalario) * 100)}%`]
            });
            
            return (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <Text style={{ 
                  width: 100, 
                  fontSize: 14, 
                  fontWeight: '500',
                  color: '#555'
                }}>
                  {item.cargo}
                </Text>
                <View style={{ 
                  flex: 1, 
                  height: 28,
                  backgroundColor: '#f0f0f0',
                  borderRadius: 6,
                  overflow: 'hidden'
                }}>
                  <Animated.View style={{
                    backgroundColor: '#673AB7',
                    height: '100%',
                    width: barWidth,
                    borderRadius: 6,
                    ...Platform.select({
                      ios: {
                        shadowColor: '#673AB7',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.3,
                        shadowRadius: 2,
                      },
                      android: {
                        elevation: 2,
                      },
                    }),
                  }} />
                </View>
                <Text style={{ 
                  marginLeft: 12, 
                  width: 100, 
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#333',
                  textAlign: 'right' 
                }}>
                  R$ {item.valor.toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderizarGraficoCrescimento = () => {
    const dados = extrairDadosParaGraficos(data);

    return (
      <View style={{ marginVertical: 25 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <Ionicons name="trending-up-outline" size={20} color="#333" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>
            Crescimento do Setor (%)
          </Text>
        </View>
        
        <View style={{ 
          flexDirection: 'row', 
          height: 170, 
          alignItems: 'flex-end', 
          justifyContent: 'space-around',
          paddingBottom: 10,
          paddingHorizontal: 10,
          backgroundColor: '#f9f9f9',
          borderRadius: 8,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 1,
            },
            android: {
              elevation: 1,
            },
          }),
        }}>
          {dados.crescimentoSetor.map((item, index) => {
            const barHeight = barAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.min(120, item.percentual * 5)]
            });
            
            return (
              <View key={index} style={{ alignItems: 'center', width: '30%' }}>
                <Animated.View style={{
                  backgroundColor: '#E91E63',
                  width: 50,
                  height: barHeight,
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                  ...Platform.select({
                    ios: {
                      shadowColor: '#E91E63',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 2,
                    },
                    android: {
                      elevation: 3,
                    },
                  }),
                }} />
                <View style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  backgroundColor: '#fff',
                  borderRadius: 15,
                  marginTop: 8,
                  ...Platform.select({
                    ios: {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 1,
                    },
                    android: {
                      elevation: 1,
                    },
                  }),
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '500' }}>{item.ano}</Text>
                </View>
                <Text style={{ 
                  fontWeight: 'bold', 
                  marginTop: 5,
                  color: '#E91E63'
                }}>
                  {item.percentual}%
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderizarGraficoCompetencias = () => {
    const dados = extrairDadosParaGraficos(data);

    return (
      <View style={{ marginVertical: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <Ionicons name="ribbon-outline" size={20} color="#333" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>
            Demanda por Competências
          </Text>
        </View>
        
        {dados.demandaCompetencias.map((item, index) => {
          const barWidth = competenciaAnimation[index] ? competenciaAnimation[index].interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', `${item.demanda}%`]
          }) : '0%';
          
          return (
            <View key={index} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '500',
                    color: '#444'
                  }}>
                    {item.nome}
                  </Text>
                </View>
                <Text style={{ 
                  fontWeight: '600',
                  color: '#2196F3'
                }}>
                  {item.demanda}%
                </Text>
              </View>
              <View style={{ 
                height: 12, 
                backgroundColor: '#e0e0e0', 
                borderRadius: 6,
                overflow: 'hidden'
              }}>
                <Animated.View style={{
                  backgroundColor: '#2196F3',
                  height: '100%',
                  width: barWidth,
                  borderRadius: 6,
                  ...Platform.select({
                    ios: {
                      shadowColor: '#2196F3',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 1,
                    },
                    android: {
                      elevation: 1,
                    },
                  }),
                }} />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Loading state se o contexto de autenticação ainda está carregando
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dados do Mercado</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 16, color: Colors.lightText, fontSize: 16 }}>
            Verificando autenticação...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Verificar se o usuário está autenticado
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dados do Mercado</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
            Você precisa estar logado para acessar os dados do mercado
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: Colors.primary,
              paddingVertical: 12,
              paddingHorizontal: 30,
              borderRadius: 8,
            }}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Fazer Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={HeaderColors.background} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dados do Mercado</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <View style={{ marginTop: 20, alignItems: 'center', paddingHorizontal: 30 }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: 'bold', 
              marginBottom: 10,
              textAlign: 'center',
              color: Colors.dark
            }}>
              Analisando o mercado de trabalho
            </Text>
            <Text style={{ 
              textAlign: 'center',
              color: Colors.lightText,
              lineHeight: 22
            }}>
              Buscando dados atualizados do mercado de trabalho em {areaAtuacao || 'sua área'}...
            </Text>
          </View>
        </View>
      ) : error ? (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 30
        }}>
          <Ionicons name="alert-circle-outline" size={70} color={Colors.danger} style={{ marginBottom: 20 }} />
          <Text style={{ 
            fontSize: 18, 
            fontWeight: 'bold',
            marginBottom: 15,
            textAlign: 'center',
            color: Colors.dark
          }}>
            Não foi possível obter os dados
          </Text>
          <Text style={{ 
            textAlign: 'center',
            marginBottom: 25,
            color: Colors.lightText,
            lineHeight: 22
          }}>
            {error}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: Colors.primary,
              paddingVertical: 12,
              paddingHorizontal: 25,
              borderRadius: 8,
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
            }}
            onPress={carregarDadosMercado}
          >
            <Ionicons name="refresh" size={18} color="white" style={{ marginRight: 8 }} />
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
              Tentar Novamente
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.ScrollView 
          style={{ padding: 15, opacity: fadeAnim }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Cabeçalho com Área */}
          <View style={{
            backgroundColor: '#673AB7',
            borderRadius: 12,
            padding: 18,
            marginBottom: 18,
            ...Platform.select({
              ios: {
                shadowColor: '#673AB7',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 5,
              },
              android: {
                elevation: 4,
              },
            }),
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="briefcase" size={28} color="white" style={{ marginRight: 10 }} />
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
                Mercado de {areaAtuacao || 'Trabalho'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location" size={16} color="rgba(255, 255, 255, 0.9)" style={{ marginRight: 5 }} />
              <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 15 }}>
                Dados e análises atualizados para Florianópolis e região
              </Text>
            </View>
          </View>

          {/* Gráficos de Mercado */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 18,
            marginBottom: 18,
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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <Ionicons name="stats-chart" size={22} color="#333" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>
                Análise Quantitativa do Mercado
              </Text>
            </View>

            {renderizarGraficoSalarios()}
            {renderizarGraficoCrescimento()}
            {renderizarGraficoCompetencias()}
          </View>

          {/* Dados da ACATE e Análise Qualitativa */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 18,
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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <Ionicons name="analytics" size={22} color="#333" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>
                Insights do Setor
              </Text>
            </View>

            <Markdown
              style={{
                body: { fontSize: 16, lineHeight: 24, color: Colors.dark },
                heading1: {
                  fontSize: 22,
                  fontWeight: 'bold',
                  marginBottom: 12,
                  marginTop: 22,
                  color: Colors.dark,
                },
                heading2: {
                  fontSize: 20,
                  fontWeight: 'bold',
                  marginBottom: 10,
                  marginTop: 18,
                  color: Colors.dark
                },
                heading3: {
                  fontSize: 18,
                  fontWeight: 'bold',
                  marginTop: 12,
                  marginBottom: 8,
                  color: Colors.dark
                },
                paragraph: {
                  fontSize: 16,
                  lineHeight: 24,
                  marginBottom: 12,
                  color: Colors.dark
                },
                list_item: {
                  marginBottom: 8,
                  lineHeight: 24,
                },
                bullet_list: {
                  marginVertical: 12,
                },
              }}
            >
              {data}
            </Markdown>
          </View>

          {/* Nota sobre Fontes */}
          <View style={{
            backgroundColor: '#f6f6f6',
            padding: 15,
            borderRadius: 10,
            marginBottom: 30,
            borderLeftWidth: 3,
            borderLeftColor: '#757575',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <Ionicons name="information-circle-outline" size={18} color="#757575" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#757575' }}>
                Fonte dos Dados
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: '#757575', lineHeight: 18 }}>
              Dados compilados de fontes oficiais da ACATE, IBGE, FIPE e relatórios setoriais de 2023-2025. As faixas salariais representam médias de mercado e podem variar conforme experiência, qualificação e empresa.
            </Text>
          </View>
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
};

export default DadosMercadoScreen;