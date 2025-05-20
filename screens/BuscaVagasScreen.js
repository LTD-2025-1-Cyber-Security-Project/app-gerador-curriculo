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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.dark} />

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

export default BuscaVagasScreen;