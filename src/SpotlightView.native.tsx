import { getHostComponent } from 'react-native-nitro-modules';
const SpotlightConfig = require('../nitrogen/generated/shared/json/SpotlightConfig.json');
import type {
  SpotlightMethods,
  SpotlightProps,
} from './Spotlight.nitro';

export const SpotlightView = getHostComponent<
  SpotlightProps,
  SpotlightMethods
>('Spotlight', () => SpotlightConfig);
