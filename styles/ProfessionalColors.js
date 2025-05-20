import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
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

const ProfessionalColors = {
  primary: '#0062cc',         // Azul profissional mais escuro
  secondary: '#4e73df',       // Azul secundário 
  tertiary: '#2c9faf',        // Azul esverdeado para destacar
  backgroundLight: '#f8f9fc', // Fundo claro
  cardBackground: '#ffffff',  // Branco para cartões
  textDark: '#333333',        // Texto escuro
  textMedium: '#5a5c69',      // Texto médio para descrições
  textLight: '#858796',       // Texto claro para informações secundárias
  border: '#e3e6f0',          // Bordas sutis
  success: '#1cc88a',         // Verde para ações positivas
  danger: '#e74a3b',          // Vermelho para ações negativas
  warning: '#f6c23e',         // Amarelo para alertas
  info: '#36b9cc'             // Azul claro para informações
};

export default ProfessionalColors;
