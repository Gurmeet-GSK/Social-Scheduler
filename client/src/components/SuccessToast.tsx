import { useEffect, useState } from "react"
import { CheckCircle2Icon, XIcon } from "lucide-react"

const EXIT_DURATION = 300 // ms — must match the transition duration below

const SuccessToast = ({
    show,
    onClose,
    scheduledDate,
    scheduledTime,
    duration = 3500,
}: {
    show: boolean
    onClose: () => void
    scheduledDate: string
    scheduledTime: string
    duration?: number
}) => {
    // Controls whether the component is mounted at all (stays true during exit animation)
    const [mounted, setMounted] = useState(false)
    // Controls the visual in/out state (toggling this drives the transition)
    const [visible, setVisible] = useState(false)

    // Mount + animate in when `show` becomes true
    useEffect(() => {
        if (show) {
            setMounted(true)
            // Wait a tick so the initial (hidden) styles paint first, then transition in
            const raf = requestAnimationFrame(() => setVisible(true))
            return () => cancelAnimationFrame(raf)
        } else {
            setVisible(false)
        }
    }, [show])

    // Auto-dismiss timer
    useEffect(() => {
        if (!show) return
        const timer = setTimeout(() => setVisible(false), duration)
        return () => clearTimeout(timer)
    }, [show, duration])

    // Once the exit transition finishes, unmount and notify parent
    useEffect(() => {
        if (mounted && !visible) {
            const timer = setTimeout(() => {
                setMounted(false)
                onClose()
            }, EXIT_DURATION)
            return () => clearTimeout(timer)
        }
    }, [visible, mounted, onClose])

    if (!mounted) return null

    const formattedDateTime = (() => {
        if (!scheduledDate || !scheduledTime) return null
        const [hours, minutes] = scheduledTime.split(":").map(Number)
        const dt = new Date(scheduledDate + "T00:00:00")
        dt.setHours(hours, minutes)
        return dt.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    })()

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center px-4 pointer-events-none transition-colors duration-300 ${
                visible ? "bg-slate-900/10" : "bg-transparent"
            }`}
        >
            <div
                className={`flex items-start gap-3 bg-white border border-emerald-100 shadow-2xl rounded-2xl px-6 py-5 w-full max-w-sm transition-all duration-300 ease-out ${
                    visible
                        ? "opacity-100 scale-100 translate-y-0"
                        : "opacity-0 scale-95 translate-y-2"
                }`}
            >
                <CheckCircle2Icon className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">Your post has been scheduled</p>
                    {formattedDateTime && (
                        <p className="text-xs text-slate-500 mt-1">{formattedDateTime}</p>
                    )}
                </div>
                <button
                    onClick={() => setVisible(false)}
                    className="text-slate-300 hover:text-slate-500 transition-colors shrink-0 pointer-events-auto"
                >
                    <XIcon className="size-4" />
                </button>
            </div>
        </div>
    )
}

export default SuccessToast