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
import analisarCurriculoComIA from '../curriculo/analisarCurriculoComIA';

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

export default salvarCurriculo;