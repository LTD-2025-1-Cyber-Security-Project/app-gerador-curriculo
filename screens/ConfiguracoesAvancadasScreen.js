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

const ConfiguracoesAvancadasScreen = ({ navigation }) => {
  const [iaConfigs, setIaConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeIA, setActiveIA] = useState('GEMINI');
  const [apiKey, setApiKey] = useState('');
  const [temperatura, setTemperatura] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(800);
  const [modelo, setModelo] = useState('default');
  const [isSaving, setIsSaving] = useState(false);

  // Estados para o uso de API
  const [usageData, setUsageData] = useState(null);
  const [showUsageDetails, setShowUsageDetails] = useState(false);
  const [usageDetailTab, setUsageDetailTab] = useState('summary');
  const [usagePeriod, setUsagePeriod] = useState('week'); // 'day', 'week', 'month', 'all'
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [showCallDetails, setShowCallDetails] = useState(false);

  useEffect(() => {
    carregarConfiguracoes();
    carregarDadosDeUso();
  }, []);

  useEffect(() => {
    // Recarregar dados de uso ao mudar o período
    if (showUsageDetails) {
      carregarDadosDeUso();
    }
  }, [usagePeriod]);

  const carregarDadosDeUso = async () => {
    try {
      setIsLoadingUsage(true);

      // Em um app real, isso viria do AsyncStorage ou de uma API
      // Simulando tempo de carregamento
      await new Promise(resolve => setTimeout(resolve, 800));

      // Dados simulados para demonstração
      const mockUsageData = {
        totalCalls: 123,
        totalTokens: 42560,
        byIA: {
          'GEMINI': { calls: 67, tokens: 23450 },
          'CLAUDE': { calls: 32, tokens: 12800 },
          'PERPLEXITY': { calls: 24, tokens: 6310 }
        },
        byType: {
          'Análise de currículos': { calls: 42, tokens: 18900 },
          'Busca de vagas': { calls: 38, tokens: 14200 },
          'Geração de textos': { calls: 25, tokens: 6800 },
          'Outros': { calls: 18, tokens: 2660 }
        },
        history: [
          { date: '2025-05-15', ia: 'GEMINI', type: 'Análise de currículos', tokens: 1200, prompt: 'Analisar currículo para vaga de dev', id: '1' },
          { date: '2025-05-14', ia: 'CLAUDE', type: 'Busca de vagas', tokens: 800, prompt: 'Encontrar vagas de UX/UI', id: '2' },
          { date: '2025-05-14', ia: 'GEMINI', type: 'Análise de currículos', tokens: 1350, prompt: 'Avaliar perfil para vaga senior', id: '3' },
          { date: '2025-05-13', ia: 'PERPLEXITY', type: 'Geração de textos', tokens: 550, prompt: 'Criar descrição de vaga', id: '4' },
          { date: '2025-05-12', ia: 'GEMINI', type: 'Busca de vagas', tokens: 920, prompt: 'Buscar vagas remotas', id: '5' },
          { date: '2025-05-11', ia: 'CLAUDE', type: 'Outros', tokens: 420, prompt: 'Dicas para entrevista', id: '6' },
          { date: '2025-05-10', ia: 'PERPLEXITY', type: 'Análise de currículos', tokens: 1100, prompt: 'Comparar perfis', id: '7' },
          { date: '2025-05-09', ia: 'GEMINI', type: 'Geração de textos', tokens: 780, prompt: 'Email de feedback', id: '8' },
          { date: '2025-05-08', ia: 'CLAUDE', type: 'Busca de vagas', tokens: 650, prompt: 'Vagas para iniciantes', id: '9' },
          { date: '2025-05-07', ia: 'GEMINI', type: 'Análise de currículos', tokens: 1230, prompt: 'Avaliar competências técnicas', id: '10' },
          { date: '2025-05-06', ia: 'PERPLEXITY', type: 'Outros', tokens: 480, prompt: 'Sugestões de portfólio', id: '11' },
          { date: '2025-05-05', ia: 'CLAUDE', type: 'Geração de textos', tokens: 870, prompt: 'Carta de apresentação', id: '12' },
          { date: '2025-05-04', ia: 'GEMINI', type: 'Busca de vagas', tokens: 680, prompt: 'Vagas em São Paulo', id: '13' },
          { date: '2025-05-03', ia: 'PERPLEXITY', type: 'Análise de currículos', tokens: 1190, prompt: 'Verificar experiência', id: '14' },
          { date: '2025-05-02', ia: 'GEMINI', type: 'Geração de textos', tokens: 740, prompt: 'Descrição para LinkedIn', id: '15' }
        ],
        // Dados diários para gráficos de tendência
        dailyUsage: [
          { date: '2025-05-01', tokens: 2400 },
          { date: '2025-05-02', tokens: 1800 },
          { date: '2025-05-03', tokens: 2700 },
          { date: '2025-05-04', tokens: 1500 },
          { date: '2025-05-05', tokens: 3100 },
          { date: '2025-05-06', tokens: 2300 },
          { date: '2025-05-07', tokens: 1900 },
          { date: '2025-05-08', tokens: 2100 },
          { date: '2025-05-09', tokens: 2600 },
          { date: '2025-05-10', tokens: 3200 },
          { date: '2025-05-11', tokens: 2800 },
          { date: '2025-05-12', tokens: 3400 },
          { date: '2025-05-13', tokens: 2900 },
          { date: '2025-05-14', tokens: 3700 },
          { date: '2025-05-15', tokens: 4200 }
        ],
        // Dados de custo estimado
        costEstimate: {
          totalCost: 2.13, // em USD
          byIA: {
            'GEMINI': 0.94,
            'CLAUDE': 0.77,
            'PERPLEXITY': 0.42
          }
        }
      };

      // Filtrar dados baseado no período selecionado
      const filteredData = filterDataByPeriod(mockUsageData, usagePeriod);
      setUsageData(filteredData);
    } catch (error) {
      console.error('Erro ao carregar dados de uso:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados de uso da API.');
    } finally {
      setIsLoadingUsage(false);
    }
  };

  // Função para filtrar dados com base no período selecionado
  const filterDataByPeriod = (data, period) => {
    if (period === 'all') return data;

    const today = new Date();
    let startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(today.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        break;
      default:
        return data;
    }

    // Filtrar histórico
    const filteredHistory = data.history.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate;
    });

    // Filtrar uso diário
    const filteredDailyUsage = data.dailyUsage.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate;
    });

    // Recalcular totais com base no histórico filtrado
    let totalCalls = 0;
    let totalTokens = 0;
    let byIA = { 'GEMINI': { calls: 0, tokens: 0 }, 'CLAUDE': { calls: 0, tokens: 0 }, 'PERPLEXITY': { calls: 0, tokens: 0 } };
    let byType = { 'Análise de currículos': { calls: 0, tokens: 0 }, 'Busca de vagas': { calls: 0, tokens: 0 }, 'Geração de textos': { calls: 0, tokens: 0 }, 'Outros': { calls: 0, tokens: 0 } };
    let costEstimate = { totalCost: 0, byIA: { 'GEMINI': 0, 'CLAUDE': 0, 'PERPLEXITY': 0 } };

    // Preços por token (simulado)
    const tokenPrices = {
      'GEMINI': 0.00004,
      'CLAUDE': 0.00006,
      'PERPLEXITY': 0.00007
    };

    filteredHistory.forEach(item => {
      totalCalls++;
      totalTokens += item.tokens;

      // Somar por IA
      if (!byIA[item.ia]) byIA[item.ia] = { calls: 0, tokens: 0 };
      byIA[item.ia].calls++;
      byIA[item.ia].tokens += item.tokens;

      // Somar por tipo
      if (!byType[item.type]) byType[item.type] = { calls: 0, tokens: 0 };
      byType[item.type].calls++;
      byType[item.type].tokens += item.tokens;

      // Calcular custo
      const tokenPrice = tokenPrices[item.ia] || 0.00005;
      const cost = item.tokens * tokenPrice;
      costEstimate.totalCost += cost;
      if (!costEstimate.byIA[item.ia]) costEstimate.byIA[item.ia] = 0;
      costEstimate.byIA[item.ia] += cost;
    });

    return {
      ...data,
      totalCalls,
      totalTokens,
      byIA,
      byType,
      history: filteredHistory,
      dailyUsage: filteredDailyUsage,
      costEstimate
    };
  };

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

      // Definir estados para a IA ativa
      if (configs[activeIA]) {
        setApiKey(configs[activeIA].apiKey || '');
        setTemperatura(configs[activeIA].temperatura || 0.7);
        setMaxTokens(configs[activeIA].maxTokens || 800);
        setModelo(configs[activeIA].modelo || 'Padrão');
      }

    } catch (error) {
      console.error('Erro ao carregar configurações avançadas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as configurações.');
    } finally {
      setLoading(false);
    }
  };

  const saveAdvancedConfig = async () => {
    try {
      setIsSaving(true);

      // Atualizar valores da configuração atual
      const updatedConfigs = { ...iaConfigs };
      updatedConfigs[activeIA] = {
        ...updatedConfigs[activeIA],
        apiKey,
        temperatura,
        maxTokens,
        modelo
      };

      // Salvar API key
      await salvarIAAPIKey(activeIA, apiKey);

      // Salvar como IA padrão se marcado
      if (updatedConfigs[activeIA].isDefault) {
        await AsyncStorage.setItem('ia_padrao', activeIA);

        // Atualizar outras IAs para não serem padrão
        for (const key of Object.keys(updatedConfigs)) {
          if (key !== activeIA) {
            updatedConfigs[key].isDefault = false;
          }
        }
      }

      // Salvar configurações avançadas
      const advancedConfigs = {};
      for (const [key, value] of Object.entries(updatedConfigs)) {
        advancedConfigs[key] = {
          modelo: value.modelo,
          temperatura: value.temperatura,
          maxTokens: value.maxTokens,
        };
      }

      await AsyncStorage.setItem('ia_advanced_configs', JSON.stringify(advancedConfigs));
      setIaConfigs(updatedConfigs);

      Alert.alert('Sucesso', 'Configurações salvas com sucesso!');

    } catch (error) {
      console.error('Erro ao salvar configurações avançadas:', error);
      Alert.alert('Erro', 'Não foi possível salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    // Atualizar estado local
    switch (field) {
      case 'apiKey':
        setApiKey(value);
        break;
      case 'temperatura':
        setTemperatura(value);
        break;
      case 'maxTokens':
        setMaxTokens(value);
        break;
      case 'modelo':
        setModelo(value);
        break;
      case 'isDefault':
        const updatedConfigs = { ...iaConfigs };
        updatedConfigs[activeIA] = {
          ...updatedConfigs[activeIA],
          isDefault: value
        };
        setIaConfigs(updatedConfigs);
        break;
      default:
        break;
    }
  };

  const selecionarIA = async (tipoIA) => {
    setActiveIA(tipoIA);

    // Carregar configurações da IA selecionada
    if (iaConfigs[tipoIA]) {
      setApiKey(iaConfigs[tipoIA].apiKey || '');
      setTemperatura(iaConfigs[tipoIA].temperatura || 0.7);
      setMaxTokens(iaConfigs[tipoIA].maxTokens || 800);
      setModelo(iaConfigs[tipoIA].modelo || 'Padrão');
    }
  };

  // Métodos para a seção de detalhes de uso
  const viewUsageDetails = () => {
    setShowUsageDetails(true);
    carregarDadosDeUso();
  };

  const closeUsageDetails = () => {
    setShowUsageDetails(false);
  };

  const selectUsageDetailTab = (tab) => {
    setUsageDetailTab(tab);
  };

  const selectUsagePeriod = (period) => {
    setUsagePeriod(period);
  };

  const viewCallDetails = (call) => {
    setSelectedCall(call);
    setShowCallDetails(true);
  };

  const closeCallDetails = () => {
    setShowCallDetails(false);
    setSelectedCall(null);
  };

  // Funções de renderização para estatísticas de uso
  const renderUsageSummary = () => {
    if (!usageData) return null;

    return (
      <View style={styles.usageSummaryContainer}>
        <View style={styles.usageSummaryCard}>
          <Text style={styles.usageSummaryTitle}>Total de Chamadas</Text>
          <Text style={styles.usageSummaryValue}>{usageData.totalCalls}</Text>
        </View>

        <View style={styles.usageSummaryCard}>
          <Text style={styles.usageSummaryTitle}>Total de Tokens</Text>
          <Text style={styles.usageSummaryValue}>{usageData.totalTokens.toLocaleString()}</Text>
        </View>

        <View style={styles.usageSummaryCard}>
          <Text style={styles.usageSummaryTitle}>Custo Estimado</Text>
          <Text style={styles.usageSummaryValue}>
            US$ {usageData.costEstimate.totalCost.toFixed(2)}
          </Text>
        </View>
      </View>
    );
  };

  const renderUsageByIA = () => {
    if (!usageData) return null;

    // Preparar dados para o gráfico
    const iaData = Object.entries(usageData.byIA).map(([name, data]) => ({
      name,
      tokens: data.tokens,
      calls: data.calls,
      cost: usageData.costEstimate.byIA[name] || 0
    }));

    // Ordenar por quantidade de tokens (maior primeiro)
    iaData.sort((a, b) => b.tokens - a.tokens);

    // Cores para cada IA
    const iaColors = {
      'GEMINI': '#4285F4',
      'CLAUDE': '#9C27B0',
      'PERPLEXITY': '#00BFA5',
      'DEEPSEEK': '#FF5722',
      'BLACKBOX': '#212121',
      'GROK': '#607D8B',
      'BING': '#0078D7',
      'OPENAI': '#10A37F',
      'OFFLINE': '#9E9E9E'
    };

    return (
      <View style={styles.usageChartContainer}>
        <Text style={styles.usageChartTitle}>Uso por Modelo de IA</Text>

        {/* Visualização de gráfico em barras horizontais */}
        <View style={styles.barChartContainer}>
          {iaData.map((item, index) => {
            // Calcular largura proporcional da barra (máximo 90%)
            const maxTokens = Math.max(...iaData.map(d => d.tokens));
            const barWidth = maxTokens > 0 ? (item.tokens / maxTokens) * 90 : 0;

            return (
              <View key={index} style={styles.barChartItem}>
                <View style={styles.barChartLabelContainer}>
                  <Text style={styles.barChartLabel}>{item.name}</Text>
                </View>

                <View style={styles.barChartBarContainer}>
                  <View style={[
                    styles.barChartBar,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: iaColors[item.name] || Colors.primary
                    }
                  ]} />

                  <Text style={styles.barChartValue}>
                    {item.tokens.toLocaleString()} tokens ({item.calls} chamadas)
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Estatísticas de custo por IA */}
        <View style={styles.costByIAContainer}>
          <Text style={styles.costByIATitle}>Custo por Modelo</Text>

          {iaData.map((item, index) => (
            <View key={`cost-${index}`} style={styles.costByIAItem}>
              <View style={[styles.costByIADot, { backgroundColor: iaColors[item.name] || Colors.primary }]} />
              <Text style={styles.costByIALabel}>{item.name}:</Text>
              <Text style={styles.costByIAValue}>US$ {item.cost.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderUsageByType = () => {
    if (!usageData) return null;

    // Preparar dados para o gráfico
    const typeData = Object.entries(usageData.byType).map(([name, data]) => ({
      name,
      tokens: data.tokens,
      calls: data.calls
    }));

    // Ordenar por quantidade de tokens (maior primeiro)
    typeData.sort((a, b) => b.tokens - a.tokens);

    // Cores para cada tipo
    const typeColors = {
      'Análise de currículos': '#4CAF50',
      'Busca de vagas': '#2196F3',
      'Geração de textos': '#9C27B0',
      'Outros': '#FF9800'
    };

    // Calcular porcentagens para gráfico de pizza
    const totalTokens = usageData.totalTokens || 1; // Evitar divisão por zero

    return (
      <View style={styles.usageChartContainer}>
        <Text style={styles.usageChartTitle}>Uso por Tipo de Solicitação</Text>

        {/* Gráfico de donut simulado com barras de porcentagem */}
        <View style={styles.pieChartContainer}>
          {typeData.map((item, index) => {
            const percentage = (item.tokens / totalTokens) * 100;

            return (
              <View key={index} style={styles.pieChartItem}>
                <View style={styles.pieChartLabelContainer}>
                  <View style={[
                    styles.pieChartColorIndicator,
                    { backgroundColor: typeColors[item.name] || Colors.primary }
                  ]} />
                  <Text style={styles.pieChartLabel}>{item.name}</Text>
                </View>

                <View style={styles.pieChartBarContainer}>
                  <View style={[
                    styles.pieChartBar,
                    {
                      width: `${percentage}%`,
                      backgroundColor: typeColors[item.name] || Colors.primary
                    }
                  ]} />
                  <Text style={styles.pieChartPercentage}>
                    {percentage.toFixed(1)}%
                  </Text>
                </View>

                <Text style={styles.pieChartValue}>
                  {item.tokens.toLocaleString()} tokens
                </Text>
              </View>
            );
          })}
        </View>

        {/* Estatísticas de chamadas por tipo */}
        <View style={styles.callsByTypeContainer}>
          <Text style={styles.callsByTypeTitle}>Chamadas por Tipo</Text>

          <View style={styles.callsByTypeList}>
            {typeData.map((item, index) => (
              <View key={`calls-${index}`} style={styles.callsByTypeItem}>
                <Text style={styles.callsByTypeLabel}>{item.name}:</Text>
                <Text style={styles.callsByTypeValue}>{item.calls} chamadas</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderUsageTrends = () => {
    if (!usageData || !usageData.dailyUsage || usageData.dailyUsage.length === 0) {
      return (
        <View style={styles.emptyTrendsContainer}>
          <Text style={styles.emptyTrendsText}>
            Não há dados suficientes para exibir tendências para o período selecionado.
          </Text>
        </View>
      );
    }

    // Preparar dados para o gráfico de tendências
    const trendData = [...usageData.dailyUsage];

    // Ordenar por data (mais antiga primeiro)
    trendData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calcular altura máxima para barras (100% = altura máxima)
    const maxTokens = Math.max(...trendData.map(item => item.tokens));

    // Formatar datas
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    };

    return (
      <View style={styles.trendChartContainer}>
        <Text style={styles.trendChartTitle}>Tendência de Uso</Text>

        <View style={styles.trendChartContent}>
          {/* Eixo Y (valores) */}
          <View style={styles.trendChartYAxis}>
            <Text style={styles.trendChartYLabel}>{maxTokens.toLocaleString()}</Text>
            <Text style={styles.trendChartYLabel}>{Math.round(maxTokens * 0.75).toLocaleString()}</Text>
            <Text style={styles.trendChartYLabel}>{Math.round(maxTokens * 0.5).toLocaleString()}</Text>
            <Text style={styles.trendChartYLabel}>{Math.round(maxTokens * 0.25).toLocaleString()}</Text>
            <Text style={styles.trendChartYLabel}>0</Text>
          </View>

          {/* Gráfico principal */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendChartScrollContent}
          >
            <View style={styles.trendChartBars}>
              {trendData.map((item, index) => {
                const barHeight = maxTokens > 0 ? (item.tokens / maxTokens) * 100 : 0;

                return (
                  <View key={index} style={styles.trendChartBarWrapper}>
                    <View style={styles.trendChartBarContainer}>
                      <View
                        style={[
                          styles.trendChartBar,
                          { height: `${barHeight}%` }
                        ]}
                      />
                    </View>
                    <Text style={styles.trendChartXLabel}>{formatDate(item.date)}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Resumo de tendência */}
        <View style={styles.trendSummaryContainer}>
          <Text style={styles.trendSummaryTitle}>Resumo da Tendência</Text>

          {trendData.length >= 2 && (
            <View style={styles.trendSummaryContent}>
              {(() => {
                // Calcular tendência comparando primeiro e último valor
                const firstValue = trendData[0].tokens;
                const lastValue = trendData[trendData.length - 1].tokens;
                const change = lastValue - firstValue;
                const percentChange = (change / firstValue) * 100;

                // Determinar direção da tendência
                let trendText, trendColor;
                if (percentChange > 5) {
                  trendText = `Aumento de ${percentChange.toFixed(1)}%`;
                  trendColor = '#4CAF50'; // verde
                } else if (percentChange < -5) {
                  trendText = `Redução de ${Math.abs(percentChange).toFixed(1)}%`;
                  trendColor = '#F44336'; // vermelho
                } else {
                  trendText = 'Estável (variação menor que 5%)';
                  trendColor = '#FFC107'; // amarelo
                }

                return (
                  <>
                    <Text style={styles.trendSummaryText}>
                      <Text style={{ fontWeight: 'bold' }}>Tendência:</Text> {trendText}
                    </Text>
                    <View style={[styles.trendIndicator, { backgroundColor: trendColor }]}>
                      <Text style={styles.trendIndicatorText}>
                        {change >= 0 ? '↑' : '↓'} {Math.abs(change).toLocaleString()} tokens
                      </Text>
                    </View>
                    <Text style={styles.trendSummaryText}>
                      <Text style={{ fontWeight: 'bold' }}>Média diária:</Text> {Math.round(trendData.reduce((sum, item) => sum + item.tokens, 0) / trendData.length).toLocaleString()} tokens
                    </Text>
                  </>
                );
              })()}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderUsageHistory = () => {
    if (!usageData || !usageData.history || usageData.history.length === 0) {
      return (
        <View style={styles.emptyHistoryContainer}>
          <Text style={styles.emptyHistoryText}>
            Não há histórico de chamadas para o período selecionado.
          </Text>
        </View>
      );
    }

    // Cores para as IAs no histórico
    const iaColors = {
      'GEMINI': '#4285F4',
      'CLAUDE': '#9C27B0',
      'PERPLEXITY': '#00BFA5',
      'DEEPSEEK': '#FF5722',
      'BLACKBOX': '#212121',
      'GROK': '#607D8B',
      'BING': '#0078D7',
      'OPENAI': '#10A37F',
      'OFFLINE': '#9E9E9E'
    };

    // Formatar data
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Histórico de Chamadas</Text>

        <FlatList
          data={usageData.history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.historyItem}
              onPress={() => viewCallDetails(item)}
            >
              <View style={styles.historyItemHeader}>
                <View style={styles.historyItemType}>
                  <View
                    style={[
                      styles.historyItemTypeIndicator,
                      { backgroundColor: iaColors[item.ia] || Colors.primary }
                    ]}
                  />
                  <Text style={styles.historyItemTypeText}>{item.ia}</Text>
                </View>

                <Text style={styles.historyItemTokens}>
                  {item.tokens.toLocaleString()} tokens
                </Text>
              </View>

              <Text style={styles.historyItemPrompt} numberOfLines={2}>
                {item.prompt}
              </Text>

              <View style={styles.historyItemFooter}>
                <Text style={styles.historyItemCategory}>{item.type}</Text>
                <Text style={styles.historyItemDate}>{formatDate(item.date)}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.historyList}
        />
      </View>
    );
  };

  // Renderizar detalhes de uma chamada específica
  const renderCallDetails = () => {
    if (!selectedCall) return null;

    // Cores para as IAs
    const iaColors = {
      'GEMINI': '#4285F4',
      'CLAUDE': '#9C27B0',
      'PERPLEXITY': '#00BFA5',
      'DEEPSEEK': '#FF5722',
      'BLACKBOX': '#212121',
      'GROK': '#607D8B',
      'BING': '#0078D7',
      'OPENAI': '#10A37F',
      'OFFLINE': '#9E9E9E'
    };

    // Formatar data
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    // Preços por token (simulado)
    const tokenPrices = {
      'GEMINI': 0.00004,
      'CLAUDE': 0.00006,
      'PERPLEXITY': 0.00007,
      'DEFAULT': 0.00005
    };

    // Calcular custo
    const tokenPrice = tokenPrices[selectedCall.ia] || tokenPrices.DEFAULT;
    const cost = selectedCall.tokens * tokenPrice;

    // Gerar resposta simulada (para demonstração)
    const simulatedResponse = "Esta é uma resposta simulada da IA para demonstração. Em um aplicativo real, aqui seria exibida a resposta completa recebida da API. A resposta conteria a análise solicitada, recomendações ou outros conteúdos gerados pelo modelo de IA específico.";

    return (
      <View style={styles.callDetailsContainer}>
        <View style={styles.callDetailsHeader}>
          <Text style={styles.callDetailsTitle}>Detalhes da Chamada</Text>

          <TouchableOpacity
            style={styles.callDetailsCloseButton}
            onPress={closeCallDetails}
          >
            <Text style={styles.callDetailsCloseButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.callDetailsContent}>
          <View style={styles.callDetailsSummary}>
            <View
              style={[
                styles.callDetailsIABadge,
                { backgroundColor: iaColors[selectedCall.ia] || Colors.primary }
              ]}
            >
              <Text style={styles.callDetailsIABadgeText}>{selectedCall.ia}</Text>
            </View>

            <Text style={styles.callDetailsDate}>
              {formatDate(selectedCall.date)}
            </Text>

            <Text style={styles.callDetailsCategory}>
              Categoria: {selectedCall.type}
            </Text>
          </View>

          <View style={styles.callDetailsMetrics}>
            <View style={styles.callDetailsMetricItem}>
              <Text style={styles.callDetailsMetricLabel}>Tokens</Text>
              <Text style={styles.callDetailsMetricValue}>
                {selectedCall.tokens.toLocaleString()}
              </Text>
            </View>

            <View style={styles.callDetailsMetricItem}>
              <Text style={styles.callDetailsMetricLabel}>Custo</Text>
              <Text style={styles.callDetailsMetricValue}>
                US$ {cost.toFixed(5)}
              </Text>
            </View>
          </View>

          <View style={styles.callDetailsSection}>
            <Text style={styles.callDetailsSectionTitle}>Prompt</Text>
            <View style={styles.callDetailsPromptContainer}>
              <Text style={styles.callDetailsPromptText}>
                {selectedCall.prompt}
              </Text>
            </View>
          </View>

          <View style={styles.callDetailsSection}>
            <Text style={styles.callDetailsSectionTitle}>Resposta</Text>
            <View style={styles.callDetailsResponseContainer}>
              <Text style={styles.callDetailsResponseText}>
                {simulatedResponse}
              </Text>
            </View>
          </View>

          <View style={styles.callDetailsSection}>
            <Text style={styles.callDetailsSectionTitle}>Configurações Utilizadas</Text>
            <View style={styles.callDetailsConfigList}>
              <View style={styles.callDetailsConfigItem}>
                <Text style={styles.callDetailsConfigLabel}>Modelo:</Text>
                <Text style={styles.callDetailsConfigValue}>
                  {selectedCall.ia === 'GEMINI' ? 'gemini-pro' :
                    selectedCall.ia === 'CLAUDE' ? 'claude-3-sonnet' :
                      selectedCall.ia === 'PERPLEXITY' ? 'perplexity-sonar-small' : 'default'}
                </Text>
              </View>

              <View style={styles.callDetailsConfigItem}>
                <Text style={styles.callDetailsConfigLabel}>Temperatura:</Text>
                <Text style={styles.callDetailsConfigValue}>0.7</Text>
              </View>

              <View style={styles.callDetailsConfigItem}>
                <Text style={styles.callDetailsConfigLabel}>Max Tokens:</Text>
                <Text style={styles.callDetailsConfigValue}>800</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  // Componente de Slider personalizado para substituir o @react-native-community/slider
  const CustomSlider = ({ value, onValueChange, minimumValue, maximumValue, step, style }) => {
    const values = [];
    for (let i = minimumValue; i <= maximumValue; i += step) {
      values.push(i);
    }

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
                backgroundColor: val <= value ? Colors.primary : Colors.lightGray,
                borderRadius: 4,
              }}
              onPress={() => onValueChange(val)}
            >
              <Text style={{ color: val <= value ? Colors.white : Colors.dark, fontSize: 12 }}>
                {val.toFixed(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Renderizar os modelos disponíveis para a IA selecionada
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
          {modelosDisponiveis.map((model, index) => (
            <TouchableOpacity
              key={index}
              style={{
                backgroundColor: modelo === model ? Colors.primary : Colors.lightGray,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                marginRight: 8,
              }}
              onPress={() => handleInputChange('modelo', model)}
            >
              <Text style={{
                color: modelo === model ? Colors.white : Colors.dark,
              }}>
                {model}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
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
                    onPress={() => selecionarIA(key)}
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
                    value={apiKey}
                    onChangeText={(text) => handleInputChange('apiKey', text)}
                    placeholder="Insira sua API Key aqui"
                    secureTextEntry={true}
                  />
                  {IA_APIS[activeIA]?.chaveDefault && !apiKey && (
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
                    Temperatura: {temperatura.toFixed(1)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text>0.1</Text>
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <CustomSlider
                        minimumValue={0.1}
                        maximumValue={1.0}
                        step={0.1}
                        value={temperatura}
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
                    Máximo de tokens: {maxTokens}
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
                          backgroundColor: maxTokens === value ? Colors.primary : Colors.lightGray,
                          borderRadius: 8,
                        }}
                        onPress={() => handleInputChange('maxTokens', value)}
                      >
                        <Text style={{
                          color: maxTokens === value ? Colors.white : Colors.dark,
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
                  disabled={isSaving}
                >
                  {isSaving ? (
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

          {/* Seção de Uso de API aprimorada */}
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
              marginBottom: 15,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: Colors.dark,
              }}>
                Uso de API
              </Text>

              {/* Período selecionado (visível apenas quando os detalhes estão abertos) */}
              {showUsageDetails && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f0f0f0',
                  borderRadius: 20,
                  padding: 3,
                }}>
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 16,
                      backgroundColor: usagePeriod === 'day' ? Colors.primary : 'transparent',
                    }}
                    onPress={() => selectUsagePeriod('day')}
                  >
                    <Text style={{
                      fontSize: 12,
                      color: usagePeriod === 'day' ? Colors.white : Colors.dark,
                    }}>
                      Dia
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 16,
                      backgroundColor: usagePeriod === 'week' ? Colors.primary : 'transparent',
                    }}
                    onPress={() => selectUsagePeriod('week')}
                  >
                    <Text style={{
                      fontSize: 12,
                      color: usagePeriod === 'week' ? Colors.white : Colors.dark,
                    }}>
                      Semana
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 16,
                      backgroundColor: usagePeriod === 'month' ? Colors.primary : 'transparent',
                    }}
                    onPress={() => selectUsagePeriod('month')}
                  >
                    <Text style={{
                      fontSize: 12,
                      color: usagePeriod === 'month' ? Colors.white : Colors.dark,
                    }}>
                      Mês
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 16,
                      backgroundColor: usagePeriod === 'all' ? Colors.primary : 'transparent',
                    }}
                    onPress={() => selectUsagePeriod('all')}
                  >
                    <Text style={{
                      fontSize: 12,
                      color: usagePeriod === 'all' ? Colors.white : Colors.dark,
                    }}>
                      Total
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {isLoadingUsage ? (
              <View style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 30
              }}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={{ marginTop: 15, color: Colors.dark }}>
                  Carregando dados de uso...
                </Text>
              </View>
            ) : showUsageDetails ? (
              <>
                {/* Abas de categorias para detalhes de uso */}
                <View style={{
                  flexDirection: 'row',
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.mediumGray,
                  marginBottom: 15,
                }}>
                  <TouchableOpacity
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 15,
                      borderBottomWidth: 2,
                      borderBottomColor: usageDetailTab === 'summary' ? Colors.primary : 'transparent',
                    }}
                    onPress={() => selectUsageDetailTab('summary')}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: usageDetailTab === 'summary' ? Colors.primary : Colors.dark,
                    }}>
                      Resumo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 15,
                      borderBottomWidth: 2,
                      borderBottomColor: usageDetailTab === 'by_ia' ? Colors.primary : 'transparent',
                    }}
                    onPress={() => selectUsageDetailTab('by_ia')}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: usageDetailTab === 'by_ia' ? Colors.primary : Colors.dark,
                    }}>
                      Por IA
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 15,
                      borderBottomWidth: 2,
                      borderBottomColor: usageDetailTab === 'by_type' ? Colors.primary : 'transparent',
                    }}
                    onPress={() => selectUsageDetailTab('by_type')}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: usageDetailTab === 'by_type' ? Colors.primary : Colors.dark,
                    }}>
                      Por Tipo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 15,
                      borderBottomWidth: 2,
                      borderBottomColor: usageDetailTab === 'trends' ? Colors.primary : 'transparent',
                    }}
                    onPress={() => selectUsageDetailTab('trends')}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: usageDetailTab === 'trends' ? Colors.primary : Colors.dark,
                    }}>
                      Tendências
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 15,
                      borderBottomWidth: 2,
                      borderBottomColor: usageDetailTab === 'history' ? Colors.primary : 'transparent',
                    }}
                    onPress={() => selectUsageDetailTab('history')}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: usageDetailTab === 'history' ? Colors.primary : Colors.dark,
                    }}>
                      Histórico
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Conteúdo da tab selecionada */}
                {usageDetailTab === 'summary' && renderUsageSummary()}
                {usageDetailTab === 'by_ia' && renderUsageByIA()}
                {usageDetailTab === 'by_type' && renderUsageByType()}
                {usageDetailTab === 'trends' && renderUsageTrends()}
                {usageDetailTab === 'history' && renderUsageHistory()}

                {/* Botão para fechar detalhes */}
                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.lightGray,
                    borderRadius: 8,
                    padding: 12,
                    alignItems: 'center',
                    marginTop: 15,
                  }}
                  onPress={closeUsageDetails}
                >
                  <Text style={{ color: Colors.dark }}>Fechar Detalhes</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Resumo de uso quando não estiver mostrando detalhes */}
                <View style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  marginBottom: 15,
                }}>
                  <View style={{
                    width: '48%',
                    backgroundColor: '#e3f2fd',
                    borderRadius: 8,
                    padding: 15,
                    marginBottom: 10,
                  }}>
                    <Text style={{
                      fontSize: 24,
                      fontWeight: 'bold',
                      color: Colors.primary,
                    }}>
                      {usageData?.totalCalls || 0}
                    </Text>
                    <Text style={{ color: Colors.dark }}>
                      Chamadas de API
                    </Text>
                  </View>

                  <View style={{
                    width: '48%',
                    backgroundColor: '#e8f5e9',
                    borderRadius: 8,
                    padding: 15,
                    marginBottom: 10,
                  }}>
                    <Text style={{
                      fontSize: 24,
                      fontWeight: 'bold',
                      color: Colors.success,
                    }}>
                      {usageData ? usageData.totalTokens.toLocaleString() : 0}
                    </Text>
                    <Text style={{ color: Colors.dark }}>
                      Tokens Consumidos
                    </Text>
                  </View>
                </View>

                {/* Distribuição de uso por IA */}
                <View style={{
                  backgroundColor: '#f5f5f5',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 15,
                }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: 'bold',
                    marginBottom: 8,
                    color: Colors.dark,
                  }}>
                    Distribuição por Modelo:
                  </Text>

                  {usageData && Object.entries(usageData.byIA).map(([ia, data], index) => {
                    const percentage = usageData.totalTokens > 0 ? (data.tokens / usageData.totalTokens) * 100 : 0;

                    return (
                      <View key={index} style={{ marginBottom: 8 }}>
                        <View style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 3,
                        }}>
                          <Text style={{ fontSize: 12 }}>{ia}</Text>
                          <Text style={{ fontSize: 12 }}>{percentage.toFixed(1)}%</Text>
                        </View>

                        <View style={{
                          height: 6,
                          backgroundColor: Colors.lightGray,
                          borderRadius: 3,
                        }}>
                          <View style={{
                            width: `${percentage}%`,
                            height: '100%',
                            backgroundColor: Colors.primary,
                            borderRadius: 3,
                          }} />
                        </View>
                      </View>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.primary,
                    borderRadius: 8,
                    padding: 12,
                    alignItems: 'center',
                  }}
                  onPress={viewUsageDetails}
                >
                  <Text style={{
                    color: Colors.white,
                    fontWeight: 'bold',
                    fontSize: 15,
                  }}>
                    Ver Detalhes de Uso
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* Modal para detalhes de uma chamada específica */}
      {showCallDetails && renderCallDetails()}
    </SafeAreaView>
  );
};

export default ConfiguracoesAvancadasScreen;