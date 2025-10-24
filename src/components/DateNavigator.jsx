import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function DateNavigator({ selectedDate, onDateChange, assignmentCounts = {} }) {
  const [showCalendar, setShowCalendar] = useState(false);

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const parseDate = (dateStr) => {
    return new Date(dateStr + 'T00:00:00');
  };

  const goToToday = () => {
    const today = formatDate(new Date());
    onDateChange(today);
  };

  const goToPrevious = () => {
    const current = parseDate(selectedDate);
    const previous = new Date(current);
    previous.setDate(previous.getDate() - 1);
    onDateChange(formatDate(previous));
  };

  const goToNext = () => {
    const current = parseDate(selectedDate);
    const next = new Date(current);
    next.setDate(next.getDate() + 1);
    onDateChange(formatDate(next));
  };

  const handleCalendarChange = (date) => {
    onDateChange(formatDate(date));
    setShowCalendar(false);
  };

  const formatDisplayDate = (dateStr) => {
    const date = parseDate(dateStr);
    const today = new Date();
    const todayStr = formatDate(today);

    if (dateStr === todayStr) {
      return `Today, ${date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })}`;
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = formatDate(date);
      const counts = assignmentCounts[dateStr];

      if (counts && (counts.AM > 0 || counts.PM > 0)) {
        return (
          <div className="flex gap-1 justify-center mt-1">
            {counts.AM > 0 && (
              <span className="bg-amber-500 text-white text-xs rounded px-1 py-0.5 leading-none">
                {counts.AM}
              </span>
            )}
            {counts.PM > 0 && (
              <span className="bg-indigo-500 text-white text-xs rounded px-1 py-0.5 leading-none">
                {counts.PM}
              </span>
            )}
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Date Display */}
        <div className="flex-1 min-w-[300px]">
          <h2 className="text-2xl font-bold text-gray-800">
            {formatDisplayDate(selectedDate)}
          </h2>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevious}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
            title="Previous Day"
          >
            ← Prev
          </button>

          <button
            onClick={goToToday}
            className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold rounded-lg transition"
            title="Go to Today"
          >
            Today
          </button>

          <button
            onClick={goToNext}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
            title="Next Day"
          >
            Next →
          </button>

          <div className="relative">
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              title="Open Calendar"
            >
              📅 Calendar
            </button>

            {showCalendar && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowCalendar(false)}
                />

                {/* Calendar Popup */}
                <div className="absolute right-0 mt-2 z-50 bg-white rounded-lg shadow-xl p-4 border border-gray-200">
                  <Calendar
                    onChange={handleCalendarChange}
                    value={parseDate(selectedDate)}
                    tileContent={getTileContent}
                    className="border-0"
                  />
                  <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="bg-amber-500 text-white rounded px-2 py-1">AM</span>
                        <span>Morning routes</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="bg-indigo-500 text-white rounded px-2 py-1">PM</span>
                        <span>Afternoon routes</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
