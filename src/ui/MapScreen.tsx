import { AppIcon } from './AppIcon';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { appStore, useStoreVersion } from '../data/appStore';
import { PLACE_SIZES } from '../data/types';
import { DreamMap } from '../map/DreamMap';
import { useMapPlaces } from '../map/useMapPlaces';
import { Button, IconButton, Title, Txt, type PressState } from './components';
import { formatShortDate } from './dates';
import { PlaceIcon } from './IconPicker';
import { PlaceEditor, placeModeLabel } from './PlaceEditor';
import { colors } from './theme';

const REL: Record<string, string> = { north: 'Au nord de', south: 'Au sud de', east: 'À l’est de', west: 'À l’ouest de', in: 'Dans', near: 'Près de' };

/** L'atlas : la carte de tous les rêves, et la fiche du lieu touché. */
export function MapScreen(props: {
  phone: boolean;
  bottomInset: number;
  onOpenDream: (id: string) => void;
  focus: { id: string; n: number } | null;
}) {
  useStoreVersion();
  const places = useMapPlaces();
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [localFocus, setLocalFocus] = useState<{ id: string; n: number } | null>(null);
  const place = selected ? appStore.get('places', selected) : undefined;
  useEffect(() => {
    if (props.focus) setSelected(props.focus.id);
  }, [props.focus]);
  const focus = localFocus && (!props.focus || localFocus.n > props.focus.n) ? localFocus : props.focus;

  const dreamsHere = place
    ? appStore
        .list('dreams')
        .filter((d) => d.placeIds?.includes(place.id))
        .sort((a, b) => b.dreamDate.localeCompare(a.dreamDate))
    : [];

  function relayer(dir: 1 | -1) {
    if (!place) return;
    const layers = appStore.list('places').map((p) => p.layer ?? 0);
    const layer = dir === 1 ? Math.max(0, ...layers) + 1 : Math.min(0, ...layers) - 1;
    appStore.save('places', place.id, { layer });
  }

  const panel = place && (
    <View style={[styles.panel, props.phone ? [styles.panelPhone, { paddingBottom: 12 + props.bottomInset }] : styles.panelWide]} testID="place-panel">
      <View style={styles.panelHead}>
        <View style={styles.panelIcon}>
          <PlaceIcon name={place.icon} size={44} color={place.real ? colors.ink : colors.ochre} />
        </View>
        <View style={{ flex: 1 }}>
          <Title size={22} numberOfLines={2}>
            {place.name}
          </Title>
          <Txt faint size={14}>
            {placeModeLabel(place)} · {PLACE_SIZES.find((s) => s.level === place.size)?.label}
          </Txt>
        </View>
        <IconButton image="fermer" size={18} label="Fermer la fiche" onPress={() => setSelected(null)} testID="place-panel-close" />
      </View>
      <ScrollView style={{ maxHeight: props.phone ? 260 : undefined }} contentContainerStyle={{ gap: 12 }}>
        {!!place.address && (
          <Txt muted size={15}>
            {place.address}
          </Txt>
        )}
        {place.relation && (
          <Txt muted size={15}>
            {REL[place.relation.dir]} {appStore.get('places', place.relation.placeId)?.name ?? '…'}
          </Txt>
        )}
        {place.kind === 'vehicle' && place.route && (
          <Txt muted size={15}>
            Circule entre {appStore.get('places', place.route.fromId)?.name ?? '?'} et {appStore.get('places', place.route.toId)?.name ?? '?'}
          </Txt>
        )}
        {place.kind === 'place' && !place.real && (
          <Txt faint size={14}>
            <AppIcon name="glisser" size={18} style={{ marginBottom: -4 }} /> Fais-le glisser sur la carte pour le déplacer.
          </Txt>
        )}
        <View style={styles.actions}>
          <Button small label="Modifier" image="modifier" onPress={() => setEditing(place.id)} testID="place-edit" />
          <Button small label="Devant" image="devant" onPress={() => relayer(1)} testID="place-front" />
          <Button small label="Derrière" image="derriere" onPress={() => relayer(-1)} testID="place-back" />
          <Button small label="Centrer" image="recentrer-fin" onPress={() => setLocalFocus({ id: place.id, n: Date.now() })} />
        </View>
        <Txt weight="semi">{dreamsHere.length ? `Rêvé ${dreamsHere.length} fois ici` : 'Dans aucun rêve pour l’instant'}</Txt>
        {dreamsHere.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => props.onOpenDream(d.id)}
            accessibilityRole="button"
            testID="place-dream"
            style={({ hovered }: PressState) => [styles.dreamLink, hovered && { backgroundColor: colors.surfaceHover }]}
          >
            <Txt faint size={14} style={{ width: 92 }}>
              {formatShortDate(d.dreamDate)}
            </Txt>
            <Txt numberOfLines={1} style={{ flex: 1 }}>
              {d.title.trim() || 'Sans titre'}
            </Txt>
            <AppIcon name="voir-plus" size={18} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.fill}>
      <DreamMap
        places={places}
        selectedId={selected}
        focus={focus}
        onSelect={setSelected}
        onMove={(id, lat, lon) => appStore.save('places', id, { lat, lon })}
      />
      {panel}
      <PlaceEditor visible={!!editing} placeId={editing} onClose={() => setEditing(null)} onDeleted={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  panel: { position: 'absolute', backgroundColor: 'rgba(16,14,34,0.96)', borderColor: colors.border, gap: 12, padding: 14 },
  panelWide: { top: 12, left: 12, width: 360, maxHeight: '92%', borderRadius: 16, borderWidth: 1 },
  panelPhone: { left: 0, right: 0, bottom: 0, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTopWidth: 1 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelIcon: { width: 60, height: 60, borderRadius: 14, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dreamLink: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 8, borderRadius: 10 },
});
