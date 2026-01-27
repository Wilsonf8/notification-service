/**
 * LiveConnect Widget - ContactForm Component.
 * Offline contact form for visitors to leave their information when reps are unavailable.
 */

import { h } from 'preact';
import { useState } from 'preact/hooks';

/**
 * Data structure for the contact form submission.
 */
export interface ContactFormData {
  /** Visitor's name (required, max 100 chars) */
  name: string;
  /** Visitor's email address (required, valid email, max 255 chars) */
  email: string;
  /** Visitor's phone number (optional, max 20 chars) */
  phone: string;
  /** Visitor's message (required, max 2000 chars) */
  message: string;
}

/**
 * Props for the ContactForm component.
 */
export interface ContactFormProps {
  /** Callback fired when form is submitted with valid data */
  onSubmit: (data: ContactFormData) => Promise<void>;
  /** Callback fired when user cancels/closes the form */
  onCancel: () => void;
}

/**
 * Form validation errors map.
 */
type FormErrors = Partial<Record<keyof ContactFormData, string>>;

// ============================================================================
// Validation Constants
// ============================================================================

/** Maximum length for name field */
const MAX_NAME_LENGTH = 100;
/** Maximum length for email field */
const MAX_EMAIL_LENGTH = 255;
/** Maximum length for phone field */
const MAX_PHONE_LENGTH = 20;
/** Maximum length for message field */
const MAX_MESSAGE_LENGTH = 2000;

/** Email validation regex pattern */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// SVG Icons (Tabler Icons)
// ============================================================================

/**
 * Checkmark circle icon for success state.
 * @returns SVG element
 */
function CheckCircleIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-form__success-icon"
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M9 12l2 2l4 -4" />
    </svg>
  );
}

/**
 * Alert circle icon for error indication.
 * @returns SVG element
 */
function AlertCircleIcon(): h.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M12 8l0 4" />
      <path d="M12 16l.01 0" />
    </svg>
  );
}

// ============================================================================
// ContactForm Component
// ============================================================================

/**
 * ContactForm component for the LiveConnect widget.
 * Displays a form for visitors to leave their contact information when
 * representatives are offline.
 *
 * Features:
 * - Name, email, phone (optional), and message fields
 * - Client-side validation with error messages
 * - Loading state during submission
 * - Success state after submission
 * - Accessible form with proper labels and ARIA attributes
 *
 * @param props - Component props
 * @returns ContactForm element
 *
 * @example
 * ```tsx
 * <ContactForm
 *   onSubmit={async (data) => {
 *     await api.submitContactForm(data);
 *   }}
 *   onCancel={() => setShowForm(false)}
 * />
 * ```
 */
export function ContactForm({
  onSubmit,
  onCancel,
}: ContactFormProps): h.JSX.Element {
  // Form data state
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  // Validation errors state
  const [errors, setErrors] = useState<FormErrors>({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Success state after submission
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // General form error (e.g., network error)
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Validates the form data and returns validation errors.
   * @returns True if validation passes, false otherwise
   */
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      newErrors.name = 'Name is required';
    } else if (trimmedName.length > MAX_NAME_LENGTH) {
      newErrors.name = `Name must be ${MAX_NAME_LENGTH} characters or less`;
    }

    // Email validation
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
      newErrors.email = `Email must be ${MAX_EMAIL_LENGTH} characters or less`;
    }

    // Phone validation (optional, but check length if provided)
    const trimmedPhone = formData.phone.trim();
    if (trimmedPhone && trimmedPhone.length > MAX_PHONE_LENGTH) {
      newErrors.phone = `Phone must be ${MAX_PHONE_LENGTH} characters or less`;
    }

    // Message validation
    const trimmedMessage = formData.message.trim();
    if (!trimmedMessage) {
      newErrors.message = 'Message is required';
    } else if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      newErrors.message = `Message must be ${MAX_MESSAGE_LENGTH} characters or less`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles form submission.
   * @param event - Form submit event
   */
  const handleSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();

    // Clear previous submit error
    setSubmitError(null);

    // Validate form
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Trim all values before submission
      const trimmedData: ContactFormData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        message: formData.message.trim(),
      };

      await onSubmit(trimmedData);
      setIsSuccess(true);
    } catch (err) {
      setSubmitError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles input field changes.
   * @param field - The field name to update
   * @returns Input event handler
   */
  const handleInputChange = (field: keyof ContactFormData) => (event: Event): void => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    setFormData((prev) => ({
      ...prev,
      [field]: target.value,
    }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Handles cancel button click.
   * @param event - Mouse event
   */
  const handleCancel = (event: MouseEvent): void => {
    event.preventDefault();
    onCancel();
  };

  /**
   * Handles cancel button keyboard events for accessibility.
   * @param event - Keyboard event
   */
  const handleCancelKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onCancel();
    }
  };

  /**
   * Handles "Done" button click after success.
   * @param event - Mouse event
   */
  const handleDone = (event: MouseEvent): void => {
    event.preventDefault();
    onCancel();
  };

  // ============================================================================
  // Success State Render
  // ============================================================================

  if (isSuccess) {
    return (
      <div class="lc-form__success" role="status" aria-live="polite">
        <CheckCircleIcon />
        <h3 class="lc-form__success-title">Message Sent!</h3>
        <p class="lc-form__success-message">
          Thank you for reaching out. We'll get back to you as soon as possible.
        </p>
        <button
          type="button"
          class="lc-btn lc-btn--primary lc-mt-lg"
          onClick={handleDone}
        >
          Done
        </button>
      </div>
    );
  }

  // ============================================================================
  // Form Render
  // ============================================================================

  return (
    <form
      class="lc-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Contact form"
    >
      {/* Form header */}
      <div class="lc-form__header">
        <h3 class="lc-form__title">Leave Your Info</h3>
        <p class="lc-form__description">
          We're currently offline. Leave your information and we'll get back to you.
        </p>
      </div>

      {/* Name field */}
      <div class="lc-form__group">
        <label
          for="lc-contact-name"
          class="lc-form__label lc-form__label--required"
        >
          Name
        </label>
        <input
          id="lc-contact-name"
          type="text"
          class={`lc-form__input ${errors.name ? 'lc-form__input--error' : ''}`}
          placeholder="Your name"
          value={formData.name}
          onInput={handleInputChange('name')}
          disabled={isSubmitting}
          maxLength={MAX_NAME_LENGTH}
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'lc-contact-name-error' : undefined}
        />
        {errors.name && (
          <div id="lc-contact-name-error" class="lc-form__error" role="alert">
            <AlertCircleIcon />
            <span>{errors.name}</span>
          </div>
        )}
      </div>

      {/* Email field */}
      <div class="lc-form__group">
        <label
          for="lc-contact-email"
          class="lc-form__label lc-form__label--required"
        >
          Email
        </label>
        <input
          id="lc-contact-email"
          type="email"
          class={`lc-form__input ${errors.email ? 'lc-form__input--error' : ''}`}
          placeholder="your@email.com"
          value={formData.email}
          onInput={handleInputChange('email')}
          disabled={isSubmitting}
          maxLength={MAX_EMAIL_LENGTH}
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'lc-contact-email-error' : undefined}
        />
        {errors.email && (
          <div id="lc-contact-email-error" class="lc-form__error" role="alert">
            <AlertCircleIcon />
            <span>{errors.email}</span>
          </div>
        )}
      </div>

      {/* Phone field (optional) */}
      <div class="lc-form__group">
        <label for="lc-contact-phone" class="lc-form__label">
          Phone <span class="lc-text--muted">(optional)</span>
        </label>
        <input
          id="lc-contact-phone"
          type="tel"
          class={`lc-form__input ${errors.phone ? 'lc-form__input--error' : ''}`}
          placeholder="Your phone number"
          value={formData.phone}
          onInput={handleInputChange('phone')}
          disabled={isSubmitting}
          maxLength={MAX_PHONE_LENGTH}
          aria-invalid={errors.phone ? 'true' : 'false'}
          aria-describedby={errors.phone ? 'lc-contact-phone-error' : undefined}
        />
        {errors.phone && (
          <div id="lc-contact-phone-error" class="lc-form__error" role="alert">
            <AlertCircleIcon />
            <span>{errors.phone}</span>
          </div>
        )}
      </div>

      {/* Message field */}
      <div class="lc-form__group">
        <label
          for="lc-contact-message"
          class="lc-form__label lc-form__label--required"
        >
          Message
        </label>
        <textarea
          id="lc-contact-message"
          class={`lc-form__textarea ${errors.message ? 'lc-form__textarea--error' : ''}`}
          placeholder="How can we help you?"
          value={formData.message}
          onInput={handleInputChange('message')}
          disabled={isSubmitting}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={4}
          aria-invalid={errors.message ? 'true' : 'false'}
          aria-describedby={errors.message ? 'lc-contact-message-error' : undefined}
        />
        {errors.message && (
          <div id="lc-contact-message-error" class="lc-form__error" role="alert">
            <AlertCircleIcon />
            <span>{errors.message}</span>
          </div>
        )}
      </div>

      {/* Submit error message */}
      {submitError && (
        <div class="lc-form__error" role="alert">
          <AlertCircleIcon />
          <span>{submitError}</span>
        </div>
      )}

      {/* Form actions */}
      <div class="lc-flex lc-flex--gap-md lc-mt-md">
        <button
          type="button"
          class="lc-btn lc-btn--secondary"
          onClick={handleCancel}
          onKeyDown={handleCancelKeyDown}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="lc-btn lc-btn--primary"
          disabled={isSubmitting}
          style={{ flex: 1 }}
        >
          {isSubmitting ? (
            <>
              <span class="lc-spinner lc-spinner--sm" aria-hidden="true" />
              Sending...
            </>
          ) : (
            'Send Message'
          )}
        </button>
      </div>

      {/* Screen reader announcement for submitting state */}
      {isSubmitting && (
        <span class="lc-sr-only" role="status" aria-live="polite">
          Sending your message...
        </span>
      )}
    </form>
  );
}

export default ContactForm;