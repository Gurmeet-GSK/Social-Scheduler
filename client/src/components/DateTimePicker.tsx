'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar1Icon, Clock10Icon, ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINS  = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

export default function DateTimePicker({
    scheduledDate, setScheduledDate,
    scheduledTime, setScheduledTime,
}: {
    scheduledDate: string
    setScheduledDate: (v: string) => void
    scheduledTime: string
    setScheduledTime: (v: string) => void
}) {
    const now = new Date()

    const [showCal,        setShowCal]       = useState(false)
    const [showTime,       setShowTime]       = useState(false)
    const [viewYear,       setViewYear]       = useState(now.getFullYear())
    const [viewMonth,      setViewMonth]      = useState(now.getMonth())
    const [showYearPicker, setShowYearPicker] = useState(false)

    const calRef  = useRef<HTMLDivElement>(null)
    const timeRef = useRef<HTMLDivElement>(null)

    // ── Derived values ──────────────────────────────────────────────────────
    const selectedDate = scheduledDate ? new Date(scheduledDate + 'T00:00:00') : null

    const [selHour, selMin] = scheduledTime
        ? scheduledTime.split(':').map(Number)
        : [null, null]

    const displayHour = selHour != null ? String(selHour).padStart(2, '0') : '--'
    const displayMin  = selMin  != null ? String(selMin).padStart(2, '0')  : '--'
    const displayTime = selHour != null ? `${displayHour}:${displayMin}` : 'Pick a time'

    const nowHour = now.getHours()
    const nowMin  = now.getMinutes()

    // Is the selected date today?
    const selectedIsToday =
        !!selectedDate &&
        selectedDate.getDate()     === now.getDate() &&
        selectedDate.getMonth()    === now.getMonth() &&
        selectedDate.getFullYear() === now.getFullYear()

    // Is the selected hour the current hour on today?
    const isCurrentHourSelected = selectedIsToday && selHour === nowHour

    // ── Disable helpers ─────────────────────────────────────────────────────
    function isPastDate(day: number): boolean {
        const todayFlat = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const check     = new Date(viewYear, viewMonth, day)
        return check < todayFlat
    }

    function isHourDisabled(h: string): boolean {
        if (!selectedIsToday) return false
        const h24 = parseInt(h)
        if (h24 < nowHour) return true
        if (h24 === nowHour && nowMin >= 59) return true
        return false
    }

    function isMinDisabled(m: number): boolean {
        if (!isCurrentHourSelected) return false
        return m <= nowMin
    }

    // ── Handlers ────────────────────────────────────────────────────────────
    function selectDay(day: number) {
        if (isPastDate(day)) return
        const m = String(viewMonth + 1).padStart(2, '0')
        const d = String(day).padStart(2, '0')
        setScheduledDate(`${viewYear}-${m}-${d}`)
        setShowCal(false)
        setShowYearPicker(false)
    }

    function selectHour(h: string) {
        if (isHourDisabled(h)) return
        const h24        = parseInt(h)
        const currentMin = selMin ?? 0
        // If picking the current hour on today, clamp minutes forward
        const isNowHour  = selectedIsToday && h24 === nowHour
        const clampedMin = isNowHour ? Math.max(currentMin, nowMin + 1) : currentMin
        setScheduledTime(`${String(h24).padStart(2, '0')}:${String(clampedMin).padStart(2, '0')}`)
    }

    function selectMin(m: string) {
        if (isMinDisabled(parseInt(m))) return
        const h24 = selHour ?? 0
        setScheduledTime(`${String(h24).padStart(2, '0')}:${m}`)
        setShowTime(false)
    }

    function clearDate() { setScheduledDate('') }
    function clearTime() { setScheduledTime('') }

    // ── Close on outside click ──────────────────────────────────────────────
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (calRef.current  && !calRef.current.contains(e.target as Node))
                { setShowCal(false); setShowYearPicker(false) }
            if (timeRef.current && !timeRef.current.contains(e.target as Node))
                setShowTime(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // ── Calendar grid ───────────────────────────────────────────────────────
    const firstDay  = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMon = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMon }, (_, i) => i + 1)
    ]

    const isToday = (day: number) =>
        day === now.getDate() &&
        viewMonth === now.getMonth() &&
        viewYear  === now.getFullYear()

    const isSelected = (day: number) =>
        !!selectedDate &&
        day === selectedDate.getDate() &&
        viewMonth === selectedDate.getMonth() &&
        viewYear  === selectedDate.getFullYear()

    const displayDate = selectedDate
        ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Pick a date'

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* ── Date Picker ──────────────────────────────────────────────── */}
            <div className="relative" ref={calRef}>
                <button
                    type="button"
                    onClick={() => { setShowCal(p => !p); setShowTime(false) }}
                    className={`
                        w-full flex items-center gap-3 px-4 py-3 bg-white border rounded-xl text-sm
                        shadow-sm transition-all duration-200
                        ${showCal
                            ? 'border-slate-400 ring-2 ring-slate-900/8'
                            : 'border-slate-200 hover:border-slate-300'}
                    `}
                >
                    <Calendar1Icon className="size-4 text-slate-400 flex-shrink-0" />
                    <span className={`flex-1 text-left ${scheduledDate ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                        {displayDate}
                    </span>
                    {scheduledDate && (
                        <span
                            role="button"
                            onClick={(e) => { e.stopPropagation(); clearDate() }}
                            className="text-slate-300 hover:text-slate-500 transition-colors"
                        >
                            <XIcon className="size-3.5" />
                        </span>
                    )}
                </button>

                {showCal && (
                    <div className="absolute bottom-full left-0 mb-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4">

                        {/* Month navigation */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                onClick={() => {
                                    if (showYearPicker) return
                                    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
                                    else setViewMonth(m => m - 1)
                                }}
                                className={`p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors ${showYearPicker ? 'invisible' : ''}`}
                            >
                                <ChevronLeftIcon className="size-4" />
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowYearPicker(p => !p)}
                                className="text-sm font-semibold text-slate-800 hover:text-slate-500 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
                            >
                                {MONTHS[viewMonth]} {viewYear}
                                <span className="ml-1 text-slate-400 text-xs">{showYearPicker ? '▲' : '▼'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (showYearPicker) return
                                    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
                                    else setViewMonth(m => m + 1)
                                }}
                                className={`p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors ${showYearPicker ? 'invisible' : ''}`}
                            >
                                <ChevronRightIcon className="size-4" />
                            </button>
                        </div>

                        {showYearPicker ? (
                            <div className="flex flex-col gap-1 mb-2 max-h-64 overflow-y-auto pr-2">
                                {Array.from({ length: 26 }, (_, i) => now.getFullYear() + i).map(year => (
                                    <button
                                        key={year}
                                        type="button"
                                        onClick={() => { setViewYear(year); setShowYearPicker(false) }}
                                        className={`
                                            w-full py-2 px-3 rounded-lg text-sm font-medium transition-all text-left
                                            ${viewYear === year
                                                ? 'bg-slate-900 text-white'
                                                : 'text-slate-600 hover:bg-slate-100'}
                                        `}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-7 mb-2">
                                    {DAYS.map(d => (
                                        <div key={d} className="text-center text-[11px] font-medium text-slate-400 py-1">{d}</div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-y-1" style={{ gridTemplateRows: 'repeat(6, 1fr)', minHeight: '192px' }}>
                                    {cells.map((day, i) => day === null ? (
                                        <div key={i} />
                                    ) : (
                                        <button
                                            key={i}
                                            type="button"
                                            disabled={isPastDate(day)}
                                            onClick={() => selectDay(day)}
                                            className={`
                                                h-8 w-8 mx-auto rounded-lg text-xs font-medium transition-all
                                                ${isPastDate(day)
                                                    ? 'text-slate-300 cursor-not-allowed opacity-50'
                                                    : isSelected(day)
                                                        ? 'bg-slate-900 text-white'
                                                        : isToday(day)
                                                            ? 'bg-slate-100 text-slate-900 font-semibold'
                                                            : 'text-slate-600 hover:bg-slate-100'}
                                            `}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ── Time Picker ──────────────────────────────────────────────── */}
            <div className="relative" ref={timeRef}>
                <button
                    type="button"
                    onClick={() => { setShowTime(p => !p); setShowCal(false) }}
                    className={`
                        w-full flex items-center gap-3 px-4 py-3 bg-white border rounded-xl text-sm
                        shadow-sm transition-all duration-200
                        ${showTime
                            ? 'border-slate-400 ring-2 ring-slate-900/8'
                            : 'border-slate-200 hover:border-slate-300'}
                    `}
                >
                    <Clock10Icon className="size-4 text-slate-400 flex-shrink-0" />
                    <span className={`flex-1 text-left ${scheduledTime ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                        {displayTime}
                    </span>
                    {scheduledTime && (
                        <span
                            role="button"
                            onClick={(e) => { e.stopPropagation(); clearTime() }}
                            className="text-slate-300 hover:text-slate-500 transition-colors"
                        >
                            <XIcon className="size-3.5" />
                        </span>
                    )}
                </button>

                {showTime && (
                    <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4">

                        <div className="flex gap-3">

                            {/* Hours */}
                            <div className="flex-1">
                                <p className="text-[10px] text-slate-400 font-medium mb-1.5 text-center uppercase tracking-wide">Hour</p>
                                <div className="h-44 overflow-y-auto scrollbar-thin space-y-0.5 pr-1">
                                    {HOURS.map(h => {
                                        const active   = selHour === parseInt(h)
                                        const disabled = isHourDisabled(h)
                                        return (
                                            <button
                                                key={h}
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => selectHour(h)}
                                                className={`
                                                    w-full py-1.5 rounded-lg text-xs font-medium transition-all
                                                    ${disabled
                                                        ? 'text-slate-300 cursor-not-allowed opacity-50'
                                                        : active
                                                            ? 'bg-slate-900 text-white'
                                                            : 'text-slate-600 hover:bg-slate-100'}
                                                `}
                                            >
                                                {h}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center text-slate-300 font-bold text-lg pb-2">:</div>

                            {/* Minutes */}
                            <div className="flex-1">
                                <p className="text-[10px] text-slate-400 font-medium mb-1.5 text-center uppercase tracking-wide">Min</p>
                                <div className="h-44 overflow-y-auto scrollbar-thin space-y-0.5 pl-1">
                                    {MINS.map(m => {
                                        const active   = selMin === parseInt(m)
                                        const disabled = isMinDisabled(parseInt(m))
                                        return (
                                            <button
                                                key={m}
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => selectMin(m)}
                                                className={`
                                                    w-full py-1.5 rounded-lg text-xs font-medium transition-all
                                                    ${disabled
                                                        ? 'text-slate-300 cursor-not-allowed opacity-50'
                                                        : active
                                                            ? 'bg-slate-900 text-white'
                                                            : 'text-slate-600 hover:bg-slate-100'}
                                                `}
                                            >
                                                {m}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>

        </div>
    )
}