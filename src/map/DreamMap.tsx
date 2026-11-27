// Carte des rêves — version Android : la page de la carte dans une WebView.
import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { MAP_HTML } from './mapHtml.generated';
import { getViewToRestore, setLastMapView } from './mapState';
import type { DreamMapProps } from './types';

export function DreamMap(props: DreamMapProps) {
  const web = useRef<{ postMessage(data: string): void } | null>(null);
  const ready = useRef(false);
  const propsRef = useRef(props);
  propsRef.current = props;

  const post = useCallback((msg: object) => {
    web.current?.postMessage(JSON.stringify(msg));
  }, []);

  const pushState = useCallback(() => {
    const p = propsRef.current;
    post({ type: 'state', places: p.places, selectedId: p.selectedId, view: getViewToRestore(p.places.length) });
  }, [post]);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let msg: any;
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      const p = propsRef.current;
      if (msg.type === 'ready') {
        ready.current = true;
        pushState();
        if (p.focus) setTimeout(() => post({ type: 'focus', id: p.focus!.id }), 350);
      } else if (msg.type === 'select') p.onSelect(msg.id ?? null);
      else if (msg.type === 'move') p.onMove(msg.id, msg.lat, msg.lon);
      else if (msg.type === 'view') setLastMapView({ lat: msg.lat, lon: msg.lon, zoom: msg.zoom }, propsRef.current.places.length);
    },
    [pushState],
  );

  useEffect(() => {
    if (ready.current) pushState();
  }, [props.places, props.selectedId, pushState]);

  useEffect(() => {
    if (ready.current && props.focus) post({ type: 'focus', id: props.focus.id });
  }, [props.focus, post]);

  useEffect(() => {
    if (ready.current && props.fitSignal) post({ type: 'fit' });
  }, [props.fitSignal, post]);

  return (
    <View style={{ flex: 1, backgroundColor: '#17142f' }} testID="dream-map">
      <WebView
        ref={web as never}
        source={{ html: MAP_HTML }}
        originWhitelist={['*']}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        overScrollMode="never"
        style={{ flex: 1, backgroundColor: '#17142f' }}
        androidLayerType="hardware"
      />
    </View>
  );
}
