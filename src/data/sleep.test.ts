import { describe, expect, it } from 'vitest';
import { defaultSleepDate, formatDuration, normalizeTime, sleepEndDate, summarizeSleep } from './sleep';

describe('sommeil', () => {
  it('une nuit qui passe minuit', () => {
    const s = summarizeSleep({ bedTime: '23:30', asleepTime: '23:50', wakeTime: '07:10', upTime: '07:30' });
    expect(s.fallAsleep).toBe(20);
    expect(s.sleep).toBe(7 * 60 + 20);
    expect(s.getUp).toBe(20);
    expect(s.inBed).toBe(8 * 60);
    expect(s.wakeDayOffset).toBe(1);
    expect(s.isNap).toBe(false);
  });

  it('enlève les réveils pendant la nuit', () => {
    const s = summarizeSleep({
      bedTime: '23:00',
      asleepTime: '23:15',
      wakeTime: '07:15',
      interruptions: [
        { id: 'b', from: '04:00', to: '04:30' },
        { id: 'a', from: '01:00', to: '01:10' },
      ],
    });
    expect(s.awake).toBe(40);
    expect(s.sleep).toBe(8 * 60 - 40);
    expect(s.interruptions[0].from).toBe(25 * 60);
  });

  it('une sieste dans l’après-midi', () => {
    const s = summarizeSleep({ bedTime: '14:00', asleepTime: '14:10', wakeTime: '14:50' });
    expect(s.sleep).toBe(40);
    expect(s.isNap).toBe(true);
    expect(s.wakeDayOffset).toBe(0);
  });

  it('un endormissement après minuit', () => {
    const s = summarizeSleep({ bedTime: '23:40', asleepTime: '00:20', wakeTime: '08:00' });
    expect(s.fallAsleep).toBe(40);
    expect(s.sleep).toBe(7 * 60 + 40);
  });

  it('fonctionne avec des heures manquantes', () => {
    const s = summarizeSleep({ wakeTime: '07:00' });
    expect(s.sleep).toBeNull();
    expect(s.fallAsleep).toBeNull();
    expect(summarizeSleep({ bedTime: '22:00', wakeTime: '06:00' }).inBed).toBe(8 * 60);
  });

  it('range la nuit au jour du réveil', () => {
    expect(sleepEndDate({ date: '2026-11-26', bedTime: '23:30', wakeTime: '07:00' })).toBe('2026-11-27');
    expect(sleepEndDate({ date: '2026-11-27', bedTime: '00:30', wakeTime: '07:00' })).toBe('2026-11-27');
  });

  it('comprend les heures tapées vite', () => {
    expect(normalizeTime('2330')).toBe('23:30');
    expect(normalizeTime('7h05')).toBe('07:05');
    expect(normalizeTime('7')).toBe('07:00');
    expect(normalizeTime('25:00')).toBeNull();
    expect(formatDuration(445)).toBe('7 h 25');
    expect(formatDuration(40)).toBe('40 min');
  });

  it('propose la veille quand on note le matin', () => {
    expect(defaultSleepDate(new Date(2026, 10, 27, 8, 0))).toBe('2026-11-26');
    expect(defaultSleepDate(new Date(2026, 10, 27, 16, 0))).toBe('2026-11-27');
  });
});

import { autoSleepFor, candidateSleepsFor, sleepTitle } from './sleep';
describe('lien rêves ↔ sommeil', () => {
  const night = { date: '2026-11-26', bedTime: '23:30', wakeTime: '07:00' };
  const nap = { date: '2026-11-27', bedTime: '14:00', wakeTime: '14:40' };
  it('lie un rêve du matin à la nuit qui vient de finir', () => {
    expect(autoSleepFor([night, nap], '2026-11-27')).toBe(night);
    expect(autoSleepFor([nap], '2026-11-27')).toBeNull();
    expect(candidateSleepsFor([night, nap], '2026-11-27')).toEqual([night, nap]);
  });
  it('nomme les nuits et les siestes', () => {
    expect(sleepTitle(night)).toBe('Nuit du 26 au 27 nov.');
    expect(sleepTitle(nap)).toBe('Sieste du 27 nov.');
  });
});

import { trackerSegments } from './sleep';
describe('tracker de sommeil', () => {
  it('une nuit tient sur la ligne du soir, de midi à midi', () => {
    const seg = trackerSegments({ date: '2026-11-26', bedTime: '23:00', asleepTime: '23:30', wakeTime: '07:00', upTime: '07:20', interruptions: [{ id: 'a', from: '03:00', to: '03:30' }] });
    expect(seg.every((x) => x.row === '2026-11-26')).toBe(true);
    expect(seg.map((x) => [x.kind, x.start, x.end])).toEqual([
      ['bed', 660, 690],
      ['sleep', 690, 900],
      ['awake', 900, 930],
      ['sleep', 930, 1140],
      ['up', 1140, 1160],
    ]);
  });
  it('un coucher après minuit reste sur la ligne de la veille', () => {
    const seg = trackerSegments({ date: '2026-11-27', bedTime: '00:30', wakeTime: '08:00' });
    expect(seg[0]).toEqual({ row: '2026-11-26', start: 750, end: 1200, kind: 'sleep' });
  });
  it('une sieste apparaît dans l’après-midi de sa journée', () => {
    const seg = trackerSegments({ date: '2026-11-27', bedTime: '14:00', wakeTime: '14:45' });
    expect(seg[0]).toEqual({ row: '2026-11-27', start: 120, end: 165, kind: 'sleep' });
  });
});

import { addMinutes, completeInterruption } from './sleep';
describe('réveils pendant la nuit', () => {
  it('remplit l’autre heure 5 minutes plus tard ou plus tôt', () => {
    expect(completeInterruption({ from: '03:00', to: '' }, 'from')).toEqual({ from: '03:00', to: '03:05' });
    expect(completeInterruption({ from: '', to: '03:00' }, 'to')).toEqual({ from: '02:55', to: '03:00' });
    expect(completeInterruption({ from: '03:00', to: '03:40' }, 'from')).toEqual({ from: '03:00', to: '03:40' });
  });
  it('passe minuit', () => {
    expect(addMinutes('23:58', 5)).toBe('00:03');
    expect(addMinutes('00:02', -5)).toBe('23:57');
  });
});
