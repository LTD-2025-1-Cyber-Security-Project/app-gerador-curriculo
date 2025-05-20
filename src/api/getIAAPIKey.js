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
import ColorsModule from '../../styles/colors';
import styles from '../../styles/styles';
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
import IA_APIS from './IA_APIS';

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

export default getIAAPIKey;