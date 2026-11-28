/** Éléments communs aux pages de lecture (rêve, note rapide, sommeil). */
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle } from 'react-native';
import { AppIcon, type AppIconName } from './AppIcon';
import { Button, IconButton, type PressState } from './components';
import { colors, fonts } from './theme';

/** Barre au-dessus de la page : tourner les pages, Modifier, Supprimer. */
export function PageToolbar(props: { phone: boolean; onPrev?: () => void; onNext?: () => void; onEdit: () => void; onDelete: () => void; prevLabel?: string; nextLabel?: string }) {
  const prev = props.prevLabel ?? 'Page précédente';
  const next = props.nextLabel ?? 'Page suivante';
  return (
    <View style={styles.toolbar}>
      {props.phone ? (
        <IconButton image="page-precedente" size={24} label={prev} onPress={() => props.onPrev?.()} testID="page-prev" />
      ) : (
        <Pressable onPress={props.onPrev} disabled={!props.onPrev} accessibilityRole="button" style={[styles.turn, !props.onPrev && { opacity: 0.35 }]} testID="page-prev">
          <AppIcon name="page-precedente" size={30} />
          <Text style={styles.turnText}>{prev}</Text>
        </Pressable>
      )}
      <View style={{ flex: 1 }} />
      <Button small label="Modifier" image="modifier" onPress={props.onEdit} testID="page-edit" />
      <IconButton image="supprimer" size={20} label="Supprimer" onPress={props.onDelete} testID="page-delete" />
      <View style={{ flex: 1 }} />
      {props.phone ? (
        <IconButton image="page-suivante" size={24} label={next} onPress={() => props.onNext?.()} testID="page-next" />
      ) : (
        <Pressable onPress={props.onNext} disabled={!props.onNext} accessibilityRole="button" style={[styles.turn, !props.onNext && { opacity: 0.35 }]} testID="page-next">
          <Text style={styles.turnText}>{next}</Text>
          <AppIcon name="page-suivante" size={30} />
        </Pressable>
      )}
    </View>
  );
}

/**
 * La page elle-même. Sur un grand écran : une double page de grimoire (left / right) ; sinon une seule colonne
 * dans le même ordre.
 */
export function Book(props: { wide: boolean; left: ReactNode; right: ReactNode; bottomInset: number; toolbar: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scroll, { paddingBottom: 24 + props.bottomInset }, props.wide && styles.scrollWide]} keyboardShouldPersistTaps="handled">
      {props.toolbar}
      {props.wide ? (
        <View style={styles.book}>
          <View style={[styles.page, styles.pageLeft]}>{props.left}</View>
          <View style={styles.gutter} />
          <View style={[styles.page, styles.pageRight]}>{props.right}</View>
        </View>
      ) : (
        <View style={styles.single}>
          {props.left}
          {props.right}
        </View>
      )}
    </ScrollView>
  );
}

export function SectionLabel(props: { children: string }) {
  return <Text style={styles.label}>{props.children.toUpperCase()}</Text>;
}

export function Ornament() {
  return (
    <View style={styles.ornament} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.rule, { opacity: 0.5 }]} />
      <Text style={{ color: colors.bronze, fontSize: 13 }}>✦</Text>
      <View style={[styles.rule, { opacity: 0.5 }]} />
    </View>
  );
}

/** Une case à toucher : l'humeur, la lucidité, la qualité… */
export function Tile(props: { image?: AppIconName; label: string; caption: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={`${props.caption} : ${props.label}`}
      testID={props.testID}
      style={({ hovered, pressed }: PressState) => [styles.tile, (hovered || pressed) && { backgroundColor: colors.surfaceHover }]}
    >
      {props.image && <AppIcon name={props.image} size={40} />}
      <Text style={styles.tileLabel} numberOfLines={2}>
        {props.label}
      </Text>
      <Text style={styles.tileCaption}>{props.caption.toUpperCase()}</Text>
    </Pressable>
  );
}

/** Une ligne de petites étiquettes ; toucher la ligne ouvre son sélecteur. */
export function TagLine(props: { items: { label: string; image?: AppIconName; tone?: 'plain' | 'filled' | 'warm' }[]; onPress: () => void; testID?: string }) {
  return (
    <Pressable onPress={props.onPress} accessibilityRole="button" testID={props.testID} style={({ hovered }: PressState) => [styles.tagLine, hovered && { backgroundColor: colors.surface }]}>
      {props.items.map((it, i) => (
        <View key={i} style={[styles.tag, it.tone === 'filled' && styles.tagFilled, it.tone === 'warm' && styles.tagWarm]}>
          {it.image && <AppIcon name={it.image} size={16} />}
          <Text style={[styles.tagText, it.tone === 'warm' && { color: '#f0c89a' }]}>{it.label}</Text>
        </View>
      ))}
    </Pressable>
  );
}

/** « + Ajouter un détail » */
export function AddDetailButton(props: { onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} accessibilityRole="button" testID="add-detail" style={({ hovered }: PressState) => [styles.addDetail, hovered && { backgroundColor: colors.surface }]}>
      <AppIcon name="ajouter-petit" size={22} />
      <Text style={styles.addDetailText}>Ajouter un détail</Text>
    </Pressable>
  );
}

/** Texte qui se modifie sur place : on le touche, on écrit, c'est enregistré en quittant le champ. */
export function InlineText(props: {
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  style: StyleProp<TextStyle>;
  render?: (v: string) => ReactNode;
  testID?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(props.value);
  useEffect(() => {
    if (!editing) setText(props.value);
  }, [props.value, editing]);
  if (editing)
    return (
      <TextInput
        autoFocus
        value={text}
        onChangeText={setText}
        onBlur={() => {
          setEditing(false);
          if (text !== props.value) props.onSave(text);
        }}
        multiline={props.multiline}
        placeholder={props.placeholder}
        placeholderTextColor={colors.faint}
        style={[props.style, styles.editing, props.multiline && { minHeight: 160, textAlignVertical: 'top' }]}
        testID={props.testID ? `${props.testID}-input` : undefined}
      />
    );
  return (
    <Pressable onPress={() => setEditing(true)} accessibilityRole="button" accessibilityHint="Toucher pour modifier" testID={props.testID}>
      {props.value.trim() ? props.render ? props.render(props.value) : <Text style={props.style}>{props.value}</Text> : <Text style={[props.style, { color: colors.faint, fontStyle: 'italic' }]}>{props.placeholder}</Text>}
    </Pressable>
  );
}

/** Récit mis en page, avec une petite lettrine cuivrée sur la première lettre. */
export function Story(props: { text: string; size?: number }) {
  const size = props.size ?? 18;
  const paras = props.text.trim().split(/\n+/);
  return (
    <View style={{ gap: 10 }}>
      {paras.map((p, i) =>
        i === 0 ? (
          <Text key={i} style={[styles.story, { fontSize: size, lineHeight: size * 1.6 }]}>
            <Text style={[styles.lettrine, { fontSize: size * 2.3, lineHeight: size * 1.6 }]}>{p.charAt(0)}</Text>
            {p.slice(1)}
          </Text>
        ) : (
          <Text key={i} style={[styles.story, { fontSize: size, lineHeight: size * 1.6 }]}>
            {p}
          </Text>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 14, maxWidth: 820, width: '100%', alignSelf: 'center' },
  scrollWide: { maxWidth: 1500, paddingHorizontal: 28 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  turn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 10 },
  turnText: { color: colors.muted, fontFamily: fonts.body, fontSize: 15 },
  book: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
  },
  page: { flexGrow: 1, flexBasis: 400, minWidth: 0, paddingVertical: 32, paddingHorizontal: 38, gap: 18 },
  pageLeft: { backgroundColor: colors.paper },
  pageRight: { backgroundColor: colors.paper },
  gutter: { width: 2, backgroundColor: colors.border, opacity: 0.8 },
  single: { gap: 16 },
  label: { color: colors.faint, fontFamily: fonts.body, fontSize: 13, letterSpacing: 1.8 },
  ornament: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rule: { flex: 1, height: 1, backgroundColor: colors.bronze },
  tile: {
    flex: 1,
    minWidth: 96,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  tileLabel: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 16, textAlign: 'center' },
  tileCaption: { color: colors.faint, fontFamily: fonts.body, fontSize: 11, letterSpacing: 1.2 },
  tagLine: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, borderRadius: 12, padding: 2 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  tagFilled: { backgroundColor: colors.surfaceActive, borderColor: colors.surfaceActive },
  tagWarm: { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft },
  tagText: { color: colors.text, fontFamily: fonts.body, fontSize: 15 },
  addDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#5a4f86',
  },
  addDetailText: { color: colors.muted, fontFamily: fonts.body, fontSize: 16 },
  editing: { borderWidth: 1, borderColor: colors.accent, borderRadius: 10, padding: 8, backgroundColor: colors.bg },
  story: { color: colors.ink, fontFamily: fonts.body, textAlign: 'justify' },
  lettrine: { color: colors.accent, fontFamily: fonts.display },
});
