// Carte des rêves — version web / PC : la page de la carte dans une iframe.
import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { MAP_HTML } from './mapHtml.generated';
import { getViewToRestore, setLastMapView } from './mapState';
import type { DreamMapProps } from './types';

export function DreamMap(props: DreamMapProps) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const ready = useRef(false);
  const propsRef = useRef(props);
  propsRef.current = props;

  const post = useCallback((msg: object) => {
    frame.current?.contentWindow?.postMessage({ __dreammapHost: true, payload: JSON.stringify(msg) }, '*');
  }, []);

  const pushState = useCallback(
    (extra: object = {}) => {
      const p = propsRef.current;
      post({ type: 'state', places: p.places, selectedId: p.selectedId, view: getViewToRestore(p.places.length), route: p.route ?? null, drawing: !!p.drawing, ...extra });
    },
    [post],
  );

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || !e.data.__dreammap || e.source !== frame.current?.contentWindow) return;
      let msg: any;
      try {
        msg = JSON.parse(e.data.payload);
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
      else if (msg.type === 'tap') p.onTap?.(msg.lat, msg.lon);
      else if (msg.type === 'view') setLastMapView({ lat: msg.lat, lon: msg.lon, zoom: msg.zoom }, propsRef.current.places.length);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [pushState, post]);

  useEffect(() => {
    if (ready.current) pushState();
  }, [props.places, props.selectedId, props.route, props.drawing, pushState]);

  useEffect(() => {
    if (ready.current && props.focus) post({ type: 'focus', id: props.focus.id });
  }, [props.focus, post]);

  useEffect(() => {
    if (ready.current && props.fitSignal) post({ type: 'fit' });
  }, [props.fitSignal, post]);

  return (
    <View style={{ flex: 1 }} testID="dream-map">
      <iframe
        ref={frame}
        title="Carte des rêves"
        srcDoc={MAP_HTML}
        style={{ border: 0, width: '100%', height: '100%', display: 'block', background: '#17142f' }}
      />
    </View>
  );
}
