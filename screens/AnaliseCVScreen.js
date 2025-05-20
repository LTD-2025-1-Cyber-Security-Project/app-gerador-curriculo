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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.dark} />

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

export default AnaliseCVScreen;