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

const PerfilFotoScreen = ({ navigation, route }) => {
  const { user, updateUser } = useAuth();
  const [selectedImage, setSelectedImage] = useState(user?.foto || null);
  const [loading, setLoading] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);

  // Cores predefinidas para avatares caso não haja foto
  const colorOptions = [
    '#3498db', '#2ecc71', '#e74c3c', '#f39c12',
    '#9b59b6', '#1abc9c', '#d35400', '#c0392b'
  ];

  // Imagens de exemplo para simular a galeria
  const exampleImages = [
    { id: 'img1', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' },
    { id: 'img2', uri: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop' },
    { id: 'img3', uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop' },
    { id: 'img4', uri: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop' },
    { id: 'img5', uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' },
    { id: 'img6', uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop' },
    { id: 'img7', uri: 'https://randomuser.me/api/portraits/men/1.jpg' },
    { id: 'img8', uri: 'https://randomuser.me/api/portraits/women/1.jpg' },
    { id: 'img9', uri: 'https://randomuser.me/api/portraits/men/32.jpg' },
    { id: 'img10', uri: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { id: 'img11', uri: 'https://randomuser.me/api/portraits/men/85.jpg' },
    { id: 'img12', uri: 'https://randomuser.me/api/portraits/women/63.jpg' },
  ];

  // Estado para controlar o avatar de cor selecionado (caso não use foto)
  const [selectedColorIndex, setSelectedColorIndex] = useState(
    user?.avatarColorIndex !== undefined ? user.avatarColorIndex : Math.floor(Math.random() * colorOptions.length)
  );

  // Função para salvar a foto do perfil
  const saveProfileImage = async () => {
    try {
      setLoading(true);

      // Buscar dados atuais do usuário
      const usuariosStr = await AsyncStorage.getItem('usuarios');
      const usuarios = JSON.parse(usuariosStr) || [];

      // Encontrar índice do usuário atual
      const userIndex = usuarios.findIndex(u => u.id === user.id);
      if (userIndex === -1) {
        throw new Error('Usuário não encontrado');
      }

      // Atualizar usuário com a nova foto e índice de cor do avatar
      const updatedUser = {
        ...usuarios[userIndex],
        foto: selectedImage,
        avatarColorIndex: selectedColorIndex,
        dataAtualizacao: new Date().toISOString()
      };

      usuarios[userIndex] = updatedUser;

      // Salvar usuários atualizados
      await AsyncStorage.setItem('usuarios', JSON.stringify(usuarios));

      // Atualizar usuário atual
      await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));

      // Se o contexto de autenticação tiver uma função para atualizar o usuário, use-a
      if (updateUser) {
        updateUser(updatedUser);
      }

      Alert.alert('Sucesso', 'Foto de perfil atualizada com sucesso!');

      // Navegar de volta se veio de uma rota específica
      if (route.params?.returnTo) {
        navigation.navigate(route.params.returnTo);
      } else {
        navigation.goBack();
      }

    } catch (error) {
      console.error('Erro ao salvar foto de perfil:', error);
      Alert.alert('Erro', 'Não foi possível salvar a foto de perfil.');
    } finally {
      setLoading(false);
    }
  };

  // Função para simular a captura de foto com a câmera
  const handleTakePhoto = () => {
    setShowImageOptions(false);

    // Simular o processo de tirar uma foto
    setLoading(true);
    setTimeout(() => {
      // Seleciona uma imagem aleatória da galeria para simular uma foto
      const randomIndex = Math.floor(Math.random() * exampleImages.length);
      setSelectedImage(exampleImages[randomIndex].uri);
      setLoading(false);

      Alert.alert('Foto Capturada', 'A foto foi capturada com sucesso! (Simulação)');
    }, 1500);
  };

  // Função para remover a foto de perfil
  const handleRemovePhoto = () => {
    Alert.alert(
      'Remover Foto',
      'Tem certeza que deseja remover sua foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setSelectedImage(null);
            setShowImageOptions(false);
          }
        }
      ]
    );
  };

  // Renderiza o avatar com iniciais caso não haja foto
  const renderInitialsAvatar = () => {
    const initials = user?.nome ? user.nome.charAt(0).toUpperCase() : 'U';
    const backgroundColor = colorOptions[selectedColorIndex];

    return (
      <View style={{
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Text style={{
          fontSize: 60,
          color: Colors.white,
          fontWeight: 'bold',
        }}>
          {initials}
        </Text>
      </View>
    );
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
        <Text style={styles.headerTitle}>Foto de Perfil</Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{
          padding: 20,
          alignItems: 'center',
        }}>
          {/* Avatar ou foto do perfil */}
          <TouchableOpacity
            style={{
              marginVertical: 20,
              borderWidth: 3,
              borderColor: Colors.primary,
              borderRadius: 75,
              padding: 3,
            }}
            onPress={() => setShowImageOptions(true)}
            disabled={loading}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: 75,
                }}
              />
            ) : (
              renderInitialsAvatar()
            )}

            {/* Ícone de câmera sobreposto */}
            <View style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: Colors.primary,
              borderRadius: 20,
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: Colors.white,
            }}>
              <Text style={{ fontSize: 18, color: Colors.white }}>📷</Text>
            </View>
          </TouchableOpacity>

          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            marginVertical: 10,
          }}>
            {user?.nome || 'Usuário'}
          </Text>

          <Text style={{
            fontSize: 16,
            color: Colors.lightText,
            marginBottom: 20,
            textAlign: 'center',
          }}>
            Selecione ou tire uma foto para seu perfil, ou escolha uma cor para o avatar com suas iniciais.
          </Text>

          {/* Seletor de cores para o avatar */}
          {!selectedImage && (
            <View style={{ marginVertical: 20 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                marginBottom: 10,
                textAlign: 'center',
              }}>
                Escolha uma cor para seu avatar
              </Text>

              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                {colorOptions.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: color,
                      margin: 5,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: selectedColorIndex === index ? 3 : 0,
                      borderColor: Colors.white,
                      elevation: selectedColorIndex === index ? 5 : 0,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: selectedColorIndex === index ? 0.3 : 0,
                      shadowRadius: selectedColorIndex === index ? 4 : 0,
                    }}
                    onPress={() => setSelectedColorIndex(index)}
                  >
                    {selectedColorIndex === index && (
                      <Text style={{ color: Colors.white, fontWeight: 'bold' }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Galeria de fotos de exemplo */}
          {showImageOptions && (
            <View style={{ marginTop: 20, width: '100%' }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 15,
                paddingHorizontal: 10,
              }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                }}>
                  Escolha uma Foto
                </Text>

                <TouchableOpacity
                  onPress={() => setShowImageOptions(false)}
                >
                  <Text style={{
                    fontSize: 22,
                    color: Colors.lightText,
                    paddingHorizontal: 5,
                  }}>
                    ×
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                marginBottom: 20,
              }}>
                <TouchableOpacity
                  style={{
                    alignItems: 'center',
                    backgroundColor: Colors.primary,
                    padding: 12,
                    borderRadius: 8,
                    width: '45%',
                  }}
                  onPress={handleTakePhoto}
                >
                  <Text style={{ color: Colors.white }}>Tirar Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    alignItems: 'center',
                    backgroundColor: Colors.danger,
                    padding: 12,
                    borderRadius: 8,
                    width: '45%',
                  }}
                  onPress={handleRemovePhoto}
                >
                  <Text style={{ color: Colors.white }}>Remover Foto</Text>
                </TouchableOpacity>
              </View>

              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                marginBottom: 10,
                paddingHorizontal: 10,
              }}>
                Selecione da Galeria:
              </Text>

              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                paddingHorizontal: 5,
              }}>
                {exampleImages.map((img, index) => (
                  <TouchableOpacity
                    key={img.id}
                    style={{
                      width: '30%',
                      aspectRatio: 1,
                      marginBottom: 10,
                      borderWidth: 2,
                      borderColor: selectedImage === img.uri ? Colors.primary : 'transparent',
                      borderRadius: 8,
                    }}
                    onPress={() => setSelectedImage(img.uri)}
                  >
                    <Image
                      source={{ uri: img.uri }}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 6,
                      }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={{
              backgroundColor: Colors.primary,
              paddingVertical: 12,
              paddingHorizontal: 30,
              borderRadius: 8,
              marginTop: 30,
              width: '80%',
              alignItems: 'center',
            }}
            onPress={saveProfileImage}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={{
                color: Colors.white,
                fontWeight: 'bold',
                fontSize: 16,
              }}>
                Salvar
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PerfilFotoScreen;