import { useEffect, useMemo, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { categories, paymentMethods } from '../utils/constants';

const initialState = {
  type: 'expense',
  title: '',
  amount: '',
  category: 'Food',
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: 'UPI',
  notes: '',
};

export default function AddTransactionModal({
  open,
  onClose,
  onSubmit,
  defaultType = 'expense',
  initialValues,
}) {
  const startingValues = useMemo(
    () => ({
      ...initialState,
      type: defaultType,
      ...initialValues,
      date: initialValues?.date ? new Date(initialValues.date).toISOString().slice(0, 10) : initialState.date,
      amount: initialValues?.amount ? String(initialValues.amount) : '',
    }),
    [defaultType, initialValues],
  );
  const [form, setForm] = useState(startingValues);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(startingValues);
    }
  }, [open, startingValues]);

  if (!open) {
    return null;
  }

  const handleChange = (field, value) => {
    setForm((current) => {
      if (field === 'type') {
        return {
          ...current,
          type: value,
          category: value === 'income' ? 'Income' : current.category === 'Income' ? categories[0] : current.category,
        };
      }

      return { ...current, [field]: value };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        ...form,
        amount: Number(form.amount),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[30px] bg-white p-6 shadow-[0_38px_80px_rgba(15,23,42,0.2)]">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold text-ink">
              {initialValues ? 'Update Transaction' : `Add ${form.type === 'income' ? 'Income' : 'Expense'}`}
            </h3>
            <p className="text-sm text-muted">Capture the amount, category, date, and notes for this entry.</p>
          </div>
          <button className="rounded-2xl bg-panel p-2 text-slate-500 hover:text-ink" onClick={onClose}>
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Type">
              <select className="input-field" value={form.type} onChange={(event) => handleChange('type', event.target.value)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </Field>
            <Field label="Title">
              <input className="input-field" value={form.title} onChange={(event) => handleChange('title', event.target.value)} required />
            </Field>
            <Field label="Amount">
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => handleChange('amount', event.target.value)}
                required
              />
            </Field>
            {form.type === 'expense' ? (
              <Field label="Category">
                <select className="input-field" value={form.category} onChange={(event) => handleChange('category', event.target.value)}>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Category">
                <input className="input-field" value="Income" disabled readOnly />
              </Field>
            )}
            <Field label="Date">
              <input className="input-field" type="date" value={form.date} onChange={(event) => handleChange('date', event.target.value)} required />
            </Field>
            <Field label="Payment Method">
              <select className="input-field" value={form.paymentMethod} onChange={(event) => handleChange('paymentMethod', event.target.value)}>
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              className="input-field min-h-[120px] resize-none pt-3"
              value={form.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
              placeholder="Add any useful context or receipt notes here."
            />
          </Field>

          <div className="flex justify-end gap-3">
            <button type="button" className="ghost-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? 'Saving...' : initialValues ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}
