import { useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  format,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthCalendarProps {
  selected: Date;
  onChange: (date: Date) => void;
}

export function MonthCalendar({ selected, onChange }: MonthCalendarProps) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(selected));

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="p-2 rounded-lg active:bg-slate-200 transition-colors"
        >
          <ChevronLeft size={24} className="text-slate-700" />
        </button>
        <h3 className="text-lg font-bold text-slate-900 capitalize">
          {format(viewMonth, 'MMMM yyyy', { locale: es })}
        </h3>
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="p-2 rounded-lg active:bg-slate-200 transition-colors"
        >
          <ChevronRight size={24} className="text-slate-700" />
        </button>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((d) => (
            <div
              key={d}
              className="text-center text-sm font-semibold text-slate-500 py-1"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const inMonth = isSameMonth(day, viewMonth);
            const isSelected = isSameDay(day, selected);
            const today = isToday(day);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  onChange(day);
                }}
                disabled={!inMonth}
                className={`
                  aspect-square flex items-center justify-center rounded-lg text-base font-medium transition-colors
                  ${!inMonth ? 'text-slate-300 cursor-default' : 'active:bg-blue-100'}
                  ${isSelected ? 'bg-blue-600 text-white font-bold' : ''}
                  ${!isSelected && today && inMonth ? 'bg-blue-50 text-blue-700 font-bold ring-2 ring-blue-300' : ''}
                  ${!isSelected && !today && inMonth ? 'text-slate-900 hover:bg-slate-100' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
