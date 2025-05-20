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

const SelecionarCurriculoScreen = ({ navigation }) => {
  const authContext = useAuth();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [curriculos, setCurriculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0)); // Usando Animated para fade in
  const [refreshing, setRefreshing] = useState(false);

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
      carregarCurriculos();
    }
  }, [user, authLoading]);

  const carregarCurriculos = async () => {
    try {
      if (!user || !user.id) {
        console.warn('Tentativa de carregar currículos sem usuário válido');
        return;
      }
      
      setLoading(true);
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculosData = cvs ? JSON.parse(cvs) : [];
      setCurriculos(curriculosData);
      
      // Animação de fade in suave
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }).start();
    } catch (error) {
      console.error('Erro ao carregar currículos:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus currículos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarCurriculos();
  };

  const handleSelecionarCurriculo = (curriculo) => {
    if (!curriculo) {
      Alert.alert('Erro', 'Currículo não encontrado ou corrompido.');
      return;
    }
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
    if (!curriculo || !curriculo.data) {
      return { 
        experiencias: 0,
        formacoes: 0,
        projetos: 0,
        area: 'Não disponível'
      };
    }
    
    const cv = curriculo.data;
    const experiencias = cv.experiencias?.length || 0;
    const formacoes = cv.formacoes_academicas?.length || 0;
    const projetos = cv.projetos?.length || 0;
    const area = cv.informacoes_pessoais?.area || 'Não especificada';

    return { experiencias, formacoes, projetos, area };
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
          <Text style={styles.headerTitle}>Selecionar Currículo</Text>
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
          <Text style={styles.headerTitle}>Selecionar Currículo</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
            Você precisa estar logado para selecionar currículos
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
        <Text style={styles.headerTitle}>Selecionar Currículo</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 10, color: Colors.lightText, fontSize: 16 }}>
            Carregando currículos...
          </Text>
        </View>
      ) : curriculos.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={80} color={Colors.lightText} style={{ marginBottom: 20 }} />
          <Text style={styles.emptyStateTitle}>Nenhum Currículo Encontrado</Text>
          <Text style={styles.emptyStateText}>
            Você precisa criar um currículo antes de buscar vagas.
          </Text>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 20,
                marginTop: 20,
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
              }
            ]}
            onPress={() => navigation.navigate('Chatbot')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Criar Currículo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, padding: 15, opacity: fadeAnim }}>
          <View style={{
            backgroundColor: '#e8f5e9',
            padding: 15,
            borderRadius: 10,
            marginBottom: 20,
            borderLeftWidth: 4,
            borderLeftColor: Colors.success,
            flexDirection: 'row',
            alignItems: 'center',
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
          }}>
            <Ionicons name="search" size={24} color="#2e7d32" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
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
                lineHeight: 20,
              }}>
                Selecione o currículo que deseja usar como base para a busca de vagas. Nossa IA encontrará oportunidades de emprego alinhadas ao seu perfil profissional.
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
            <Ionicons name="list" size={20} color={Colors.dark} style={{ marginRight: 8 }} />
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: Colors.dark,
            }}>
              Selecione um currículo:
            </Text>
          </View>

          <FlatList
            data={curriculos}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
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
                        elevation: 3,
                      },
                    }),
                    borderLeftWidth: 4,
                    borderLeftColor: Colors.primary,
                  }}
                  onPress={() => handleSelecionarCurriculo(item)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: Colors.dark,
                      marginBottom: 5,
                      flex: 1,
                    }}>
                      {item.nome || 'Currículo sem nome'}
                    </Text>

                    <TouchableOpacity
                      style={{
                        backgroundColor: Colors.primary,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        ...Platform.select({
                          ios: {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.2,
                            shadowRadius: 1.5,
                          },
                          android: {
                            elevation: 2,
                          },
                        }),
                      }}
                      onPress={() => handleSelecionarCurriculo(item)}
                    >
                      <Text style={{ color: Colors.white, fontSize: 13, fontWeight: '600', marginRight: 5 }}>
                        Selecionar
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={Colors.white} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.lightText} style={{ marginRight: 5 }} />
                    <Text style={{
                      fontSize: 14,
                      color: Colors.lightText,
                    }}>
                      Criado em: {formatDate(item.dataCriacao)}
                    </Text>
                  </View>

                  <View style={{
                    backgroundColor: '#f5f5f5',
                    padding: 12,
                    borderRadius: 8,
                    marginTop: 5,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Ionicons name="briefcase-outline" size={16} color={Colors.dark} style={{ marginRight: 6 }} />
                      <Text style={{ color: Colors.dark }}>
                        <Text style={{ fontWeight: 'bold' }}>Área: </Text>
                        {resumo.area}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', marginTop: 5, flexWrap: 'wrap' }}>
                      <View style={{
                        backgroundColor: Colors.primary,
                        paddingVertical: 4,
                        paddingHorizontal: 10,
                        borderRadius: 15,
                        marginRight: 8,
                        marginBottom: 5,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        <Ionicons name="briefcase-outline" size={14} color={Colors.white} style={{ marginRight: 4 }} />
                        <Text style={{ color: Colors.white, fontSize: 12, fontWeight: '500' }}>
                          {resumo.experiencias} experiência(s)
                        </Text>
                      </View>

                      <View style={{
                        backgroundColor: Colors.secondary,
                        paddingVertical: 4,
                        paddingHorizontal: 10,
                        borderRadius: 15,
                        marginRight: 8,
                        marginBottom: 5,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        <Ionicons name="school-outline" size={14} color={Colors.white} style={{ marginRight: 4 }} />
                        <Text style={{ color: Colors.white, fontSize: 12, fontWeight: '500' }}>
                          {resumo.formacoes} formação(ões)
                        </Text>
                      </View>

                      <View style={{
                        backgroundColor: '#673AB7',
                        paddingVertical: 4,
                        paddingHorizontal: 10,
                        borderRadius: 15,
                        marginBottom: 5,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        <Ionicons name="code-slash-outline" size={14} color={Colors.white} style={{ marginRight: 4 }} />
                        <Text style={{ color: Colors.white, fontSize: 12, fontWeight: '500' }}>
                          {resumo.projetos} projeto(s)
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

export default SelecionarCurriculoScreen;