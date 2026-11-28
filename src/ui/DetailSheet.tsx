import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Title } from './components';
import { colors } from './theme';

/**
 * Petite fenêtre qui s'ouvre quand on touche un détail sur une page de lecture : seulement le sélecteur de ce
 * détail. Sur téléphone, un volet qui monte du bas ; sur PC, une carte au centre.
 */
export function DetailSheet(props: { visible: boolean; title: string; phone: boolean; onClose: () => void; children: ReactNode; testID?: string }) {
  return (
    <Modal visible={props.visible} transparent animationType={props.phone ? 'slide' : 'fade'} onRequestClose={props.onClose}>
      <Pressable style={[styles.backdrop, props.phone ? styles.backdropPhone : styles.backdropPc]} onPress={props.onClose} accessibilityLabel="Fermer">
        <Pressable style={[styles.card, props.phone ? styles.cardPhone : styles.cardPc]} onPress={() => {}} testID={props.testID ?? 'detail-sheet'}>
          <View style={styles.head}>
            <Title size={22} style={{ flex: 1 }}>
              {props.title}
            </Title>
            <IconButton image="fermer" size={18} label="Fermer" onPress={props.onClose} />
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 14, paddingBottom: 4 }} keyboardShouldPersistTaps="handled">
            {props.children}
          </ScrollView>
          <View style={styles.foot}>
            <Button label="OK" image="coche" variant="primary" onPress={props.onClose} testID="detail-ok" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,4,12,0.6)' },
  backdropPhone: { justifyContent: 'flex-end' },
  backdropPc: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.bgDeep, borderColor: colors.border, borderWidth: 1, padding: 18, gap: 14 },
  cardPhone: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%', paddingBottom: 28 },
  cardPc: { borderRadius: 20, width: 640, maxWidth: '100%', maxHeight: '90%' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  foot: { flexDirection: 'row', justifyContent: 'flex-end' },
});
