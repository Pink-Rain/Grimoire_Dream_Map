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
