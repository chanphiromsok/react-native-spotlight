import { callback, getHostComponent } from 'react-native-nitro-modules';
const SpotlightConfig = require('../nitrogen/generated/shared/json/SpotlightViewConfig.json');
import type { SpotlightMethods, SpotlightProps } from './Spotlight.nitro';
import { StyleSheet } from 'react-native';
import { useEffect, useRef } from 'react';
import { findNodeHandle } from 'react-native';

export const SpotlightView = getHostComponent<SpotlightProps, SpotlightMethods>(
  'SpotlightView',
  () => SpotlightConfig
);

type Props = {
  targetRef: React.RefObject<any>;
  targetId: string;
};

export const WalkthroughSpotlight = ({
  targetRef,
  targetId: _targetId,
}: Props) => {
  const spotlightRef = useRef<any>(null);

  useEffect(() => {
    const tag = findNodeHandle(targetRef.current);
    if (!tag || !spotlightRef.current) return;

    // Sync measure — no worklet needed
    const layout = spotlightRef.current.measureViewByTag(tag);

    // Animate spotlight + immediately tell JS where it is
    spotlightRef.current.highlightAnimated(
      layout.x,
      layout.y,
      layout.width,
      layout.height,
      250
    );

    return () => {
      spotlightRef.current?.clear();
    };
  }, [targetRef]);

  return (
    <SpotlightView
      style={StyleSheet.absoluteFill}
      dimOpacity={0.55}
      cornerRadius={12}
      padding={6}
      onTargetLayout={callback((_rect) => {})}
      hybridRef={callback((ref) => {
        spotlightRef.current = ref;
      })}
    />
  );
};
