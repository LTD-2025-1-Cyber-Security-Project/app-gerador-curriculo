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

export default ConfiguracoesIAScreen;