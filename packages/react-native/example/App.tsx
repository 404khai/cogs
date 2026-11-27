import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { GestureResponderEvent, LayoutRectangle } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CHASSIS, Cog, DEFAULT, EXPRESSIONS, PAINTS, ROSTER, SCREENS, resolveCog, toJSON } from '@404khai/cogs-react-native';
import type { CogConfig, Gaze } from '@404khai/cogs-react-native';

const INK = '#1d2326';
const MUTED = '#6b7378';
const PAPER = '#eef0ea';
const CARD = '#f8f9f5';

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.label}>{title}</Text>
      {children}
    </View>
  );
}

export default function App() {
  const [cog, setCog] = useState<CogConfig>(DEFAULT);
  const [gaze, setGaze] = useState<Gaze | null>(null);
  const [box, setBox] = useState<LayoutRectangle | null>(null);
  const [json, setJson] = useState(() => toJSON(DEFAULT));
  const [warnings, setWarnings] = useState<string[]>([]);

  const set = (p: Partial<CogConfig>) => {
    const next = { ...cog, ...p };
    setCog(next);
    setJson(toJSON(next));
    setWarnings([]);
  };

  // Drag a finger across the stage and the eyes follow it; let go and they wander again.
  const look = (e: GestureResponderEvent) => {
    if (!box) return;
    const { locationX, locationY } = e.nativeEvent;
    setGaze({ x: (locationX - box.width / 2) / (box.width / 2), y: (locationY - box.height / 2) / (box.height / 2) });
  };

  const build = () => {
    const { config, warnings } = resolveCog(json);
    setCog(config);
    setWarnings(warnings);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>cogs</Text>
          <Text style={s.sub}>@404khai/cogs-react-native · drag on the stage to steer the eyes</Text>

          <View
            style={s.stage}
            onLayout={(e) => setBox(e.nativeEvent.layout)}
            onStartShouldSetResponder={() => true}
            onResponderGrant={look}
            onResponderMove={look}
            onResponderRelease={() => setGaze(null)}
          >
            <Cog unit={cog} gaze={gaze} size={240} />
            <Text style={s.name}>{cog.name}</Text>
          </View>

          <Section title="Chassis">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
              {CHASSIS.map((ch) => (
                <Pressable key={ch.id} onPress={() => set({ chassis: ch.id })} style={[s.tile, cog.chassis === ch.id && s.tileOn]}>
                  <Cog unit={cog} chassis={ch.id} screen="eyes" size={60} />
                  <Text style={s.tileText}>{ch.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Section>

          <Section title="Expression">
            <View style={s.wrap}>
              {EXPRESSIONS.map((x) => <Chip key={x.id} label={x.name} on={cog.expression === x.id} onPress={() => set({ expression: x.id, screen: 'eyes' })} />)}
            </View>
          </Section>

          <Section title="Display">
            <View style={s.wrap}>
              {SCREENS.map((x) => <Chip key={x.id} label={x.label} on={cog.screen === x.id} onPress={() => set({ screen: x.id })} />)}
            </View>
          </Section>

          <Section title="Paint">
            <View style={s.wrap}>
              {PAINTS.map((p) => (
                <Pressable key={p.hex} onPress={() => set({ color: p.hex })} style={[s.swatch, { backgroundColor: p.hex }, cog.color === p.hex && s.swatchOn]} accessibilityLabel={p.name} />
              ))}
            </View>
          </Section>

          <Section title="Cog JSON">
            <TextInput style={s.json} value={json} onChangeText={setJson} multiline autoCapitalize="none" autoCorrect={false} spellCheck={false} />
            <Pressable onPress={build} style={s.button}>
              <Text style={s.buttonText}>Build from JSON</Text>
            </Pressable>
            {warnings.map((w) => <Text key={w} style={s.warn}>{w}</Text>)}
          </Section>

          <Section title="Roster">
            <View style={s.grid}>
              {ROSTER.map((u) => (
                <Pressable key={u.name} style={s.card} onPress={() => set(u)}>
                  <Cog unit={u} size={96} />
                  <Text style={s.cardName}>{u.name}</Text>
                  <Text style={s.cardRole}>{u.role}</Text>
                </Pressable>
              ))}
            </View>
          </Section>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER },
  page: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 40, fontWeight: '700', color: INK, letterSpacing: -1.5 },
  sub: { color: MUTED, marginTop: 4 },
  stage: { alignItems: 'center', marginTop: 20, paddingVertical: 16, borderRadius: 20, backgroundColor: CARD },
  name: { marginTop: 4, fontSize: 16, fontWeight: '600', color: INK },
  section: { marginTop: 24 },
  label: { fontSize: 12, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  row: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { alignItems: 'center', padding: 6, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  tileOn: { borderColor: INK },
  tileText: { fontSize: 11, color: MUTED },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: CARD, borderWidth: 1, borderColor: '#d8dbd3' },
  chipOn: { backgroundColor: INK, borderColor: INK },
  chipText: { color: INK, fontSize: 13 },
  chipTextOn: { color: '#fff' },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: INK },
  json: { fontFamily: 'Menlo', fontSize: 12, color: INK, backgroundColor: CARD, borderRadius: 12, padding: 12, minHeight: 200, textAlignVertical: 'top' },
  button: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: INK, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: '600' },
  warn: { color: '#b5502b', marginTop: 6, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '47%', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: CARD },
  cardName: { marginTop: 4, fontWeight: '600', color: INK },
  cardRole: { fontSize: 12, color: MUTED },
});
