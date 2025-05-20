import ConfiguracoesAvancadasScreen from './ConfiguracoesAvancadasScreen';

const ConfigAvStackScreen = () => (
  <ConfigAvStack.Navigator screenOptions={{ headerShown: false }}>
    <ConfigAvStack.Screen name="ConfigAvMain" component={ConfiguracoesAvancadasScreen} />
  </ConfigAvStack.Navigator>
);

export default ConfigAvStackScreen;