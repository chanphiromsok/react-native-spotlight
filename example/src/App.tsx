import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PortalProvider } from 'react-native-teleport';
import type { RootStackParamList } from './navigation/types';
import { FullWindowScreen } from './screens/FullWindowScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LifecycleScreen } from './screens/LifecycleScreen';
import { ManualScreen } from './screens/ManualScreen';
import { TeleportScreen } from './screens/TeleportScreen';
import { TouchScreen } from './screens/TouchScreen';
import { TourScreen } from './screens/TourScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <PortalProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: '#101624' },
              headerTintColor: '#F5F8FF',
              headerTitleStyle: { fontWeight: '800' },
              contentStyle: { backgroundColor: '#101624' },
            }}
          >
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="Manual" component={ManualScreen} />
            <Stack.Screen
              name="Tour"
              component={TourScreen}
              options={{ headerBackButtonMenuEnabled: false }}
            />
            <Stack.Screen name="Touch" component={TouchScreen} />
            <Stack.Screen name="Lifecycle" component={LifecycleScreen} />
            <Stack.Screen name="Teleport" component={TeleportScreen} />
            <Stack.Screen name="FullWindow" component={FullWindowScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </PortalProvider>
    </SafeAreaProvider>
  );
}
