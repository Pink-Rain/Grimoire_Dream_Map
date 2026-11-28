import { AppIcon, type AppIconName } from './AppIcon';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { appStore, useStoreVersion } from '../data/appStore';
import { placeUsage, placeUsageReason } from '../data/placeUsage';
import { confirmAsync } from '../platform/dialogs';
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
  const [selected, setSelectedRaw] = useState<string | null>(null);
  // « Glisser » : le lieu imaginaire ne se déplace qu'après avoir touché ce bouton (évite les erreurs).
  const [dragId, setDragId] = useState<string | null>(null);
  // Dessin du trajet d'un véhicule : chaque touche sur la carte ajoute un point.
  const [draw, setDraw] = useState<{ id: string; points: [number, number][] } | null>(null);
  const places = useMapPlaces(null, dragId);
  const setSelected = (id: string | null) => {
    if (draw) return; // pendant le dessin, la carte sert à poser les points
    setSelectedRaw(id);
    if (id !== dragId) setDragId(null);
  };
  const [editing, setEditing] = useState<string | null>(null);
  const [localFocus, setLocalFocus] = useState<{ id: string; n: number } | null>(null);
  const place = selected ? appStore.get('places', selected) : undefined;
  useEffect(() => {
    if (props.focus) setSelectedRaw(props.focus.id);
  }, [props.focus]);
  const focus = localFocus && (!props.focus || localFocus.n > props.focus.n) ? localFocus : props.focus;

  const dreamsHere = place
    ? appStore
        .list('dreams')
        .filter((d) => d.placeIds?.includes(place.id))
        .sort((a, b) => b.dreamDate.localeCompare(a.dreamDate))
    : [];

  const usage = place ? placeUsage(place.id) : null;
  async function removePlace() {
    if (!place || !usage?.deletable) return;
    const ok = await confirmAsync(place.kind === 'vehicle' ? 'Supprimer ce véhicule ?' : 'Supprimer ce lieu ?', `« ${place.name} » disparaîtra de la carte.`, 'Supprimer');
    if (!ok) return;
    appStore.remove('places', place.id);
    setSelectedRaw(null);
  }

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
        {dragId === place.id && (
          <Txt size={14} style={{ color: colors.ochre }} testID="drag-hint">
            Fais-le glisser sur la carte, puis retouche le bouton pour terminer.
          </Txt>
        )}
        {draw?.id === place.id ? (
          <View style={{ gap: 8 }} testID="route-draw">
            <Txt size={14} style={{ color: colors.ochre }}>
              Touche la carte pour poser les points du trajet ({draw.points.length} point{draw.points.length > 1 ? 's' : ''}).
            </Txt>
            <View style={styles.actions}>
              <Tool icon="arrow-undo-outline" label="Retirer le dernier point" onPress={() => setDraw({ ...draw, points: draw.points.slice(0, -1) })} testID="route-undo" />
              <Tool image="supprimer" label="Tout effacer" onPress={() => setDraw({ ...draw, points: [] })} testID="route-clear" />
              <Tool image="fermer" label="Annuler" onPress={() => setDraw(null)} testID="route-cancel" />
              <Button
                small
                variant="primary"
                label="Enregistrer"
                image="enregistrer-encre"
                onPress={() => {
                  const route = place.route ?? { fromId: '', toId: '' };
                  appStore.save('places', place.id, { route: { ...route, points: draw.points.length >= 2 ? draw.points : undefined } });
                  setDraw(null);
                }}
                testID="route-save"
              />
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            <Tool image="modifier" label="Modifier" onPress={() => setEditing(place.id)} testID="place-edit" />
            <Tool image="devant" label="Devant" onPress={() => relayer(1)} testID="place-front" />
            <Tool image="derriere" label="Derrière" onPress={() => relayer(-1)} testID="place-back" />
            <Tool image="recentrer-fin" label="Centrer" onPress={() => setLocalFocus({ id: place.id, n: Date.now() })} testID="place-center" />
            {place.kind === 'place' && !place.real && (
              <Tool image="glisser" label={dragId === place.id ? 'Terminer le déplacement' : 'Déplacer (glisser sur la carte)'} active={dragId === place.id} onPress={() => setDragId(dragId === place.id ? null : place.id)} testID="place-drag" />
            )}
            {place.kind === 'vehicle' && (
              <Tool icon="brush-outline" label="Dessiner le trajet" onPress={() => setDraw({ id: place.id, points: place.route?.points ?? [] })} testID="route-draw-start" />
            )}
            {usage?.deletable && <Tool image="supprimer" label={place.kind === 'vehicle' ? 'Supprimer ce véhicule' : 'Supprimer ce lieu'} onPress={removePlace} testID="place-remove" />}
          </View>
        )}
        {usage && !usage.deletable && (
          <Txt faint size={13} testID="place-in-use">
            {placeUsageReason(usage)}
          </Txt>
        )}
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
        route={draw ? draw.points : place?.kind === 'vehicle' ? vehicleLine(place) : null}
        drawing={!!draw}
        onTap={(lat, lon) => draw && setDraw({ ...draw, points: [...draw.points, [lat, lon]] })}
      />
      {panel}
      <PlaceEditor visible={!!editing} placeId={editing} onClose={() => setEditing(null)} onDeleted={() => setSelected(null)} />
    </View>
  );
}

/** Trajet d'un véhicule à montrer : celui dessiné, sinon la ligne entre ses deux lieux. */
function vehicleLine(p: { route?: { fromId: string; toId: string; points?: [number, number][] } }): [number, number][] | null {
  if (p.route?.points && p.route.points.length >= 2) return p.route.points;
  const a = p.route ? appStore.get('places', p.route.fromId) : undefined;
  const b = p.route ? appStore.get('places', p.route.toId) : undefined;
  if (a?.lat === undefined || a.lon === undefined || b?.lat === undefined || b.lon === undefined) return null;
  return [
    [a.lat, a.lon],
    [b.lat, b.lon],
  ];
}

/** Bouton de la fiche lieu : juste l'icône (le nom s'affiche au survol et est lu par les lecteurs d'écran). */
function Tool(props: { image?: AppIconName; icon?: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean; testID?: string }) {
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ selected: !!props.active }}
      {...({ title: props.label } as object)}
      testID={props.testID}
      style={({ hovered, pressed }: PressState) => [styles.tool, props.active && styles.toolOn, (hovered || pressed) && !props.active && { backgroundColor: colors.surfaceHover }]}
    >
      {props.image ? <AppIcon name={props.image} size={26} /> : <Ionicons name={props.icon ?? 'ellipse'} size={22} color={colors.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tool: { width: 48, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  toolOn: { borderColor: colors.accent, backgroundColor: colors.surfaceActive },
  fill: { flex: 1, backgroundColor: colors.paper },
  panel: { position: 'absolute', backgroundColor: 'rgba(16,14,34,0.96)', borderColor: colors.border, gap: 12, padding: 14 },
  panelWide: { top: 12, left: 12, width: 360, maxHeight: '92%', borderRadius: 16, borderWidth: 1 },
  panelPhone: { left: 0, right: 0, bottom: 0, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTopWidth: 1 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelIcon: { width: 60, height: 60, borderRadius: 14, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dreamLink: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 8, borderRadius: 10 },
});
