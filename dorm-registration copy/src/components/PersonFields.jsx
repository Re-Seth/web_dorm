const PREFIXES = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง']

export default function PersonFields({ data, onChange, withCitizenId = false, idPrefix }) {
  function set(field, value) {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <label className="field-label" htmlFor={`${idPrefix}-prefix`}>คำนำหน้า</label>
        <select
          id={`${idPrefix}-prefix`}
          className="field"
          value={data.prefix}
          onChange={(e) => set('prefix', e.target.value)}
        >
          <option value="">เลือกคำนำหน้า</option>
          {PREFIXES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div />

      <div>
        <label className="field-label" htmlFor={`${idPrefix}-first`}>ชื่อจริง</label>
        <input
          id={`${idPrefix}-first`}
          className="field"
          value={data.firstName}
          onChange={(e) => set('firstName', e.target.value)}
          placeholder="ชื่อจริง"
        />
      </div>
      <div>
        <label className="field-label" htmlFor={`${idPrefix}-last`}>นามสกุล</label>
        <input
          id={`${idPrefix}-last`}
          className="field"
          value={data.lastName}
          onChange={(e) => set('lastName', e.target.value)}
          placeholder="นามสกุล"
        />
      </div>

      {withCitizenId && (
        <div>
          <label className="field-label" htmlFor={`${idPrefix}-citizen`}>เลขบัตรประชาชน (13 หลัก)</label>
          <input
            id={`${idPrefix}-citizen`}
            className="field font-mono"
            maxLength={13}
            inputMode="numeric"
            value={data.citizenId || ''}
            onChange={(e) => set('citizenId', e.target.value.replace(/\D/g, '').slice(0, 13))}
            placeholder="1234567890123"
          />
        </div>
      )}

      <div>
        <label className="field-label" htmlFor={`${idPrefix}-phone`}>เบอร์โทรศัพท์</label>
        <input
          id={`${idPrefix}-phone`}
          className="field font-mono"
          maxLength={10}
          inputMode="numeric"
          value={data.phone}
          onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="08xxxxxxxx"
        />
      </div>
    </div>
  )
}
