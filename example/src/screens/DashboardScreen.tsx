// src/screens/DashboardScreen.tsx
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useSpotlight,
  useSpotlightTooltip,
} from 'react-native-nitro-spotlight';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = 'idle' | 'header' | 'card';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function DashboardScreen() {
  const spotlight = useSpotlight();
  const tooltip = useSpotlightTooltip(); // provided by SpotlightTooltipHost in App.tsx

  const headerRef = useRef<ComponentRef<typeof View>>(null);
  const cardRef = useRef<ComponentRef<typeof View>>(null);

  const [step, setStep] = useState<Step>('idle');

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const endTour = useCallback(() => {
    spotlight.clear();
    tooltip.hide();
    setStep('idle');
  }, [spotlight, tooltip]);

  const goToStep2 = useCallback(() => {
    cardRef.current?.measureInWindow((x, y, width, height) => {
      const rect: Rect = { x, y, width, height };
      setStep('card');
      spotlight.highlight(cardRef, { durationMs: 300 });
      tooltip.show(
        <TooltipCard
          title="Transfer Money"
          body="Tap this card to send funds instantly to any Wing or Bakong account."
          step="2 / 2"
          nextLabel="Done"
          onNext={endTour}
          onDone={endTour}
        />,
        rect,
        'bottom'
      );
    });
  }, [spotlight, tooltip, endTour]);

  const startTour = useCallback(() => {
    headerRef.current?.measureInWindow((x, y, width, height) => {
      const rect: Rect = { x, y, width, height };
      setStep('header');
      spotlight.highlight(headerRef, { durationMs: 300 });
      tooltip.show(
        <TooltipCard
          title="Your Dashboard"
          body="See your balance, recent transfers, and notifications here."
          step="1 / 2"
          onNext={goToStep2}
          onDone={endTour}
        />,
        rect,
        'bottom'
      );
    });
  }, [spotlight, tooltip, goToStep2, endTour]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safe}>
      {/* Target 1 — simulated header (within the screen body here, but could be
          a native navigation header measured via headerRef in a real app) */}
      <View ref={headerRef} collapsable={false} style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSub}>Wing Bank</Text>
      </View>

      <View style={styles.body}>
        {/* Target 2 — card */}
        <View ref={cardRef} collapsable={false} style={styles.card}>
          <Text style={styles.cardTitle}>Transfer Money</Text>
          <Text style={styles.cardSub}>
            Send funds instantly to any Wing account
          </Text>
        </View>

        {step === 'idle' && (
          <TouchableOpacity style={styles.startBtn} onPress={startTour}>
            <Text style={styles.startBtnText}>Start Tour</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Tooltip card — plain JSX, no navigator/screen dependency
// ---------------------------------------------------------------------------

interface TooltipCardProps {
  title: string;
  body: string;
  step: string;
  nextLabel?: string;
  onNext: () => void;
  onDone: () => void;
}

function TooltipCard({
  title,
  body,
  step,
  nextLabel = 'Next →',
  onNext,
  onDone,
}: TooltipCardProps) {
  return (
    <View style={tc.card}>
      <Text style={tc.step}>{step}</Text>
      <Text style={tc.title}>{title}</Text>
      <Text style={tc.body}>{body}</Text>
      <View style={tc.row}>
        <TouchableOpacity onPress={onDone} style={tc.skipBtn}>
          <Text style={tc.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onNext} style={tc.nextBtn}>
          <Text style={tc.nextText}>{nextLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc' },
  headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  body: { flex: 1, padding: 24 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#f8fafc' },
  cardSub: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  startBtn: {
    marginTop: 32,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

const tc = StyleSheet.create({
  card: {
    width: 260,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  step: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#f1f5f9', marginBottom: 6 },
  body: { fontSize: 13, color: '#94a3b8', lineHeight: 19 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 8,
  },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  skipText: { color: '#64748b', fontSize: 14 },
  nextBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  nextText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
