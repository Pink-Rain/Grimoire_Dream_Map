import { AppIcon } from './AppIcon';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { appStore, useStoreVersion } from '../data/appStore';
import { PLACE_SIZES, type Place, type PlaceRelationDir } from '../data/types';
import { DEFAULT_CENTER, defaultImaginaryPosition, relativePosition, suggestedIcon, suggestedSize } from '../map/geometry';
import { placeUsage } from '../data/placeUsage';
import { searchPlaces, type GeoResult } from '../map/geocode';
import { getLastMapView } from '../map/mapState';
import { confirmAsync } from '../platform/dialogs';
import { Button, Chip, Field, IconButton, Label, Segmented, Title, Txt, type PressState } from './components';
import { IconPicker, PlaceIcon } from './IconPicker';
import { colors, fonts } from './theme';

type Mode = 'real' | 'dream' | 'vehicle';

const DIRS: { value: PlaceRelationDir; label: string }[] = [
  { value: 'north', label: 'Au nord de' },
  { value: 'south', label: 'Au sud de' },
  { value: 'east', label: 'À l’est de' },
  { value: 'west', label: 'À l’ouest de' },
  { value: 'in', label: 'Dans' },
  { value: 'near', label: 'Près de' },
];

export function placeModeLabel(p: Pick<Place, 'kind' | 'real'>) {
  return p.kind === 'vehicle' ? 'Véhicule' : p.real ? 'Lieu réel' : 'Lieu imaginaire';
}

/** Liste des lieux existants, pour en choisir un (repère, départ/arrivée d'un véhicule…). */
export function PlaceChooser(props: { value: string | null; onChange: (id: string) => void; exclude?: string[]; placeholder?: string; testID?: string; onlyPlaces?: boolean }) {
  useStoreVersion();
  const [q, setQ] = useState('');
  const all = appStore
    .list('places')
    .filter((p) => !props.exclude?.includes(p.id) && (!props.onlyPlaces || p.kind === 'place'))
    .sort((a, b) => a.name.localeCompare(b.name));
  const selected = props.value ? appStore.get('places', props.value) : undefined;
  const shown = q ? all.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())) : all.slice(0, 12);
  if (selected) {
    return (
      <View style={styles.chosen}>
        <PlaceIcon name={selected.icon} size={30} />
        <Txt style={{ flex: 1 }} numberOfLines={1}>
          {selected.name}
        </Txt>
        <Button small variant="ghost" label="Changer" onPress={() => props.onChange('')} />
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {all.length > 12 && <Field value={q} onChangeText={setQ} placeholder={props.placeholder ?? 'Chercher un lieu…'} testID={props.testID ? `${props.testID}-search` : undefined} />}
      {all.length === 0 ? (
        <Txt faint size={15}>
          Aucun lieu pour l’instant. Ajoute d’abord un lieu réel ou imaginaire.
        </Txt>
      ) : (
        <View style={styles.wrap}>
          {shown.map((p) => (
            <Chip key={p.id} label={p.name} onPress={() => props.onChange(p.id)} testID={props.testID ? `${props.testID}-${p.name}` : undefined} />
          ))}
        </View>
      )}
    </View>
  );
}

export function SizePicker(props: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.sizes} accessibilityRole="radiogroup" accessibilityLabel="Taille">
      {PLACE_SIZES.map((s) => {
        const on = s.level === props.value;
        return (
          <Pressable
            key={s.level}
            onPress={() => props.onChange(s.level)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={s.label}
            testID={`size-${s.level}`}
            style={({ hovered }: PressState) => [styles.size, on && styles.sizeOn, hovered && !on && { backgroundColor: colors.surfaceHover }]}
          >
            <View style={[styles.sizeDot, { width: 6 + s.level * 4, height: 6 + s.level * 4, borderRadius: 20 }, on && { backgroundColor: colors.ochre }]} />
            <Text style={[styles.sizeLabel, on && { color: colors.text }]}>{s.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Fenêtre pour créer ou modifier un lieu / véhicule.
 * `contextPlaceIds` : lieux du rêve en cours (pour placer un lieu imaginaire près d'eux).
 */
export function PlaceEditor(props: {
  visible: boolean;
  placeId?: string | null;
  initialMode?: Mode;
  contextPlaceIds?: string[];
  onClose: () => void;
  onSaved?: (id: string) => void;
  onDeleted?: (id: string) => void;
}) {
  const existing = props.placeId ? appStore.get('places', props.placeId) : undefined;
  const { width, height } = useWindowDimensions();
  const wide = width >= 720;

  const [mode, setMode] = useState<Mode>('real');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('house');
  const [size, setSize] = useState(3);
  const [geo, setGeo] = useState<GeoResult | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [placement, setPlacement] = useState<'relative' | 'free'>('relative');
  const [dir, setDir] = useState<PlaceRelationDir>('north');
  const [refId, setRefId] = useState<string | null>(null);
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [iconTouched, setIconTouched] = useState(false);
  const [showIcons, setShowIcons] = useState(false);

  // (Ré)initialise le formulaire à l'ouverture.
  useEffect(() => {
    if (!props.visible) return;
    const p = props.placeId ? appStore.get('places', props.placeId) : undefined;
    const m: Mode = p ? (p.kind === 'vehicle' ? 'vehicle' : p.real ? 'real' : 'dream') : props.initialMode ?? 'real';
    setMode(m);
    setName(p?.name ?? '');
    setIcon(p?.icon ?? (m === 'vehicle' ? 'sailboat' : m === 'dream' ? 'wood-cabin' : 'house'));
    setSize(p?.size ?? (m === 'vehicle' ? 2 : 3));
    setGeo(p?.real && p.lat !== undefined && p.lon !== undefined ? { name: p.name, address: p.address ?? '', lat: p.lat, lon: p.lon } : null);
    setQuery('');
    setResults([]);
    setSearchError(null);
    setPlacement(p?.relation ? 'relative' : p ? 'free' : 'relative');
    setDir(p?.relation?.dir ?? 'north');
    setRefId(p?.relation?.placeId ?? null);
    setFromId(p?.route?.fromId ?? null);
    setToId(p?.route?.toId ?? null);
    setIconTouched(!!p);
    setShowIcons(false);
  }, [props.visible, props.placeId]);

  // Recherche de vrais lieux (après une petite pause de frappe).
  const searchSeq = useRef(0);
  useEffect(() => {
    if (mode !== 'real' || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const t = setTimeout(() => {
      searchPlaces(query)
        .then((r) => {
          if (seq !== searchSeq.current) return;
          setResults(r);
          setSearchError(r.length ? null : 'Aucun lieu trouvé.');
        })
        .catch((e) => seq === searchSeq.current && setSearchError(`Recherche impossible : vérifie ta connexion internet. (${e instanceof Error ? e.message : e})`))
        .finally(() => seq === searchSeq.current && setSearching(false));
    }, 450);
    return () => clearTimeout(t);
  }, [query, mode]);

  function chooseGeo(r: GeoResult) {
    setGeo(r);
    setName(r.name);
    setSize(suggestedSize(r.osmType));
    if (!iconTouched) setIcon(suggestedIcon(r.osmKey, r.osmType));
    setResults([]);
    setQuery('');
  }

  const canSave =
    name.trim().length > 0 &&
    (mode === 'real' ? !!geo : mode === 'vehicle' ? !!fromId && !!toId && fromId !== toId : placement === 'free' || !!refId);

  function save() {
    if (!canSave) return;
    const id = existing?.id ?? appStore.newId();
    const base = { name: name.trim(), icon, size };
    if (mode === 'real' && geo) {
      appStore.save('places', id, { ...base, kind: 'place', real: true, lat: geo.lat, lon: geo.lon, address: geo.address, ...(geo.admin ? { admin: geo.admin } : {}) });
    } else if (mode === 'vehicle') {
      appStore.save('places', id, { ...base, kind: 'vehicle', real: false, route: { ...existing?.route, fromId: fromId!, toId: toId! } });
    } else {
      let pos: { lat: number; lon: number };
      let relation: Place['relation'] | undefined;
      const ref = refId ? appStore.get('places', refId) : undefined;
      if (placement === 'relative' && ref && ref.lat !== undefined && ref.lon !== undefined) {
        relation = { dir, placeId: ref.id };
        const changed = !existing || existing.relation?.dir !== dir || existing.relation?.placeId !== ref.id || existing.size !== size;
        pos = changed || existing?.lat === undefined ? relativePosition({ lat: ref.lat, lon: ref.lon, size: ref.size }, dir, size) : { lat: existing.lat!, lon: existing.lon! };
      } else if (existing?.lat !== undefined && existing.lon !== undefined) {
        pos = { lat: existing.lat, lon: existing.lon };
      } else {
        const ctx = (props.contextPlaceIds ?? []).map((pid) => appStore.get('places', pid)).filter((p): p is Place => !!p && p.kind === 'place');
        const v = getLastMapView() ?? DEFAULT_CENTER;
        pos = defaultImaginaryPosition(ctx, { lat: v.lat, lon: v.lon });
      }
      const layer = relation?.dir === 'in' && ref ? Math.max(existing?.layer ?? 0, (ref.layer ?? 0) + 1) : existing?.layer;
      appStore.save('places', id, { ...base, kind: 'place', real: false, ...pos, relation, layer });
    }
    props.onSaved?.(id);
    props.onClose();
  }

  const usage = existing ? placeUsage(existing.id) : null;
  async function remove() {
    if (!existing || !usage?.deletable) return;
    const ok = await confirmAsync(existing.kind === 'vehicle' ? 'Supprimer ce véhicule ?' : 'Supprimer ce lieu ?', `« ${existing.name} » disparaîtra de la carte.`, 'Supprimer');
    if (!ok) return;
    appStore.remove('places', existing.id);
    props.onDeleted?.(existing.id);
    props.onClose();
  }

  const title = existing ? `Modifier ${mode === 'vehicle' ? 'le véhicule' : 'le lieu'}` : mode === 'vehicle' ? 'Nouveau véhicule' : 'Nouveau lieu';

  return (
    <Modal visible={props.visible} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={props.onClose}>
      <View style={[styles.backdrop, wide && styles.backdropWide]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={[styles.sheet, wide ? { width: 620, maxHeight: height - 48 } : { flex: 1 }]}>
          <View style={styles.head}>
            <Title size={24} style={{ flex: 1 }}>
              {title}
            </Title>
            <IconButton image="fermer" size={18} label="Fermer" onPress={props.onClose} testID="place-close" />
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {!existing && (
              <Segmented
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  if (!iconTouched) setIcon(m === 'vehicle' ? 'sailboat' : m === 'dream' ? 'wood-cabin' : 'house');
                  setSize(m === 'vehicle' ? 2 : 3);
                }}
                options={[
                  { value: 'real', label: 'Réel', image: 'lieu-reel' },
                  { value: 'dream', label: 'Imaginaire', image: 'imaginaire' },
                  { value: 'vehicle', label: 'Véhicule', image: 'vehicule' },
                ]}
                testID="place-mode"
              />
            )}

            {mode === 'real' && (
              <View style={styles.block}>
                <Label>OÙ EST-CE, POUR DE VRAI ?</Label>
                {geo ? (
                  <View style={styles.chosen}>
                    <AppIcon name="epingle" size={26} />
                    <View style={{ flex: 1 }}>
                      <Txt weight="semi">{geo.name}</Txt>
                      {!!geo.address && (
                        <Txt muted size={14} numberOfLines={2}>
                          {geo.address}
                        </Txt>
                      )}
                    </View>
                    <Button small variant="ghost" label="Changer" onPress={() => setGeo(null)} testID="geo-change" />
                  </View>
                ) : (
                  <>
                    <Field value={query} onChangeText={setQuery} placeholder="Chercher : Montpellier, plage du Lez, Central Park…" autoFocus testID="geo-search" />
                    {searching && <ActivityIndicator color={colors.accent} />}
                    {!!searchError && !searching && (
                      <Txt faint size={15}>
                        {searchError}
                      </Txt>
                    )}
                    {results.map((r, i) => (
                      <Pressable
                        key={`${r.name}-${i}`}
                        onPress={() => chooseGeo(r)}
                        accessibilityRole="button"
                        testID="geo-result"
                        style={({ hovered, pressed }: PressState) => [styles.result, (hovered || pressed) && { backgroundColor: colors.surfaceHover }]}
                      >
                        <AppIcon name="epingle" size={24} />
                        <View style={{ flex: 1 }}>
                          <Txt>{r.name}</Txt>
                          {!!r.address && (
                            <Txt faint size={14} numberOfLines={1}>
                              {r.address}
                            </Txt>
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </>
                )}
              </View>
            )}

            {(mode !== 'real' || geo) && (
              <View style={styles.block}>
                <Label>{mode === 'real' ? 'NOM SUR LA CARTE' : 'NOM'}</Label>
                <Field
                  value={name}
                  onChangeText={setName}
                  placeholder={mode === 'vehicle' ? 'Le train de nuit, une barque…' : 'La cabane de la sorcière…'}
                  testID="place-name"
                />
              </View>
            )}

            {mode === 'dream' && (
              <View style={styles.block}>
                <Label>OÙ SE TROUVE-T-IL ?</Label>
                <Segmented
                  value={placement}
                  onChange={setPlacement}
                  options={[
                    { value: 'relative', label: 'Par rapport à un lieu' },
                    { value: 'free', label: 'Je le placerai moi-même' },
                  ]}
                  testID="placement"
                />
                {placement === 'relative' ? (
                  <>
                    <View style={styles.wrap}>
                      {DIRS.map((d) => (
                        <Chip key={d.value} label={d.label} selected={dir === d.value} onPress={() => setDir(d.value)} testID={`dir-${d.value}`} />
                      ))}
                    </View>
                    <PlaceChooser value={refId} onChange={(v) => setRefId(v || null)} exclude={existing ? [existing.id] : []} onlyPlaces testID="ref" />
                  </>
                ) : (
                  <Txt muted size={15}>
                    Il apparaîtra près des autres lieux du rêve. Fais-le glisser sur la carte pour le mettre où tu veux.
                  </Txt>
                )}
              </View>
            )}

            {mode === 'vehicle' && (
              <View style={styles.block}>
                <Label>TRAJET</Label>
                <Txt muted size={15}>
                  Le véhicule circule entre deux lieux : à chaque ouverture de la carte, il sera à un autre endroit de son trajet.
                </Txt>
                <Txt weight="semi">Départ</Txt>
                <PlaceChooser value={fromId} onChange={(v) => setFromId(v || null)} exclude={toId ? [toId] : []} onlyPlaces testID="from" />
                <Txt weight="semi">Arrivée</Txt>
                <PlaceChooser value={toId} onChange={(v) => setToId(v || null)} exclude={fromId ? [fromId] : []} onlyPlaces testID="to" />
              </View>
            )}

            {(mode !== 'real' || geo) && (
              <>
                <View style={styles.block}>
                  <Label>DESSIN</Label>
                  {showIcons ? (
                    <IconPicker
                      value={icon}
                      kind={mode === 'vehicle' ? 'vehicle' : 'place'}
                      onChange={(n) => {
                        setIcon(n);
                        setIconTouched(true);
                      }}
                    />
                  ) : (
                    <Pressable
                      onPress={() => setShowIcons(true)}
                      accessibilityRole="button"
                      testID="choose-icon"
                      style={({ hovered }: PressState) => [styles.chosen, hovered && { backgroundColor: colors.surfaceHover }]}
                    >
                      <PlaceIcon name={icon} size={44} />
                      <Txt style={{ flex: 1 }}>Choisir un autre dessin</Txt>
                      <AppIcon name="voir-plus" size={20} />
                    </Pressable>
                  )}
                </View>
                <View style={styles.block}>
                  <Label>TAILLE SUR LA CARTE</Label>
                  <SizePicker value={size} onChange={setSize} />
                </View>
              </>
            )}
          </ScrollView>
          <View style={styles.foot}>
            {existing && usage?.deletable && <Button label="Supprimer" image="supprimer" variant="danger" onPress={remove} testID="place-delete" />}
            <View style={{ flex: 1 }} />
            <Button label="Annuler" variant="ghost" onPress={props.onClose} />
            <Button label={existing ? 'Enregistrer' : 'Ajouter'} image="coche" variant="primary" onPress={save} disabled={!canSave} testID="place-save" />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,4,12,0.7)' },
  backdropWide: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: colors.bg, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 6, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  body: { padding: 18, gap: 18 },
  block: { gap: 10 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chosen: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, minHeight: 52 },
  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  size: { alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 12, minWidth: 76, minHeight: 72, borderWidth: 1, borderColor: 'transparent', flexGrow: 1 },
  sizeOn: { borderColor: colors.ochre, backgroundColor: colors.surfaceActive },
  sizeDot: { backgroundColor: colors.faint },
  sizeLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
});
