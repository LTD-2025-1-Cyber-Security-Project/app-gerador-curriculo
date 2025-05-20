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

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const DashboardStack = createStackNavigator();
const ConfigStack = createStackNavigator();
const ConfigAvStack = createStackNavigator();
const AuthContext = createContext();
const useAuth = () => useContext(AuthContext);
const AuthStack = createStackNavigator();
const AppStack = createStackNavigator();
const RootStack = createStackNavigator();

const MelhorarComIAButton = ({ curriculoData, onMelhoria }) => {
  const [loading, setLoading] = useState(false);
  
  const handleMelhorarComIA = async () => {
    try {
      setLoading(true);
      
      // Confirmar antes de proceder
      Alert.alert(
        "Melhorar com IA",
        "A IA irá melhorar a redação e apresentação do seu currículo, mantendo todas as informações verdadeiras. Deseja continuar?",
        [
          { text: "Cancelar", style: "cancel" },
          { 
            text: "Continuar", 
            onPress: async () => {
              // Chamar a função de melhoria
              const resultado = await melhorarCurriculoComIA(curriculoData.data);
              
              if (resultado.success) {
                // Chamar a função de callback com os dados melhorados
                onMelhoria(resultado.curriculoMelhorado);
              } else {
                Alert.alert("Erro", resultado.error || "Não foi possível melhorar o currículo.");
              }
              
              setLoading(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao melhorar currículo:', error);
      Alert.alert("Erro", "Ocorreu um erro ao tentar melhorar o currículo.");
      setLoading(false);
    }
  };
  
  return (
    <TouchableOpacity
      style={{
        backgroundColor: Colors.info,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
      }}
      onPress={handleMelhorarComIA}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={Colors.white} />
      ) : (
        <>
          <Text style={{ color: Colors.white, fontWeight: 'bold', marginRight: 5 }}>✨</Text>
          <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
            Melhorar com IA
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export default MelhorarComIAButton;