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
import ProfessionalColors from './ProfessionalColors';
import sharedStyles from './sharedStyles';

const DocumentIcon = ({ style }) => {
  return (
    <View style={[{
      width: 80,
      height: 80,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(78, 115, 223, 0.1)',
      borderRadius: 40,
    }, style]}>
      <Text style={{ fontSize: 40 }}>📄</Text>
    </View>
  );
};

export default {DocumentIcon}