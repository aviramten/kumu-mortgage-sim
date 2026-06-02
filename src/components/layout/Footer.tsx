/**
 * Footer — disclaimer bar shown at the bottom of the Dashboard.
 * Height: 60px. Always visible, no-print via print.css.
 */

export function Footer() {
  return (
    <footer
      className="flex-shrink-0 flex items-center justify-center px-6 border-t border-gray-100 dark:border-kumu-navy-light bg-white dark:bg-kumu-surface-dark no-print"
      style={{ height: 60 }}
    >
      <p className="text-[11px] text-center text-kumu-navy-light dark:text-kumu-blue-lighter leading-relaxed max-w-3xl">
        הסימולציה למטרות תכנון בלבד ואינה מהווה ייעוץ פיננסי, משפטי או מס.
        תמיד התייעצו עם איש מקצוע מורשה לפני קבלת החלטות פיננסיות.
      </p>
    </footer>
  )
}
