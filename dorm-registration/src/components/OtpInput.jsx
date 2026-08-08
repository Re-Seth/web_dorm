import { useRef } from 'react'

export default function OtpInput({ value, onChange, length = 6 }) {
  const inputsRef = useRef([])
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length)

  function setDigit(index, digit) {
    const next = [...digits]
    next[index] = digit
    onChange(next.join(''))
    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(e, index) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pasted) {
      e.preventDefault()
      onChange(pasted.padEnd(length, '').slice(0, length).trimEnd())
      inputsRef.current[Math.min(pasted.length, length - 1)]?.focus()
    }
  }

  return (
    <div className="flex gap-2 justify-between" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => setDigit(i, e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className="w-11 h-12 text-center text-lg font-mono bg-charcoal border border-charcoal-line rounded-md
            text-bone focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
          aria-label={`หลักที่ ${i + 1} ของรหัส OTP`}
        />
      ))}
    </div>
  )
}
