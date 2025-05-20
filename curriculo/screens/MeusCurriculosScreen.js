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
import ColorsModule from '../../styles/colors';
import sharedStyles from '../../styles/sharedStyles';
import styles from '../../styles/styles';
import initialCVData from '../../styles/initialCVData';
import meusCurriculosStyles from '../../styles/meusCurriculosStyles';
import ProfessionalColors from '../../styles/ProfessionalColors';
import curriculoAnaliseStyles from '../../styles/curriculoAnaliseStyles';
import HeaderColors from '../../styles/HeaderColors'
const Colors = ColorsModule.Colors;
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IA_APIS from '../../src/api/IA_APIS';
import salvarIAAPIKey from '../../src/api/salvarIAAPIKey';
import getIAAPIKey from '../../src/api/getIAAPIKey';
import ConfiguracoesAvancadasScreen from '../../screens/ConfiguracoesAvancadasScreen';
import DashboardScreen from '../../screens/DashboardScreen';
import SobreAppScreen from '../../screens/SobreAppScreen';
import SelecionarCurriculoScreen from '../../screens/SelecionarCurriculoScreen';
import AnaliseCVScreen from '../../screens/AnaliseCVScreen';
import PerfilFotoScreen from '../../screens/PerfilFotoScreen';
import analisarCurriculoComIA from '../../curriculo/analisarCurriculoComIA';
import chamarIAAPI from '../../src/api/chamarIAAPI';
import DocumentIcon from '../../styles/DocumentIcon'

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

  // Nova função para editar currículo
  const handleEditCV = (cv) => {
    navigation.navigate('EditarCurriculo', { curriculoData: cv });
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
                
                {/* Novo botão de edição */}
                <TouchableOpacity
                  style={meusCurriculosStyles.curriculoCardAction}
                  onPress={() => handleEditCV(item)}
                >
                  <Text style={[
                    meusCurriculosStyles.curriculoCardActionText,
                    meusCurriculosStyles.curriculoCardActionPrimary
                  ]}>
                    <Text>✏️</Text> Editar
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
            
            {/* Adicionar opção de edição no menu de contexto também */}
            <TouchableOpacity
              style={meusCurriculosStyles.menuOption}
              onPress={() => {
                setShowMenu(false);
                const cv = curriculos.find(c => c.id === selectedCurriculoId);
                if (cv) handleEditCV(cv);
              }}
            >
              <Text>✏️</Text>
              <Text style={meusCurriculosStyles.menuOptionText}>Editar</Text>
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

export default MeusCurriculosScreen;