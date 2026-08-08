export default function StepIndicator({ steps, current }) {
  return (
    <ol className="flex items-center w-full mb-8" aria-label="ขั้นตอนการลงทะเบียน">
      {steps.map((label, i) => {
        const stepNum = i + 1
        const state = stepNum < current ? 'done' : stepNum === current ? 'active' : 'todo'
        return (
          <li key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={
                  'w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-mono text-sm font-medium border ' +
                  (state === 'done'
                    ? 'bg-gold border-gold text-charcoal'
                    : state === 'active'
                    ? 'border-gold text-gold'
                    : 'border-charcoal-line text-bone/40')
                }
                aria-current={state === 'active' ? 'step' : undefined}
              >
                {state === 'done' ? '✓' : stepNum}
              </span>
              <span className={'text-sm hidden sm:inline ' + (state === 'todo' ? 'text-bone/40' : 'text-bone/90')}>
                {label}
              </span>
            </div>
            {stepNum !== steps.length && (
              <div className={'flex-1 h-px mx-3 ' + (state === 'done' ? 'bg-gold' : 'bg-charcoal-line')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
