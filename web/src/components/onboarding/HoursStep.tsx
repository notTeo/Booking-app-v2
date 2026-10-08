import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';
import {
  createStaffSchedule,
  getStaffSchedules,
  upsertStaffDays,
  type DayOfWeek,
  type HourRange,
  type Schedule,
} from '../../api/workingHours.api';
import { apiErrorMessage } from '../../utils/apiError';
import { todayInZone } from '../../utils/shopTime';
import Alert from '../Alert';
import Switch from '../Switch';
import { WizardFooter, WizardIntro } from './Wizard';
import type { SetupStepProps } from './steps';
import '../../styles/pages/working-hours.css';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const WEEKEND: DayOfWeek[] = ['SAT', 'SUN'];
const DEFAULT_RANGE: HourRange = { startTime: '09:00', endTime: '17:00' };

type Week = Record<DayOfWeek, { isOpen: boolean; hours: HourRange[] }>;

/** Monday to Friday, nine to five: a start most shops only have to adjust. */
const defaultWeek = (): Week =>
  Object.fromEntries(
    DAYS.map((day) => [day, { isOpen: !WEEKEND.includes(day), hours: [{ ...DEFAULT_RANGE }] }]),
  ) as Week;

const weekOf = (schedule: Schedule): Week => {
  const week = defaultWeek();
  for (const day of DAYS) week[day] = { isOpen: false, hours: [{ ...DEFAULT_RANGE }] };
  for (const d of schedule.days) {
    week[d.day] = {
      isOpen: d.isOpen,
      hours: d.hours.length ? d.hours.map((h) => ({ startTime: h.startTime, endTime: h.endTime })) : [{ ...DEFAULT_RANGE }],
    };
  }
  return week;
};

/** The schedule in force today, if there is one: the step edits it rather than adding a second. */
const currentSchedule = (schedules: Schedule[], today: string) =>
  schedules.find(
    (s) => s.isActive && s.startDate.slice(0, 10) <= today && (!s.endDate || s.endDate.slice(0, 10) >= today),
  ) ?? null;

// The owner's own week: a switch and one opening time per day. Anything finer
// (a break, a second shift, hours for set dates) is on the full working hours.
export default function HoursStep({ shop, ownerMemberId, frame, onNext }: SetupStepProps) {
  const uid = useId();
  const { t } = useLang();
  const to = t.onboarding;
  const [week, setWeek] = useState<Week>(defaultWeek);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    getStaffSchedules(shop.id, ownerMemberId)
      .then((schedules) => {
        if (!live) return;
        const found = currentSchedule(schedules, todayInZone(shop.timezone));
        setSchedule(found);
        if (found) setWeek(weekOf(found));
      })
      .catch(() => live && setError(to.errorLoad))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [shop.id, shop.timezone, ownerMemberId, to.errorLoad]);

  const setDay = (day: DayOfWeek, patch: Partial<Week[DayOfWeek]>) =>
    setWeek((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));

  // Only the first opening time is edited here; any others are kept as they are.
  const setTime = (day: DayOfWeek, key: keyof HourRange, value: string) =>
    setDay(day, { hours: week[day].hours.map((h, i) => (i === 0 ? { ...h, [key]: value } : h)) });

  const save = async () => {
    if (saving) return;
    if (DAYS.some((d) => week[d].isOpen && week[d].hours[0].startTime >= week[d].hours[0].endTime)) {
      setError(to.hours.endBeforeStart);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const target = schedule ?? (await createStaffSchedule(shop.id, ownerMemberId, { startDate: todayInZone(shop.timezone) }));
      setSchedule(target);
      await upsertStaffDays(shop.id, ownerMemberId, target.id, {
        days: DAYS.map((day) => ({ day, isOpen: week[day].isOpen, hours: week[day].isOpen ? week[day].hours : [] })),
      });
      onNext();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, to.errorSave));
      setSaving(false);
    }
  };

  return frame(
    <WizardFooter onSkip={onNext} main={{ label: to.hours.save, onClick: save, loading: saving, disabled: loading }} />,
    <>
      <WizardIntro title={to.hours.title} text={to.hours.intro} />
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" role="status" /></div>
      ) : (
        <div className="card">
          <ul className="list">
            {DAYS.map((day) => {
              const { isOpen, hours } = week[day];
              const name = to.hours.days[day];
              return (
                <li key={day} className="list__item">
                  <span className="cluster cluster--nowrap">
                    <Switch id={`${uid}-${day}`} checked={isOpen} onChange={(v) => setDay(day, { isOpen: v })} disabled={saving} />
                    <label className="setting-row__title" htmlFor={`${uid}-${day}`}>{name}</label>
                  </span>
                  {isOpen ? (
                    <span className="working-hours__slot">
                      <input
                        className="input input--sm"
                        type="time"
                        value={hours[0].startTime}
                        onChange={(e) => setTime(day, 'startTime', e.target.value)}
                        aria-label={to.hours.from.replace('{day}', name)}
                        disabled={saving}
                        required
                      />
                      <span className="t-muted" aria-hidden="true">–</span>
                      <input
                        className="input input--sm"
                        type="time"
                        value={hours[0].endTime}
                        onChange={(e) => setTime(day, 'endTime', e.target.value)}
                        aria-label={to.hours.to.replace('{day}', name)}
                        disabled={saving}
                        required
                      />
                      {hours.length > 1 && (
                        <span className="badge badge--neutral">{to.hours.more.replace('{n}', String(hours.length - 1))}</span>
                      )}
                    </span>
                  ) : (
                    <span className="t-muted">{to.hours.closed}</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="card__text">
            <Link to={`/shops/${shop.slug}/team/${ownerMemberId}`}>{to.hours.fullEditor}</Link>
          </p>
        </div>
      )}
      {error && <Alert variant="danger">{error}</Alert>}
    </>,
  );
}
