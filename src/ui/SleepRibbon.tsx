import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { TrackerSegment } from '../data/sleep';

/**
 * Dessin d'une ligne du tracker de sommeil (façon bullet journal soigné) :
 * - grille de points à l'encre, repère pointillé à minuit ;
 * - le sommeil en ruban émaillé dont la couleur suit l'heure (crépuscule → nuit → aube) ;
 * - un seul ruban du coucher au lever, contour continu : rempli quand on dort, vide quand on est éveillé au lit
 *   (avant de dormir, réveils de la nuit, après le réveil — tous dessinés pareil).
 */
export const RIBBON_STOPS: [number, string][] = [
  [0, '#c39a74'], // midi : ambre
  [360, '#94679f'], // 18 h : mauve du crépuscule
  [600, '#4f42a3'], // 22 h : indigo
  [840, '#5a47b8'], // 2 h : violet de nuit
  [1050, '#7b5fcb'], // 5 h 30
  [1170, '#c98b86'], // 7 h 30 : aube rosée
  [1440, '#d9a56f'], // midi
];

const BAND = 10;

export function RibbonDefs(props: { width: number; id: string }) {
  return (
    <Defs>
      <LinearGradient id={`${props.id}-sky`} x1="0" y1="0" x2={String(props.width)} y2="0" gradientUnits="userSpaceOnUse">
        {RIBBON_STOPS.map(([m, c]) => (
          <Stop key={m} offset={m / 1440} stopColor={c} />
        ))}
      </LinearGradient>
      <LinearGradient id={`${props.id}-gloss`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#ffffff" stopOpacity={0.32} />
        <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0} />
        <Stop offset="1" stopColor="#000000" stopOpacity={0.18} />
      </LinearGradient>
    </Defs>
  );
}

export function SleepRibbonRow(props: { width: number; height: number; segs: (TrackerSegment & { id: string })[]; id: string }) {
  const { width: w, height: h } = props;
  const x = (min: number) => (min / 1440) * w;
  const cy = h / 2;
  // Un ruban par sommeil (une ligne peut avoir une nuit et une sieste).
  const spans: { id: string; start: number; end: number; sleep: TrackerSegment[] }[] = [];
  for (const g of props.segs) {
    let sp = spans.find((v) => v.id === g.id);
    if (!sp) spans.push((sp = { id: g.id, start: g.start, end: g.end, sleep: [] }));
    sp.start = Math.min(sp.start, g.start);
    sp.end = Math.max(sp.end, g.end);
    if (g.kind === 'sleep') sp.sleep.push(g);
  }

  return (
    <Svg width={w} height={h}>
      <RibbonDefs width={w} id={props.id} />
      {/* Grille de points + repère de minuit */}
      <Line x1={x(720)} y1={0} x2={x(720)} y2={h} stroke="#3b3466" strokeWidth={1} strokeDasharray="2 4" />
      {Array.from({ length: 25 }, (_, i) => (
        <Circle key={i} cx={Math.min(w - 1.5, Math.max(1.5, x(i * 60)))} cy={cy} r={i % 3 === 0 ? 1.4 : 0.9} fill={i % 3 === 0 ? '#5a4f86' : '#3a335f'} />
      ))}
      {spans.map((sp, k) => {
        const a = x(sp.start);
        const bw = Math.max(BAND, x(sp.end) - a);
        const clip = `${props.id}-c${k}`;
        return (
          <G key={sp.id}>
            <Defs>
              <ClipPath id={clip}>
                <Rect x={a} y={cy - BAND / 2} width={bw} height={BAND} rx={BAND / 2} />
              </ClipPath>
            </Defs>
            {/* Un seul ruban du coucher au lever : vide quand on est éveillé, rempli quand on dort. */}
            <Rect x={a} y={cy - BAND / 2} width={bw} height={BAND} rx={BAND / 2} fill={`url(#${props.id}-sky)`} fillOpacity={0.12} />
            <G clipPath={`url(#${clip})`}>
              {sp.sleep.map((g, i) => (
                <G key={i}>
                  <Rect x={x(g.start)} y={cy - BAND / 2} width={Math.max(1, x(g.end) - x(g.start))} height={BAND} fill={`url(#${props.id}-sky)`} />
                  <Rect x={x(g.start)} y={cy - BAND / 2} width={Math.max(1, x(g.end) - x(g.start))} height={BAND} fill={`url(#${props.id}-gloss)`} />
                </G>
              ))}
            </G>
            <Rect x={a + 0.6} y={cy - BAND / 2 + 0.6} width={bw - 1.2} height={BAND - 1.2} rx={(BAND - 1.2) / 2} fill="none" stroke={`url(#${props.id}-sky)`} strokeWidth={1.2} />
          </G>
        );
      })}
    </Svg>
  );
}

/** Petits échantillons pour la légende. */
export function LegendSample(props: { kind: 'sleep' | 'awake' }) {
  const id = `lg-${props.kind}`;
  return (
    <Svg width={26} height={12}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#4f42a3" />
          <Stop offset="0.6" stopColor="#7b5fcb" />
          <Stop offset="1" stopColor="#c98b86" />
        </LinearGradient>
      </Defs>
      {props.kind === 'sleep' ? (
        <Rect x={1} y={1} width={24} height={10} rx={5} fill={`url(#${id})`} stroke="#f3e2c4" strokeOpacity={0.22} strokeWidth={0.8} />
      ) : (
        <Rect x={1.6} y={1.6} width={22.8} height={8.8} rx={4.4} fill={`url(#${id})`} fillOpacity={0.14} stroke={`url(#${id})`} strokeWidth={1.2} />
      )}
    </Svg>
  );
}
