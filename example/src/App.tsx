import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PortalProvider } from 'react-native-teleport';
import type { RootStackParamList } from './navigation/types';
import { HomeScreen } from './screens/HomeScreen';
import { LifecycleScreen } from './screens/LifecycleScreen';
import { ManualScreen } from './screens/ManualScreen';
import { TeleportScreen } from './screens/TeleportScreen';
import { TooltipOverlayScreen } from './screens/TooltipOverlayScreen';
import { TouchScreen } from './screens/TouchScreen';
import { TourScreen } from './screens/TourScreen';
import {
  Spotlight,
  SpotlightTooltipHost,
  useSpotlight,
} from 'react-native-nitro-spotlight';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const spotlight = useSpotlight();

  return (
    <SafeAreaProvider>
      <PortalProvider>
        <SpotlightTooltipHost spotlight={spotlight}>
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
              <Stack.Screen
                name="TooltipOverlay"
                component={TooltipOverlayScreen}
                options={{ title: 'Tooltip overlay' }}
              />
              <Stack.Screen name="Lifecycle" component={LifecycleScreen} />
              <Stack.Screen name="Teleport" component={TeleportScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </SpotlightTooltipHost>
        <Spotlight
          controls={spotlight}
          dimOpacity={0.72}
          borderRadius={14}
          padding={8}
          borderColor="#FFFFFF"
        />
      </PortalProvider>
    </SafeAreaProvider>
  );
}
