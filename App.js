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
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { Slider, Switch } from '@react-native-community/slider';
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

  useEffect(() => {
    carregarDados();
    
    // Atualizar quando a tela ganhar foco
    const unsubscribe = navigation.addListener('focus', () => {
      carregarDados();
    });
    
    return unsubscribe;
  }, [navigation]);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 10 }}>Carregando estatísticas...</Text>
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
                onPress={() => navigation.navigate('Chatbot')}
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
                onPress={() => navigation.navigate('CurriculosAnalise')}
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
                onPress={() => navigation.navigate('SelecionarCurriculo')}
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
                onPress={() => navigation.navigate('MeusCurriculos')}
              >
                <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                  Meus Currículos
                </Text>
              </TouchableOpacity>
            </View>
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
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configurações Avançadas</Text>
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
        { text: 'Sair', style: 'destructive', onPress: logout }
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
  
  // Função para exportar dados
  const exportarDados = () => {
    Alert.alert(
      'Exportar Dados',
      'Esta função permitirá exportar todos os seus dados, incluindo currículos e configurações.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Continuar', 
          onPress: () => {
            Alert.alert(
              'Simulação',
              'Em um aplicativo real, seus dados seriam exportados para um arquivo que você poderia salvar. Esta é apenas uma simulação dessa funcionalidade.',
              [{ text: 'Entendi' }]
            );
          }
        }
      ]
    );
  };
  
  // Função para mudar o tema (simulação)
  const mudarTema = () => {
    Alert.alert(
      'Mudar Tema',
      'Em um aplicativo completo, você poderia escolher entre tema claro, escuro ou usar o padrão do sistema.',
      [{ text: 'OK' }]
    );
  };
  
  // Função para alterar senha
  const alterarSenha = () => {
    // Implementação simulada de alteração de senha
    Alert.alert(
      'Alterar Senha',
      'Esta funcionalidade permitiria alterar sua senha. Em um aplicativo real, você precisaria fornecer sua senha atual e confirmar a nova senha.',
      [{ text: 'Entendi' }]
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configurações</Text>
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
        
        {/* Seção de Segurança e Privacidade */}
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
            Segurança e Privacidade
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
            <Text style={{ color: Colors.primary, fontSize: 24 }}>›</Text>
          </TouchableOpacity>
        </View>
        
        {/* Seção de Configurações Gerais */}
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
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Alterar aparência (claro/escuro)</Text>
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
    return <Text style={{fontSize: 24, color}}>🏠</Text>;
  } else if (route.name === 'Dashboard') {
    return <Text style={{fontSize: 24, color}}>📊</Text>;
  } else if (route.name === 'ConfigAv') {
    return <Text style={{fontSize: 24, color}}>🔧</Text>;
  } else if (route.name === 'Config') {
    return <Text style={{fontSize: 24, color}}>⚙️</Text>;
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
    {/* Opcionalmente adicionar esta rota para navegação direta em cenários específicos */}
    <HomeStack.Screen name="ConfiguracoesIA" component={ConfiguracoesIAScreen} />
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

// Função aprimorada para buscar vagas com Gemini
// const buscarVagasComGemini = async (curriculoData) => {
//   try {
//     // Obter API key do Gemini
//     const apiKey = await getIAAPIKey('GEMINI');

//     if (!apiKey) {
//       throw new Error("API key do Google Gemini não configurada");
//     }

//     // Formatar dados relevantes do currículo para o prompt
//     const cv = curriculoData.data;

//     // Extrair informações chave do currículo
//     const area = cv.informacoes_pessoais?.area || '';
//     const nome = `${cv.informacoes_pessoais?.nome || ''} ${cv.informacoes_pessoais?.sobrenome || ''}`.trim();

//     // Extrair competências e palavras-chave do currículo
//     const habilidades = new Set();

//     // De projetos
//     if (cv.projetos && cv.projetos.length > 0) {
//       cv.projetos.forEach(projeto => {
//         if (projeto.habilidades) {
//           projeto.habilidades.split(',').forEach(hab => {
//             habilidades.add(hab.trim());
//           });
//         }
//       });
//     }

//     // De experiências
//     const experiencias = [];
//     if (cv.experiencias && cv.experiencias.length > 0) {
//       cv.experiencias.forEach(exp => {
//         experiencias.push({
//           cargo: exp.cargo,
//           empresa: exp.empresa,
//           descricao: exp.descricao
//         });

//         // Extrair palavras-chave das descrições de experiência
//         if (exp.descricao) {
//           const palavrasChave = exp.descricao
//             .split(/[\s,;.]+/)
//             .filter(palavra => 
//               palavra.length > 4 && 
//               !['sobre', 'como', 'para', 'onde', 'quando', 'quem', 'porque', 'então'].includes(palavra.toLowerCase())
//             );

//           palavrasChave.forEach(palavra => habilidades.add(palavra));
//         }
//       });
//     }

//     // De formação
//     const formacoes = [];
//     if (cv.formacoes_academicas && cv.formacoes_academicas.length > 0) {
//       cv.formacoes_academicas.forEach(formacao => {
//         formacoes.push({
//           diploma: formacao.diploma,
//           area: formacao.area_estudo,
//           instituicao: formacao.instituicao
//         });

//         // Adicionar área de estudo às habilidades
//         if (formacao.area_estudo) {
//           habilidades.add(formacao.area_estudo);
//         }
//       });
//     }

//     // De idiomas
//     const idiomas = [];
//     if (cv.idiomas && cv.idiomas.length > 0) {
//       cv.idiomas.forEach(idioma => {
//         idiomas.push({
//           idioma: idioma.nome,
//           nivel: idioma.nivel
//         });
//       });
//     }

//     // Prompt melhorado para garantir informações completas e links funcionais
//     const promptText = `
// Você é um recrutador e especialista em RH com 15 anos de experiência no mercado brasileiro.

// TAREFA: Analisar o perfil profissional abaixo e recomendar 5 vagas reais que estão abertas atualmente no mercado de trabalho brasileiro. Essas vagas devem ser adequadas para o perfil do candidato com base em suas habilidades, experiência e formação.

// PERFIL DO CANDIDATO:
// Nome: ${nome}
// Área de atuação: ${area}
// ${experiencias.length > 0 ? `
// Experiências profissionais:
// ${experiencias.map(exp => `- ${exp.cargo} na empresa ${exp.empresa}`).join('\n')}
// ` : ''}

// ${formacoes.length > 0 ? `
// Formação acadêmica:
// ${formacoes.map(form => `- ${form.diploma} em ${form.area} - ${form.instituicao}`).join('\n')}
// ` : ''}

// ${idiomas.length > 0 ? `
// Idiomas:
// ${idiomas.map(idioma => `- ${idioma.idioma}: ${idioma.nivel}`).join('\n')}
// ` : ''}

// Principais competências e palavras-chave:
// ${Array.from(habilidades).slice(0, 15).join(', ')}

// INSTRUÇÕES ESPECÍFICAS:
// 1. Encontre 5 vagas reais que existem atualmente no mercado brasileiro (2025)
// 2. As vagas devem ser compatíveis com o perfil, experiência e senioridade do candidato

// 3. Para cada vaga, forneça OBRIGATORIAMENTE todas estas informações:
//    - Título da vaga (cargo específico)
//    - Nome da empresa
//    - Localização (cidade/estado ou remoto)
//    - Faixa salarial estimada (baseada em sua expertise de mercado)
//    - 5 principais requisitos/qualificações exigidos
//    - 3 diferenciais da vaga
//    - Link completo e clicável para a vaga (URL completa para LinkedIn, Glassdoor, Indeed, etc.)
//    - Breve descrição das responsabilidades (2-3 frases)
//    - Avaliação de compatibilidade com o perfil (porcentagem de 0-100% e justificativa)

// 4. IMPORTANTE SOBRE OS LINKS: Forneça URLs completos e funcionais no formato [Site da Vaga](https://www.exemplo.com) 
//    - Use o formato markdown para links, garantindo que sejam clicáveis
//    - Os links devem apontar para plataformas reais como LinkedIn, Glassdoor, Indeed, Catho, etc.
//    - Cada vaga DEVE ter pelo menos um link funcional

// 5. As vagas devem variar em termos de empresas e possibilidades, mostrando diferentes opções no mercado
// 6. Priorize vagas publicadas nos últimos 30 dias
// 7. Formate a resposta de forma estruturada usando markdown para facilitar a leitura
// 8. Inclua uma análise final com recomendações sobre como o candidato pode se destacar ao aplicar para estas vagas

// FORMATO DE RESPOSTA:
// # Vagas Recomendadas para ${nome}

// ## Vaga 1: [Título da Vaga] - [Empresa]
// **Localização:** [Cidade/Estado ou Remoto]  
// **Faixa Salarial:** R$ [valor] - R$ [valor]  

// ### Descrição:
// [2-3 frases sobre as responsabilidades]

// ### Requisitos:
// - [Requisito 1]
// - [Requisito 2]
// - [Requisito 3]
// - [Requisito 4]
// - [Requisito 5]

// ### Diferenciais:
// - [Diferencial 1]
// - [Diferencial 2]
// - [Diferencial 3]

// ### Link da Vaga:
// [Nome da Plataforma](URL completa da vaga)

// ### Compatibilidade:
// **[XX]%** - [Justificativa breve]

// [Repetir o formato acima para as 5 vagas]

// ## Recomendações para se destacar
// [3-5 dicas personalizadas]

// IMPORTANTE: Todas as vagas informadas devem ser REAIS e ATUAIS (2025), baseando-se em sua base de conhecimento sobre o mercado de trabalho brasileiro atual. Não crie vagas fictícias e SEMPRE forneça TODAS as informações solicitadas, sem omitir nenhum campo.
// `;

//     console.log('Enviando prompt para busca de vagas:', promptText);

//     // Preparar a requisição para o Gemini
//     const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
//     const requestBody = {
//       contents: [{ parts: [{ text: promptText }] }],
//       generationConfig: {
//         temperature: 0.2,  // Baixa temperatura para resultados mais factuais
//         maxOutputTokens: 4000,  // Aumentado para garantir conteúdo completo
//         topP: 0.8,
//         topK: 40
//       }
//     };

//     // Fazer a chamada para o Gemini
//     const response = await axios.post(endpoint, requestBody, {
//       headers: { 'Content-Type': 'application/json' },
//       timeout: 30000  // Aumentado para 30 segundos
//     });

//     // Processar a resposta
//     if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
//       const resultado = response.data.candidates[0].content.parts[0].text;

//       // Armazenar no cache
//       try {
//         const cacheKey = `vagas_${JSON.stringify(curriculoData).slice(0, 50)}`;
//         await AsyncStorage.setItem(cacheKey, JSON.stringify({
//           resultado: resultado,
//           timestamp: new Date().toISOString()
//         }));
//       } catch (cacheError) {
//         console.log('Erro ao salvar busca de vagas no cache:', cacheError.message);
//       }

//       return {
//         success: true,
//         vagas: resultado,
//         timestamp: new Date().toISOString()
//       };
//     } else {
//       throw new Error('Formato de resposta inesperado do Gemini');
//     }
//   } catch (error) {
//     console.error('Erro ao buscar vagas:', error);
//     return {
//       success: false,
//       error: error.message || 'Erro ao buscar vagas com IA'
//     };
//   }
// };

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
      default: // 'modern'
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
              <Text style={[styles.previewLink, {color: ts.accent}]}>{personalInfo.site}</Text>
            )}
            {personalInfo.linkedin && (
              <Text style={[styles.previewLink, {color: ts.accent}]}>LinkedIn</Text>
            )}
            {personalInfo.github && (
              <Text style={[styles.previewLink, {color: ts.accent}]}>GitHub</Text>
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
                  <Text style={{fontWeight: 'bold'}}>Habilidades:</Text> {projeto.habilidades}
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
          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
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
                <Text style={{fontWeight: 'bold'}}>{idioma.nome}: <Text style={{fontWeight: 'normal'}}>{idioma.nivel}</Text></Text>
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
                activeOpacity={0.7}
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
                activeOpacity={0.7}
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
              activeOpacity={0.7}
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
              style={[
                styles.featureCard, 
                styles.compactCard,
                { borderLeftWidth: 3, borderLeftColor: Colors.primary } // Destaque visual
              ]}
              onPress={navegarParaConfiguracoesIA}
              activeOpacity={0.6} // Feedback mais claro ao pressionar
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Área de toque aumentada
            >
              <View style={styles.cardIconContainer}>
                <Text style={styles.cardIcon}>🔑</Text>
              </View>
              <Text style={styles.featureTitle}>Configurar IAs</Text>
              <Text style={styles.featureDescription}>
                Escolha qual IA usar para análise e configure suas chaves de API.
              </Text>
              <View style={[
                styles.configHintContainer,
                { backgroundColor: 'rgba(0, 188, 212, 0.15)' } // Cor mais visível
              ]}>
                <Text style={[
                  styles.configHintText,
                  { fontWeight: '500' } // Texto mais destacado
                ]}>
                  Adicione suas chaves API para desbloquear recursos avançados
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Seção Sobre */}
          <View style={styles.featureSection}>
            <Text style={styles.featureSectionTitle}>Sobre o App</Text>
            <TouchableOpacity
              style={[styles.featureCard, styles.compactCard]}
              onPress={() => navigation.navigate('SobreApp')}
              activeOpacity={0.7}
            >
              <Text style={styles.featureTitle}>CurriculoBot Premium</Text>
              <Text style={styles.featureDescription}>
                Versão: 1.2.0
              </Text>
              <Text style={styles.featureDescription}>
                Este aplicativo utiliza tecnologia de inteligência artificial para ajudar na criação e análise de currículos.
              </Text>
              <View style={styles.moreInfoButton}>
                <Text style={styles.moreInfoButtonText}>Ver mais informações</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Espaço adicional no final do scroll */}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
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
    { id: 'modern', name: 'Moderno', color: Colors.primary },
    { id: 'classic', name: 'Clássico', color: Colors.dark },
    { id: 'creative', name: 'Criativo', color: '#9c27b0' },
    { id: 'professional', name: 'Profissional', color: Colors.secondary }
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

// Novo componente SobreAppScreen
// Componente SobreAppScreen completamente independente
const SobreAppScreen = ({ navigation }) => {
  // Estilos locais, específicos para este componente
  const localStyles = StyleSheet.create({
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
    contentContainer: {
      flex: 1,
      padding: 20,
    },
    aboutCard: {
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
    appTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: Colors.dark,
      textAlign: 'center',
    },
    versionText: {
      fontSize: 16,
      color: Colors.lightText,
      textAlign: 'center',
      marginTop: 5,
    },
    divider: {
      height: 1,
      backgroundColor: Colors.mediumGray,
      marginVertical: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: Colors.dark,
      marginTop: 15,
      marginBottom: 10,
    },
    bodyText: {
      fontSize: 16,
      lineHeight: 24,
      color: Colors.dark,
      marginBottom: 15,
    },
    featureItem: {
      marginBottom: 15,
    },
    featureTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: Colors.dark,
      marginBottom: 5,
    },
    contactButton: {
      backgroundColor: Colors.primary,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 20,
    },
    buttonText: {
      color: Colors.white,
      fontWeight: 'bold',
      fontSize: 16,
    },
  });

  return (
    <SafeAreaView style={localStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />

      <View style={localStyles.header}>
        <TouchableOpacity
          style={localStyles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={localStyles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={localStyles.headerTitle}>Sobre o App</Text>
      </View>

      <ScrollView style={localStyles.contentContainer}>
        <View style={localStyles.aboutCard}>
          <Text style={localStyles.appTitle}>CurriculoBot Premium</Text>
          <Text style={localStyles.versionText}>Versão 1.0.0</Text>

          <View style={localStyles.divider} />

          <Text style={localStyles.sectionTitle}>O que é o CurriculoBot?</Text>
          <Text style={localStyles.bodyText}>
            CurriculoBot é um assistente inteligente que ajuda você a criar, gerenciar e analisar
            currículos profissionais utilizando inteligência artificial de múltiplos provedores.
          </Text>

          <Text style={localStyles.sectionTitle}>Recursos</Text>
          <View style={localStyles.featureItem}>
            <Text style={localStyles.featureTitle}>• Criação Guiada</Text>
            <Text style={localStyles.bodyText}>
              Interface conversacional que simplifica a criação do seu currículo.
            </Text>
          </View>

          <View style={localStyles.featureItem}>
            <Text style={localStyles.featureTitle}>• Análise com IA</Text>
            <Text style={localStyles.bodyText}>
              Análise profissional do seu currículo usando diferentes IAs como Google Gemini, OpenAI e Claude.
            </Text>
          </View>

          <View style={localStyles.featureItem}>
            <Text style={localStyles.featureTitle}>• Dicas Personalizadas</Text>
            <Text style={localStyles.bodyText}>
              Recomendações de melhorias, cursos e vagas adequadas ao seu perfil.
            </Text>
          </View>

          <Text style={localStyles.sectionTitle}>Contato</Text>
          <Text style={localStyles.bodyText}>
            Email: suporte@curriculobot.app
          </Text>
          <Text style={localStyles.bodyText}>
            Website: www.curriculobot.app
          </Text>

          <TouchableOpacity
            style={localStyles.contactButton}
            onPress={() => {
              Alert.alert('Obrigado', 'Agradecemos por usar o CurriculoBot!');
            }}
          >
            <Text style={localStyles.buttonText}>Entre em Contato</Text>
          </TouchableOpacity>
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