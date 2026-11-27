import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { AppIcon, type AppIconName } from './AppIcon';
import { Chip, Field, type PressState } from './components';
import { colors, DREAM_COLORS, fonts, LUCIDITY_LABELS } from './theme';

// ---------------------------------------------------------------- Lune (lucidité)

/** Dessin d'une phase de lune : fraction éclairée de 0 (nouvelle lune) à 1 (pleine lune). */
export function Moon(props: { fraction: number; size: number; lit?: string; dark?: string; ring?: string }) {
  const { size } = props;
  const r = size / 2 - 2;
  const c = size / 2;
  const f = Math.min(1, Math.max(0, props.fraction));
  const rx = Math.abs(1 - 2 * f) * r;
  const sweep = f > 0.5 ? 1 : 0;
  const lit = `M ${c} ${c - r} A ${r} ${r} 0 0 1 ${c} ${c + r} A ${rx} ${r} 0 0 ${sweep} ${c} ${c - r} Z`;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r} fill={props.dark ?? '#211c40'} stroke={props.ring ?? colors.border} strokeWidth={1.5} />
      {f > 0 && <Path d={lit} fill={props.lit ?? colors.ink} />}
    </Svg>
  );
}

export function LucidityScale(props: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.scaleRow} accessibilityRole="radiogroup" accessibilityLabel="Lucidité">
        {LUCIDITY_LABELS.map((label, i) => {
          const on = props.value === i;
          const reached = props.value !== null && i <= props.value;
          return (
            <Pressable
              key={i}
              onPress={() => props.onChange(on ? null : i)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`Lucidité ${i} : ${label}`}
              testID={`lucidity-${i}`}
              style={({ hovered }: PressState) => [styles.scaleItem, on && styles.scaleItemOn, hovered && !on && { backgroundColor: colors.surfaceHover }]}
            >
              <AppIcon name={`lucidite-b-${i}` as AppIconName} size={30} dim={props.value !== null && !reached} />
              <Text style={[styles.scaleNum, reached && { color: colors.ochre }]}>{i}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.scaleLabel}>{props.value === null ? 'De 0 (pas lucide) à 5 (contrôle total)' : LUCIDITY_LABELS[props.value]}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- Échelles à emojis (humeur, clarté, atmosphère)

/** Échelle à degrés en emojis : on touche un emoji ; le retoucher efface le choix. */
export function EmojiScale(props: {
  levels: readonly { value: number; emoji: string; label: string; image?: string }[];
  value: number | null;
  onChange: (v: number | null) => void;
  name: string;
  placeholder: string;
  testID: string;
}) {
  const current = props.levels.find((m) => m.value === props.value);
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.scaleRow} accessibilityRole="radiogroup" accessibilityLabel={props.name}>
        {props.levels.map((m) => {
          const on = props.value === m.value;
          const dim = props.value !== null && !on;
          return (
            <Pressable
              key={m.value}
              onPress={() => props.onChange(on ? null : m.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${props.name} ${m.value} : ${m.label}`}
              testID={`${props.testID}-${m.value}`}
              style={({ hovered }: PressState) => [styles.scaleItem, on && styles.scaleItemOn, hovered && !on && { backgroundColor: colors.surfaceHover }]}
            >
              {m.image ? <AppIcon name={m.image as AppIconName} size={30} dim={dim} /> : <Text style={[styles.emoji, dim && { opacity: 0.45 }]}>{m.emoji}</Text>}
              <Text style={[styles.scaleNum, on && { color: colors.ochre }]}>{m.value}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.scaleLabel}>{current ? current.label : props.placeholder}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- Grilles d'emojis à cocher (météo, moment, type, émotions)

export interface EmojiChoice {
  id: string;
  emoji: string;
  label: string;
  image?: string;
}

/** Choix multiple dans une grille d'emojis, avec ajout de mots libres si `allowCustom`. */
export function EmojiPicker(props: {
  options: EmojiChoice[];
  value: string[];
  onChange: (v: string[]) => void;
  allowCustom?: boolean;
  customPlaceholder?: string;
  testID: string;
}) {
  const [draft, setDraft] = useState('');
  const custom = props.value.filter((v) => !props.options.some((o) => o.id === v));
  const all: EmojiChoice[] = [...props.options, ...custom.map((c) => ({ id: c, emoji: '✦', label: c }))];
  const toggle = (id: string) => props.onChange(props.value.includes(id) ? props.value.filter((v) => v !== id) : [...props.value, id]);
  const add = () => {
    const t = draft.trim();
    setDraft('');
    if (!t) return;
    const known = props.options.find((o) => o.label.toLowerCase() === t.toLowerCase());
    const id = known ? known.id : t;
    if (!props.value.includes(id)) props.onChange([...props.value, id]);
  };
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.emojiGrid}>
        {all.map((o) => {
          const on = props.value.includes(o.id);
          return (
            <Pressable
              key={o.id}
              onPress={() => toggle(o.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={o.label}
              testID={`${props.testID}-${o.id}`}
              style={({ hovered }: PressState) => [styles.emojiTile, on && styles.emojiTileOn, hovered && !on && { backgroundColor: colors.surfaceHover }]}
            >
              {o.image ? <AppIcon name={o.image as AppIconName} size={32} /> : <Text style={styles.emojiSmall}>{o.emoji}</Text>}
              <Text style={[styles.emojiLabel, on && { color: colors.text }]} numberOfLines={2}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {props.allowCustom && (
        <Field
          value={draft}
          onChangeText={setDraft}
          placeholder={props.customPlaceholder ?? 'Autre… puis Entrée'}
          onSubmitEditing={add}
          onBlur={add}
          blurOnSubmit={false}
          returnKeyType="done"
          testID={`${props.testID}-input`}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------- Petits emojis à cocher (météo, moment)

/** Rangée compacte de petits emojis ronds, plusieurs choix possibles ; les choix s'affichent en dessous. */
export function CompactEmojiPicker(props: {
  options: { id: string; emoji: string; label: string; image?: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  /** Valeurs anciennes hors de la liste : affichées et retirables. */
  legacy?: { id: string; emoji: string; label: string; image?: string }[];
  testID: string;
}) {
  const extra = props.value.filter((v) => !props.options.some((o) => o.id === v)).map((v) => props.legacy?.find((o) => o.id === v) ?? { id: v, emoji: '✦', label: v });
  const all = [...props.options, ...extra];
  const toggle = (id: string) => props.onChange(props.value.includes(id) ? props.value.filter((v) => v !== id) : [...props.value, id]);
  const chosen = all.filter((o) => props.value.includes(o.id)).map((o) => o.label);
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.miniRow}>
        {all.map((o) => {
          const on = props.value.includes(o.id);
          return (
            <Pressable
              key={o.id}
              onPress={() => toggle(o.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={o.label}
              {...({ title: o.label } as object)}
              testID={`${props.testID}-${o.id}`}
              style={({ hovered }: PressState) => [styles.mini, on && styles.miniOn, hovered && !on && { backgroundColor: colors.surfaceHover }]}
            >
              {o.image ? (
                <AppIcon name={o.image as AppIconName} size={30} dim={props.value.length > 0 && !on} />
              ) : (
                <Text style={[styles.miniEmoji, props.value.length > 0 && !on && { opacity: 0.5 }]}>{o.emoji}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
      {chosen.length > 0 && <Text style={styles.miniLabel}>{chosen.join(' · ')}</Text>}
    </View>
  );
}

// ---------------------------------------------------------------- Humeur (0 à 5, un emoji au choix par niveau)

export function MoodPicker(props: {
  grid: { level: number; label: string; emojis: string[]; images?: string[] }[];
  level: number | null;
  emoji: string | null;
  onChange: (level: number | null, emoji: string | null) => void;
}) {
  const current = props.grid.find((g) => g.level === props.level);
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.moodGrid} accessibilityRole="radiogroup" accessibilityLabel="Humeur">
        {props.grid.map((g) => (
          <View key={g.level} style={styles.moodCol}>
            <Text style={[styles.moodNum, props.level === g.level && { color: colors.ochre }]}>{g.level}</Text>
            {g.emojis.map((e, i) => {
              const on = props.level === g.level && (props.emoji === e || (!props.emoji && i === 0));
              return (
                <Pressable
                  key={e + i}
                  onPress={() => (on ? props.onChange(null, null) : props.onChange(g.level, e))}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`Humeur ${g.level}, ${g.label}`}
                  testID={`mood-${g.level}-${i}`}
                  style={({ hovered }: PressState) => [styles.mini, on && styles.miniOn, hovered && !on && { backgroundColor: colors.surfaceHover }]}
                >
                  {g.images?.[i] ? (
                    <AppIcon name={g.images[i] as AppIconName} size={32} dim={props.level !== null && !on} />
                  ) : (
                    <Text style={[styles.miniEmoji, props.level !== null && !on && { opacity: 0.45 }]}>{e}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Text style={styles.miniLabel}>{current ? `${current.label} (${current.level}/5)` : 'Humeur de 0 (horrible) à 5 (excellente)'}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- Couleurs (aquarelle)

/** Forme de tache irrégulière, toujours la même pour une même graine. */
function blobPath(size: number, seed: number) {
  const c = size / 2;
  const n = 9;
  const pts: [number, number][] = [];
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = c * (0.72 + rnd() * 0.24);
    pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
  }
  let d = `M ${(pts[0][0] + pts[n - 1][0]) / 2} ${(pts[0][1] + pts[n - 1][1]) / 2}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    d += ` Q ${p[0]} ${p[1]} ${(p[0] + q[0]) / 2} ${(p[1] + q[1]) / 2}`;
  }
  return d + ' Z';
}

export function WatercolorDot(props: { color: string; size: number; seed?: number }) {
  const id = useMemo(() => 'g' + Math.random().toString(36).slice(2), []);
  return (
    <Svg width={props.size} height={props.size} viewBox={`0 0 ${props.size} ${props.size}`}>
      <Defs>
        <RadialGradient id={id} cx="45%" cy="40%" r="60%">
          <Stop offset="0" stopColor={props.color} stopOpacity={0.95} />
          <Stop offset="0.75" stopColor={props.color} stopOpacity={0.7} />
          <Stop offset="1" stopColor={props.color} stopOpacity={0.35} />
        </RadialGradient>
      </Defs>
      <Path d={blobPath(props.size, props.seed ?? 1)} fill={`url(#${id})`} />
    </Svg>
  );
}

export function ColorPicker(props: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const max = props.max ?? 4;
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.colorGrid}>
        {DREAM_COLORS.map((c, i) => {
          const on = props.value.includes(c.hex);
          return (
            <Pressable
              key={c.hex}
              onPress={() => {
                if (on) props.onChange(props.value.filter((x) => x !== c.hex));
                else props.onChange([...props.value, c.hex].slice(-max));
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={c.name}
              testID={`color-${c.name}`}
              style={({ hovered }: PressState) => [styles.colorItem, on && styles.colorItemOn, hovered && !on && { backgroundColor: colors.surfaceHover }]}
            >
              <WatercolorDot color={c.hex} size={34} seed={i + 3} />
              {on && (
                <View style={styles.colorCheck}>
                  <Ionicons name="checkmark" size={14} color={colors.accentText} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.scaleLabel}>
        {props.value.length
          ? `${props.value.map((h) => DREAM_COLORS.find((c) => c.hex === h)?.name ?? h).join(', ')} — elles teinteront la carte`
          : `Jusqu’à ${max} couleurs : elles teinteront les lieux du rêve sur la carte`}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------- Listes de mots (ambiances, étiquettes)

/**
 * Choix multiple parmi des suggestions + ajout libre.
 * `suggestions` : mots proposés (toujours visibles si `showSuggestions`), sinon filtrés pendant la saisie.
 */
export function WordPicker(props: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
  placeholder: string;
  alwaysShowSuggestions?: boolean;
  testID?: string;
}) {
  const [draft, setDraft] = useState('');
  const has = (w: string) => props.value.some((v) => v.toLowerCase() === w.toLowerCase());
  const add = (w: string) => {
    const t = w.trim();
    if (!t || has(t)) return;
    props.onChange([...props.value, t]);
  };
  const q = draft.trim().toLowerCase();
  const visible = props.alwaysShowSuggestions
    ? props.suggestions
    : q
      ? props.suggestions
          .filter((s) => !has(s) && s.toLowerCase().includes(q))
          .sort((a, b) => Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q)) || a.localeCompare(b))
          .slice(0, 12)
      : [];
  const extra = props.value.filter((v) => !props.suggestions.some((s) => s.toLowerCase() === v.toLowerCase()));

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.wrap}>
        {props.alwaysShowSuggestions
          ? [...visible, ...extra].map((w) => (
              <Chip
                key={w}
                label={w}
                selected={has(w)}
                onPress={() => (has(w) ? props.onChange(props.value.filter((v) => v.toLowerCase() !== w.toLowerCase())) : add(w))}
                testID={props.testID ? `${props.testID}-${w}` : undefined}
              />
            ))
          : props.value.map((w) => (
              <Chip key={w} label={w} selected onRemove={() => props.onChange(props.value.filter((v) => v !== w))} testID={props.testID ? `${props.testID}-${w}` : undefined} />
            ))}
      </View>
      <Field
        value={draft}
        onChangeText={setDraft}
        placeholder={props.placeholder}
        onSubmitEditing={() => {
          add(draft);
          setDraft('');
        }}
        blurOnSubmit={false}
        returnKeyType="done"
        testID={props.testID ? `${props.testID}-input` : undefined}
      />
      {!props.alwaysShowSuggestions && q.length > 0 && (
        <View style={styles.wrap}>
          {q && !has(draft) && !props.suggestions.some((s) => s.toLowerCase() === q) && (
            <Chip
              label={`Ajouter « ${draft.trim()} »`}
              icon="add"
              onPress={() => {
                add(draft);
                setDraft('');
              }}
            />
          )}
          {visible.map((w) => (
            <Chip
              key={w}
              label={w}
              icon="pricetag-outline"
              onPress={() => {
                add(w);
                setDraft('');
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scaleItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 44,
    minHeight: 52,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    flexGrow: 1,
  },
  scaleItemOn: { borderColor: colors.ochre, backgroundColor: colors.surfaceActive },
  scaleNum: { color: colors.faint, fontFamily: fonts.bodySemi, fontSize: 13 },
  scaleLabel: { color: colors.muted, fontFamily: fonts.bodyItalic, fontSize: 14, textAlign: 'center' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  colorItem: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  colorItemOn: { borderColor: colors.text, backgroundColor: colors.surfaceActive },
  colorCheck: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  mini: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  miniOn: { borderColor: colors.ochre, backgroundColor: colors.surfaceActive },
  miniEmoji: { fontSize: 22, lineHeight: 28 },
  miniLabel: { color: colors.muted, fontFamily: fonts.bodyItalic, fontSize: 14 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between' },
  moodCol: { alignItems: 'center', gap: 2, minWidth: 44 },
  moodNum: { color: colors.faint, fontFamily: fonts.bodySemi, fontSize: 13 },
  emoji: { fontSize: 24, lineHeight: 30 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emojiTile: {
    width: 88,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bg,
  },
  emojiTileOn: { borderColor: colors.ochre, backgroundColor: colors.surfaceActive },
  emojiSmall: { fontSize: 26, lineHeight: 32 },
  emojiLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 16, textAlign: 'center' },
});
