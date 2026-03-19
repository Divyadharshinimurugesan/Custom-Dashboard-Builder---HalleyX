import React, { useState } from 'react';
import { COUNTRIES, STATUSES, CREATED_BY, validateEmail, validatePhone } from '../utils/helpers';

const PRODUCTS = [
  'Fiber Internet 300 Mbps',
  '5G Unlimited Mobile Plan',
  'Fiber Internet 1 Gbps',
  'Business Internet 500 Mbps',
  'VoIP Corporate Package',
];

const EMPTY = {
  firstName: '', lastName: '', email: '', phone: '',
  streetAddress: '', city: '', state: '', postalCode: '', country: '',
  product: 'Fiber Internet 300 Mbps',
  quantity: 1, unitPrice: '',
  status: 'Pending', createdBy: 'Mr. Michael Harris',
};

export default function OrderModal({ initial, onSave, onClose }) {
  const initForm = initial
    ? {
        firstName: initial.firstName || '',
        lastName:  initial.lastName  || '',
        email:     initial.email     || '',
        phone:     initial.phone     || '',
        streetAddress: initial.streetAddress || initial.address?.street || '',
        city:          initial.city          || initial.address?.city   || '',
        state:         initial.state         || initial.address?.state  || '',
        postalCode:    initial.postalCode    || initial.address?.postalCode || '',
        country:       initial.country       || initial.address?.country    || '',
        product:    initial.product    || PRODUCTS[0],
        quantity:   initial.quantity   || 1,
        unitPrice:  initial.unitPrice  ?? '',
        status:     initial.status     || 'Pending',
        createdBy:  initial.createdBy  || 'Mr. Michael Harris',
      }
    : EMPTY;

  const [form,    setForm]    = useState(initForm);
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [apiErr,  setApiErr]  = useState('');
  const [touched, setTouched] = useState({});

  const totalAmount = ((form.quantity || 0) * (parseFloat(form.unitPrice) || 0)).toFixed(2);

  const set   = (k, v) => { setForm(f => ({ ...f, [k]: v })); setTouched(t => ({ ...t, [k]: true })); };
  const touch = (k)    => setTouched(t => ({ ...t, [k]: true }));

  const getErrors = (f) => {
    const e = {};
    if (!f.firstName.trim())          e.firstName     = 'Please fill the field';
    if (!f.lastName.trim())           e.lastName      = 'Please fill the field';
    if (!f.email.trim())              e.email         = 'Please fill the field';
    else if (!validateEmail(f.email)) e.email         = 'Enter a valid email address';
    if (!f.phone.trim())              e.phone         = 'Please fill the field';
    else if (!validatePhone(f.phone)) e.phone         = 'Enter valid phone number (10 digits)';
    if (!f.streetAddress.trim())      e.streetAddress = 'Please fill the field';
    if (!f.city.trim())               e.city          = 'Please fill the field';
    if (!f.state.trim())              e.state         = 'Please fill the field';
    if (!f.postalCode.trim())         e.postalCode    = 'Please fill the field';
    if (!f.country)                   e.country       = 'Please fill the field';
    if (!f.product)                   e.product       = 'Please fill the field';
    if (!f.quantity || f.quantity < 1) e.quantity     = 'Quantity must be at least 1';
    if (!f.unitPrice || parseFloat(f.unitPrice) <= 0) e.unitPrice = 'Please fill the field';
    return e;
  };

  const visErrors = Object.fromEntries(Object.entries(getErrors(form)).filter(([k]) => touched[k]));

  const handleSubmit = async () => {
    const allKeys = Object.keys(EMPTY);
    setTouched(Object.fromEntries(allKeys.map(k => [k, true])));
    const e = getErrors(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true); setApiErr('');
    try {
      await onSave({
        ...form,
        phone:      String(form.phone).replace(/\D/g, ''),
        unitPrice:  parseFloat(form.unitPrice),
        totalAmount: parseFloat(totalAmount),
      });
    } catch (err) { setApiErr(err.message); setSaving(false); }
  };

  const Err = ({ k }) => {
    const msg = visErrors[k] || errors[k];
    return msg ? <p className="text-red-500 text-[11px] mt-1">{msg}</p> : null;
  };
  const Label = ({ children, req }) => (
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {children}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
  const hasErr = k => !!(visErrors[k] || errors[k]);
  const ic = k => `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${hasErr(k) ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`;
  const sc = k => `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors ${hasErr(k) ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`;
  const Sec = ({ t }) => <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3 pb-2 border-b border-gray-100">{t}</p>;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{initial ? 'Edit Order' : 'Create Order'}</h2>
            {initial && <p className="text-xs text-gray-400 mt-0.5">#{initial._id?.slice(-8).toUpperCase()}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {apiErr && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">{apiErr}</div>}

          {/* Customer */}
          <div>
            <Sec t="Customer Information" />
            <div className="grid grid-cols-2 gap-3">
              <div><Label req>First name</Label>
                <input value={form.firstName} onBlur={() => touch('firstName')} onChange={e => set('firstName', e.target.value)} className={ic('firstName')} placeholder="John"/>
                <Err k="firstName"/></div>
              <div><Label req>Last name</Label>
                <input value={form.lastName} onBlur={() => touch('lastName')} onChange={e => set('lastName', e.target.value)} className={ic('lastName')} placeholder="Smith"/>
                <Err k="lastName"/></div>
              <div><Label req>Email</Label>
                <input value={form.email} onBlur={() => touch('email')} onChange={e => set('email', e.target.value)} className={ic('email')} placeholder="john@company.com"/>
                <Err k="email"/></div>
              <div><Label req>Phone (10 digits)</Label>
                <input value={form.phone} onBlur={() => touch('phone')}
                  onChange={e => set('phone', e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  className={ic('phone')} placeholder="10-digit number" inputMode="numeric" maxLength={10}/>
                <Err k="phone"/></div>
              <div className="col-span-2"><Label req>Street address</Label>
                <input value={form.streetAddress} onBlur={() => touch('streetAddress')} onChange={e => set('streetAddress', e.target.value)} className={ic('streetAddress')} placeholder="123 Main Street"/>
                <Err k="streetAddress"/></div>
              <div><Label req>City</Label>
                <input value={form.city} onBlur={() => touch('city')} onChange={e => set('city', e.target.value)} className={ic('city')} placeholder="City"/>
                <Err k="city"/></div>
              <div><Label req>State</Label>
                <input value={form.state} onBlur={() => touch('state')} onChange={e => set('state', e.target.value)} className={ic('state')} placeholder="State"/>
                <Err k="state"/></div>
              <div><Label req>Postal code</Label>
                <input value={form.postalCode} onBlur={() => touch('postalCode')} onChange={e => set('postalCode', e.target.value)} className={ic('postalCode')} placeholder="12345"/>
                <Err k="postalCode"/></div>
              <div><Label req>Country</Label>
                <select value={form.country} onBlur={() => touch('country')} onChange={e => set('country', e.target.value)} className={sc('country')}>
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select><Err k="country"/></div>
            </div>
          </div>

          {/* Order */}
          <div>
            <Sec t="Order Information" />
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label req>Product</Label>
                <select value={form.product} onBlur={() => touch('product')} onChange={e => set('product', e.target.value)} className={sc('product')}>
                  {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select><Err k="product"/></div>
              <div><Label req>Quantity</Label>
                <input type="number" min="1" value={form.quantity} onBlur={() => touch('quantity')}
                  onChange={e => set('quantity', Math.max(1, parseInt(e.target.value) || 1))} className={ic('quantity')}/>
                <Err k="quantity"/></div>
              <div><Label req>Unit price ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="text" inputMode="decimal" value={form.unitPrice} placeholder="0.00"
                    onBlur={e => { touch('unitPrice'); const p = parseFloat(e.target.value); if (!isNaN(p)) set('unitPrice', p); }}
                    onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) set('unitPrice', v); }}
                    className={`${ic('unitPrice')} pl-7`}/>
                </div><Err k="unitPrice"/></div>
              <div className="col-span-2">
                <Label>Total amount</Label>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-gray-400 text-sm">$</span>
                  <span className="text-sm font-semibold text-gray-800 font-mono">{totalAmount}</span>
                  <span className="ml-auto text-xs text-gray-400">qty × unit price</span>
                </div>
              </div>
              <div><Label req>Status</Label>
                <select value={form.status} onChange={e => set('status', e.target.value)} className={sc('status')}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select></div>
              <div><Label req>Created by</Label>
                <select value={form.createdBy} onChange={e => set('createdBy', e.target.value)} className={sc('createdBy')}>
                  {CREATED_BY.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 font-medium">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-2">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
            {saving ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
