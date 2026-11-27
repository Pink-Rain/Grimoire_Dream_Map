import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { appStore, useStoreVersion } from '../data/appStore';
import type { Place } from '../data/types';
import { Button, Chip, Field, IconButton, Txt, type PressState } from './components';
import { PlaceIcon } from './IconPicker';
import { PlaceEditor, placeModeLabel } from './PlaceEditor';
import { colors } from './theme';

// ---------------------------------------------------------------- Personnes

export function PeopleSection(props: { value: string[]; onChange: (ids: string[]) => void }) {
  useStoreVersion();
  const [q, setQ] = useState('');
  const people = appStore.list('people').sort((a, b) => a.name.localeCompare(b.name));
  const inDream = props.value.map((id) => appStore.get('people', id)).filter((p): p is NonNullable<typeof p> => !!p);
  const query = q.trim().toLowerCase();
  const suggestions = people.filter((p) => !props.value.includes(p.id) && (!query || p.name.toLowerCase().includes(query))).slice(0, query ? 10 : 8);
  const exact = people.find((p) => p.name.toLowerCase() === query);

  function create(real: boolean) {
    const name = q.trim();
    if (!name) return;
    const p = appStore.save('people', appStore.newId(), { name, real });
    props.onChange([...props.value, p.id]);
    setQ('');
  }

  return (
    <View style={{ gap: 10 }}>
      {inDream.length > 0 && (
        <View style={styles.wrap}>
          {inDream.map((p) => (
            <Chip
              key={p.id}
              label={p.name}
              image={p.real ? 'personne' : 'imaginaire'}
              onRemove={() => props.onChange(props.value.filter((id) => id !== p.id))}
              testID={`person-${p.name}`}
            />
          ))}
        </View>
      )}
      <Field value={q} onChangeText={setQ} placeholder="Ajouter une personne : Maman, un inconnu, la sorcière…" testID="person-input" />
      {query.length > 0 && !exact && (
        <View style={styles.wrap}>
          <Button small image="personne" label={`« ${q.trim()} » existe vraiment`} onPress={() => create(true)} testID="person-add-real" />
          <Button small image="imaginaire" label={`« ${q.trim()} » est imaginaire`} onPress={() => create(false)} testID="person-add-dream" />
        </View>
      )}
      {suggestions.length > 0 && (
        <View style={styles.wrap}>
          {suggestions.map((p) => (
            <Chip
              key={p.id}
              label={p.name}
              image={p.real ? 'personne' : 'imaginaire'}
              onPress={() => {
                props.onChange([...props.value, p.id]);
                setQ('');
              }}
              testID={`person-suggest-${p.name}`}
            />
          ))}
        </View>
      )}
      <Txt faint size={14}>
        Réelle ou imaginaire : choisis en l’ajoutant.
      </Txt>
    </View>
  );
}

// ---------------------------------------------------------------- Lieux et véhicules

function PlaceRow(props: { place: Place; onEdit: () => void; onRemove: () => void; onShow?: () => void }) {
  const p = props.place;
  const route = p.kind === 'vehicle' && p.route ? `${appStore.get('places', p.route.fromId)?.name ?? '?'} → ${appStore.get('places', p.route.toId)?.name ?? '?'}` : null;
  const rel = p.relation ? appStore.get('places', p.relation.placeId)?.name : null;
  const relLabel: Record<string, string> = { north: 'au nord de', south: 'au sud de', east: 'à l’est de', west: 'à l’ouest de', in: 'dans', near: 'près de' };
  return (
    <View style={styles.placeRow} testID={`dream-place-${p.name}`}>
      <Pressable
        onPress={props.onEdit}
        accessibilityRole="button"
        accessibilityLabel={`Modifier ${p.name}`}
        style={({ hovered }: PressState) => [styles.placeMain, hovered && { backgroundColor: colors.surfaceHover }]}
      >
        <View style={styles.placeIcon}>
          <PlaceIcon name={p.icon} size={34} color={p.real ? colors.ink : colors.ochre} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt weight="semi" numberOfLines={1}>
            {p.name}
          </Txt>
          <Txt faint size={14} numberOfLines={1}>
            {placeModeLabel(p)}
            {route ? ` · ${route}` : rel && p.relation ? ` · ${relLabel[p.relation.dir]} ${rel}` : p.address ? ` · ${p.address}` : ''}
          </Txt>
        </View>
      </Pressable>
      {props.onShow && <IconButton icon="map-outline" label={`Voir ${p.name} sur la carte`} color={colors.faint} onPress={props.onShow} />}
      <IconButton icon="close" label={`Retirer ${p.name} du rêve`} color={colors.faint} onPress={props.onRemove} />
    </View>
  );
}

export function PlacesSection(props: { value: string[]; onChange: (ids: string[]) => void; onShowOnMap?: (placeId: string) => void }) {
  useStoreVersion();
  const [editor, setEditor] = useState<{ id: string | null; mode: 'real' | 'dream' | 'vehicle' } | null>(null);
  const [q, setQ] = useState('');
  const inDream = props.value.map((id) => appStore.get('places', id)).filter((p): p is Place => !!p);
  const query = q.trim().toLowerCase();
  const others = appStore
    .list('places')
    .filter((p) => !props.value.includes(p.id) && (!query || p.name.toLowerCase().includes(query)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, query ? 12 : 6);

  return (
    <View style={{ gap: 10 }}>
      {inDream.map((p) => (
        <PlaceRow
          key={p.id}
          place={p}
          onEdit={() => setEditor({ id: p.id, mode: p.kind === 'vehicle' ? 'vehicle' : p.real ? 'real' : 'dream' })}
          onRemove={() => props.onChange(props.value.filter((id) => id !== p.id))}
          onShow={props.onShowOnMap ? () => props.onShowOnMap!(p.id) : undefined}
        />
      ))}
      <View style={styles.wrap}>
        <Button small image="lieu-reel" label="Lieu réel" onPress={() => setEditor({ id: null, mode: 'real' })} testID="add-real-place" />
        <Button small image="imaginaire" label="Lieu imaginaire" onPress={() => setEditor({ id: null, mode: 'dream' })} testID="add-dream-place" />
        <Button small image="vehicule" label="Véhicule" onPress={() => setEditor({ id: null, mode: 'vehicle' })} testID="add-vehicle" />
      </View>
      {appStore.list('places').length > inDream.length && (
        <View style={{ gap: 8 }}>
          <Field value={q} onChangeText={setQ} placeholder="Ou reprendre un lieu déjà rêvé…" testID="reuse-place" />
          <View style={styles.wrap}>
            {others.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                image={p.kind === 'vehicle' ? 'vehicule' : p.real ? 'lieu-reel' : 'imaginaire'}
                onPress={() => {
                  props.onChange([...props.value, p.id]);
                  setQ('');
                }}
                testID={`reuse-${p.name}`}
              />
            ))}
          </View>
        </View>
      )}
      <PlaceEditor
        visible={!!editor}
        placeId={editor?.id}
        initialMode={editor?.mode}
        contextPlaceIds={props.value}
        onClose={() => setEditor(null)}
        onSaved={(id) => {
          if (!props.value.includes(id)) props.onChange([...props.value, id]);
        }}
        onDeleted={(id) => props.onChange(props.value.filter((x) => x !== id))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  placeMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6, borderRadius: 12, minHeight: 52 },
  placeIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center' },
});
