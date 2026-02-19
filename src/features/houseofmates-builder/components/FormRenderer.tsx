import { useState } from 'react';
import { Star, Send, Loader2 } from 'lucide-react';
import { api } from '@/api/nocobase-client';
import { toast } from 'sonner';
import { getSubdomain } from '@/utils/subdomain-router';

// --- types ---
interface FormField {
    id: string;
    type: 'text' | 'textarea' | 'number' | 'email' | 'rating' | 'dropdown' | 'checkbox';
    label: string;
    placeholder?: string;
    required?: boolean;
    options?: string[]; // For dropdown
}

interface FormContent {
    formName: string;
    fields: FormField[];
    submitButtonText: string;
    successMessage: string;
}

interface FormElementData {
    id: string;
    type: 'form';
    content?: FormContent; // New structure
    // legacy support: properties might exist at top level
    formName?: string;
    fields?: FormField[];
    submitButtonText?: string;
    successMessage?: string;
    styles?: Record<string, any>;
}

// --- form renderer (user-facing) ---
interface formrendererprops {
    element: formelementdata;
    isadmin?: boolean;
}

export function FormRenderer({ element, isadmin }: formrendererprops) {
    const [formdata, setformdata] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const site_identifier = getSubdomain() || 'default';

    // helper to get data from content or top-level (legacy)
    const getContent = (): FormContent => {
        const c = element.content;
        return {
            formName: c?.formName || element.formName || 'Untitled Form',
            fields: c?.fields || element.fields || [],
            submitButtonText: c?.submitButtonText || element.submitButtonText || 'submit',
            successMessage: c?.successMessage || element.successMessage || 'submitted!',
        };
    };

    const content = getContent();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isAdmin) {
            toast.info('form submission disabled in admin mode');
            return;
        }
        setSubmitting(true);
        try {
            const ratingField = content.fields.find(f => f.type === 'rating');
            const ratingValue = ratingField ? rating : undefined;
            await api.createRecord('forms', {
                site: site_identifier,
                form_name: content.formName,
                data: JSON.stringify(formData),
                minecraft_username: formData.minecraft_username || formData.username || null,
                rating: ratingValue,
                message: formData.message || formData.feedback || formData.content || null,
                submitted_at: new Date().toISOString(),
            });
            setSubmitted(true);
            toast.success(content.successMessage);
        } catch (error: any) {
            console.error('Form submission failed:', error);
            toast.error('submission failed. please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldid]: value }));
    };


    if (submitted) {
        return (
            <div className="w-full h-full flex items-center justify-center p-6 bg-black/30 border border-white/10 rounded-2xl">
                <div className="text-center text-[var(--primary)]">
                    <div className="text-4xl mb-4">✨</div>
                    <p className="text-xl">{content.successMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col h-full w-full p-6 rounded-2xl bg-black/30 border border-white/10 overflow-hidden text-white items-center text-center"
            style={element.styles}
            onClick={(e) => e.stopPropagation()}
        >
            <h3 className="text-2xl font-bold text-[var(--primary)] mb-6 lowercase shrink-0 w-full">{content.formName}</h3>

            <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar w-full">
                <div className="space-y-4 flex flex-col items-center">
                    {content.fields.map((field) => (
                        <div key={field.id} className="flex flex-col gap-2 w-full max-w-md items-center">
                            <label className="text-white/70 text-sm lowercase w-full text-center">
                                {field.label}
                                {field.required && <span className="text-red-400 ml-1">*</span>}
                            </label>
                            {field.type === 'text' && (
                                <input
                                    type="text"
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    className="px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white placeholder-white/30 focus:border-[var(--primary)] focus:outline-none transition-colors w-full text-center"
                                    onChange={(e) => handleChange(field.id, e.target.value)}
                                />
                            )}
                            {field.type === 'number' && (
                                <input
                                    type="number"
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    className="px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white placeholder-white/30 focus:border-[var(--primary)] focus:outline-none transition-colors w-full text-center"
                                    onChange={(e) => handleChange(field.id, e.target.value)}
                                />
                            )}
                            {field.type === 'textarea' && (
                                <textarea
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    rows={4}
                                    className="px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white placeholder-white/30 focus:border-[var(--primary)] focus:outline-none transition-colors resize-none w-full text-center"
                                    onChange={(e) => handleChange(field.id, e.target.value)}
                                />
                            )}
                            {field.type === 'email' && (
                                <input
                                    type="email"
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    className="px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white placeholder-white/30 focus:border-[var(--primary)] focus:outline-none transition-colors w-full text-center"
                                    onChange={(e) => handleChange(field.id, e.target.value)}
                                />
                            )}
                            {field.type === 'dropdown' && field.options && (
                                <select
                                    required={field.required}
                                    className="px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white focus:border-[var(--primary)] focus:outline-none transition-colors w-full text-center text-center-last"
                                    onChange={(e) => handleChange(field.id, e.target.value)}
                                >
                                    <option value="">{field.placeholder || 'select...'}</option>
                                    {field.options.map((opt, i) => (
                                        <option key={i} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            )}
                            {field.type === 'checkbox' && (
                                <label className="flex items-center justify-center gap-3 cursor-pointer w-full">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded border-white/20 bg-black/50 text-[var(--primary)] focus:ring-[var(--primary)]"
                                        onChange={(e) => handleChange(field.id, e.target.checked)}
                                    />
                                    <span className="text-white/70">{field.placeholder}</span>
                                </label>
                            )}
                            {field.type === 'rating' && (
                                <div className="flex gap-1 items-center justify-center w-full">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            className="focus:outline-none"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                        >
                                            <Star
                                                size={24}
                                                className={`transition-colors ${(hoverRating || rating) >= star
                                                    ? 'fill-[var(--primary)] text-[var(--primary)]'
                                                    : 'text-white/30'
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full max-w-md py-4 px-6 rounded-xl selected-icon-btn font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 mb-2 text-white shrink-0"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                submitting...
                            </>
                        ) : (
                            <>
                                <Send size={20} />
                                {content.submitbuttontext}
                            </>
                        )}
                    </button>
                </div>
            </div>


        </form>
    );
}

// --- form builder (admin) ---
interface formbuilderprops {
    onsave: (elementupdates: partial<FormElementData>) => void;
    onCancel: () => void;
    initialdata?: partial<FormElementData>;
}

let __formId = 0;
const makeFormId = () => `field_${++__formId}`;

export function FormBuilder({ onsave, oncancel, initialdata }: formbuilderprops) {
    const defaultfields: formfield[] = [
        { id: 'minecraft_username', type: 'text', label: 'minecraft username', placeholder: 'your ign...', required: true },
        { id: 'rating', type: 'rating', label: 'how would you rate us?', required: true },
        { id: 'feedback', type: 'textarea', label: 'your feedback', placeholder: 'tell us what you think...', required: false },
    ];

    const data = initialdata?.content || initialdata; // handle nested vs flattened
    const [formname, setformname] = useState(data?.formname || 'feedback form');
    const [fields, setfields] = useState<FormField[]>(data?.fields || defaultFields);
    const [submitButtonText, setSubmitButtonText] = useState(data?.submitButtonText || 'submit');
    const [successMessage, setSuccessMessage] = useState(data?.successMessage || 'thank you for your feedback!');

    const addField = (type: FormField['type']) => {
        const newField: FormField = {
            id: makeFormId(),
            type,
            label: `new ${type} field`,
            placeholder: '',
            required: false,
        };
        if (type === 'dropdown') {
            newField.options = ['option 1', 'option 2', 'option 3'];
        }
        setFields([...fields, newField]);
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const removeField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
    };

    const handleSave = () => {
        // we save to 'content' property to match elementdata structure
        onsave({
            content: {
                formname,
                fields,
                submitbuttontext,
                successmessage,
            }
        });
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 builder-modal"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10">
                <h2 className="text-2xl font-bold text-[var(--primary)] mb-6">form builder</h2>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="text-white/70 text-sm">form name</label>
                        <input
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/20 text-white mt-1 focus:border-[var(--primary)] outline-none"
                        />
                    </div>

                    <div className="border-t border-white/10 pt-4">
                        <h3 className="text-white font-medium mb-3">fields</h3>
                        <div className="space-y-3">
                            {fields.map((field, idx) => (
                                <div key={field.id} className="p-3 bg-black/30 rounded-lg flex flex-col gap-2 border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white/50 text-sm w-6">{idx + 1}.</span>
                                        <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                                            className="flex-1 px-2 py-1 rounded bg-black/50 border border-white/10 text-white text-sm focus:border-[var(--primary)] outline-none"
                                        />
                                        <span className="text-white/30 text-xs px-2 py-1 rounded bg-white/5">{field.type}</span>
                                        <button
                                            onClick={() => removeField(field.id)}
                                            className="text-red-400 hover:text-red-300 text-sm"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 ml-6">
                                        <input
                                            type="text"
                                            value={field.placeholder || ''}
                                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                            placeholder="placeholder..."
                                            className="flex-1 px-2 py-1 rounded bg-black/50 border border-white/10 text-white/70 text-xs focus:border-[var(--primary)] outline-none"
                                        />
                                        <label className="flex items-center gap-1 text-white/50 text-xs cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                            />
                                            required
                                        </label>
                                    </div>
                                    {/* dropdown options editor */}
                                    {field.type === 'dropdown' && (
                                        <div className="ml-6 mt-2">
                                            <label className="text-white/60 text-xs mb-1 block">dropdown options</label>
                                            <ul className="space-y-1 mb-2">
                                                {(field.options || []).map((opt, optIdx) => (
                                                    <li key={optIdx} className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={e => {
                                                                const newOptions = [...(field.options || [])];
                                                                newOptions[optIdx] = e.target.value;
                                                                updateField(field.id, { options: newOptions });
                                                            }}
                                                            className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white/80 text-xs flex-1 focus:border-[var(--primary)] outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="text-red-400 hover:text-red-300 text-xs"
                                                            onClick={() => {
                                                                const newOptions = [...(field.options || [])];
                                                                newOptions.splice(optIdx, 1);
                                                                updateField(field.id, { options: newOptions });
                                                            }}
                                                        >
                                                            ✕
                                                        </button>
                                                        {/* drag handle for reordering (future: implement drag+drop) */}
                                                        {optIdx > 0 && (
                                                            <button
                                                                type="button"
                                                                className="text-white/40 hover:text-white/70 text-xs"
                                                                onClick={() => {
                                                                    const newOptions = [...(field.options || [])];
                                                                    [newOptions[optIdx - 1], newOptions[optIdx]] = [newOptions[optIdx], newOptions[optIdx - 1]];
                                                                    updateField(field.id, { options: newOptions });
                                                                }}
                                                            >↑</button>
                                                        )}
                                                        {optidx < (field.options?.length || 0) - 1 && (
                                                            <button
                                                                type="button"
                                                                className="text-white/40 hover:text-white/70 text-xs"
                                                                onClick={() => {
                                                                    const newOptions = [...(field.options || [])];
                                                                    [newOptions[optIdx + 1], newOptions[optIdx]] = [newOptions[optIdx], newOptions[optIdx + 1]];
                                                                    updateField(field.id, { options: newOptions });
                                                                }}
                                                            >↓</button>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                            <button
                                                type="button"
                                                className="px-2 py-1 rounded bg-white/10 text-white/70 text-xs hover:bg-white/20"
                                                onClick={() => {
                                                    const newOptions = [...(field.options || []), `option ${((field.options || []).length + 1)}`];
                                                    updateField(field.id, { options: newOptions });
                                                }}
                                            >+ add option</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 mt-3 flex-wrap">
                            {(['text', 'textarea', 'email', 'number', 'rating', 'dropdown', 'checkbox'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => addField(type)}
                                    className="px-3 py-1 rounded-lg bg-white/5 text-white/70 text-sm hover:bg-white/10 transition-colors"
                                >
                                    + {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-white/70 text-sm">submit button text</label>
                            <input
                                type="text"
                                value={submitButtonText}
                                onChange={(e) => setSubmitButtonText(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/20 text-white mt-1 focus:border-[var(--primary)] outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-white/70 text-sm">success message</label>
                            <input
                                type="text"
                                value={successMessage}
                                onChange={(e) => setSuccessMessage(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/20 text-white mt-1 focus:border-[var(--primary)] outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10"
                    >
                        cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 rounded-lg bg-[var(--primary)] text-white font-bold hover:scale-[1.02] transition-transform"
                    >
                        add form
                    </button>
                </div>
            </div>
        </div>
    );
}

// export types
export type { FormField, FormElementData };