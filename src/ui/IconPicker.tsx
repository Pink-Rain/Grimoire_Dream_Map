import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ICON_CATEGORIES, getIcon, iconXml, searchIcons, type IconCategory } from '../map/icons';
import { Chip, Field, type PressState } from './components';
import { colors, fonts } from './theme';

/** Un dessin (game-icons) dans la couleur voulue. */
export function PlaceIcon(props: { name: string | undefined; size: number; color?: string }) {
  const xml = useMemo(() => iconXml(props.name, props.color ?? colors.ink), [props.name, props.color]);
  return <SvgXml xml={xml} width={props.size} height={props.size} />;
}

const CELL = 84;

/** Choix d'un dessin : recherche en français + catégories. */
export function IconPicker(props: { value: string; onChange: (name: string) => void; kind?: 'place' | 'vehicle' }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<IconCategory | null>(props.kind === 'vehicle' ? 'vehicules' : null);
  const [width, setWidth] = useState(0);
  const results = useMemo(() => searchIcons(query, query ? null : category, props.kind), [query, category, props.kind]);
  const columns = Math.max(3, Math.floor((width || 320) / CELL));
  const current = getIcon(props.value);

  return (
    <View style={{ gap: 10 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.current}>
        <View style={styles.currentIcon}>
          <PlaceIcon name={props.value} size={56} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.currentLabel}>{current?.label ?? 'Aucun dessin'}</Text>
          <Text style={styles.hint}>{ALL_COUNT_LABEL}</Text>
        </View>
      </View>
      <Field value={query} onChangeText={setQuery} placeholder="Chercher un dessin : lac, cabane, train, dragon…" testID="icon-search" />
      {!query && (
        <View style={styles.cats}>
          <Chip label="Tous" selected={!category} onPress={() => setCategory(null)} />
          {ICON_CATEGORIES.map((c) => (
            <Chip key={c.id} label={c.label} selected={category === c.id} onPress={() => setCategory(c.id)} testID={`icon-cat-${c.id}`} />
          ))}
        </View>
      )}
      <FlatList
        key={columns}
        data={results}
        numColumns={columns}
        keyExtractor={(i) => i.name}
        style={styles.grid}
        initialNumToRender={36}
        ListEmptyComponent={<Text style={styles.hint}>Aucun dessin pour « {query} ». Essaie un autre mot.</Text>}
        renderItem={({ item }) => {
          const on = item.name === props.value;
          return (
            <Pressable
              onPress={() => props.onChange(item.name)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: on }}
              testID={`icon-${item.name}`}
              style={({ hovered }: PressState) => [styles.cell, { width: (width || 320) / columns }, on && styles.cellOn, hovered && !on && { backgroundColor: colors.surfaceHover }]}
            >
              <PlaceIcon name={item.name} size={40} color={on ? colors.ochre : colors.ink} />
              <Text style={styles.cellLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const ALL_COUNT_LABEL = 'Dessins : game-icons.net';

const styles = StyleSheet.create({
  current: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currentIcon: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLabel: { color: colors.text, fontFamily: fonts.display, fontSize: 20 },
  hint: { color: colors.faint, fontFamily: fonts.body, fontSize: 14 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  grid: { maxHeight: 300, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.bg },
  cell: { height: CELL, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 10, padding: 4 },
  cellOn: { backgroundColor: colors.surfaceActive },
  cellLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, maxWidth: '100%' },
});
