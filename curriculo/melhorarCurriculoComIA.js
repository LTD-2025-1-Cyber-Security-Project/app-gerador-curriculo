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

const melhorarCurriculoComIA = async (curriculoData) => {
  try {
    // Obter API key do Gemini ou outro provedor disponível
    const apiKey = await getIAAPIKey('GEMINI');
    
    if (!apiKey) {
      throw new Error("API key do Gemini não configurada");
    }
    
    // Formatar o currículo para envio à IA
    const cvFormatado = formatarCurriculo(curriculoData);
    
    // Construir o prompt para a IA
    const promptText = `
Você é um especialista em recrutamento e elaboração de currículos profissionais. Sua tarefa é melhorar o currículo abaixo, mantendo todas as informações verdadeiras, mas tornando-o mais atrativo, profissional e eficaz.

- Melhore o resumo profissional para destacar competências e realizações
- Reformule as descrições de experiência para enfatizar resultados e impacto
- Padronize a formatação e estrutura 
- Mantenha todas as informações factuais e datas inalteradas
- Use linguagem mais dinâmica e verbos de ação
- Elimine repetições e informações desnecessárias
- Inclua palavras-chave relevantes para a área

NÃO INVENTE informações falsas ou exageradas. Mantenha-se fiel ao conteúdo original.

CURRÍCULO ORIGINAL:
${cvFormatado}

Retorne o currículo melhorado no formato JSON com a mesma estrutura do original, mas com conteúdo aprimorado. Mantenha os nomes das propriedades exatamente iguais.
    `;
    
    // Chamar a API do Gemini
    const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
    const requestBody = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.3,
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
      
      // Extrair o JSON da resposta
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          // Converter o texto JSON em objeto
          const melhoradoData = JSON.parse(jsonMatch[0]);
          
          return {
            success: true,
            curriculoMelhorado: melhoradoData
          };
        } catch (jsonError) {
          console.error('Erro ao parsear JSON da resposta:', jsonError);
          throw new Error('Formato de resposta inválido');
        }
      } else {
        throw new Error('Não foi possível extrair currículo melhorado da resposta');
      }
    } else {
      throw new Error('Formato de resposta inesperado do Gemini');
    }
  } catch (error) {
    console.error('Erro ao melhorar currículo com IA:', error);
    return {
      success: false,
      error: error.message || 'Erro ao processar o currículo'
    };
  }
};

export default melhorarCurriculoComIA;