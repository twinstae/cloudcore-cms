import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  FieldErrorText,
  FieldHelperText,
  FieldLabel,
  FieldRoot,
  Input,
  Textarea,
  type InputProps,
  type TextareaProps,
} from "../ui";

type FieldProps = { name: string; label: string; hint?: string; required?: boolean };

export function SimpleInput({
  name,
  label,
  hint,
  required,
  ...props
}: FieldProps & Omit<InputProps, "name">) {
  const { control } = useFormContext();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const message = fieldState.error?.root?.message ?? fieldState.error?.message;
        return (
          <FieldRoot invalid={!!message}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Input
              {...props}
              id={id}
              name={name}
              required={required}
              aria-required={required}
              value={field.value ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={!!message}
              aria-describedby={message ? errorId : hint ? hintId : undefined}
            />
            {hint && !message && <FieldHelperText id={hintId}>{hint}</FieldHelperText>}
            {message && (
              <FieldErrorText id={errorId} role="alert" aria-label={message}>
                {message}
              </FieldErrorText>
            )}
          </FieldRoot>
        );
      }}
    />
  );
}

export function SimpleTextarea({
  name,
  label,
  hint,
  required,
  ...props
}: FieldProps & Omit<TextareaProps, "name">) {
  const { control } = useFormContext();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const message = fieldState.error?.root?.message ?? fieldState.error?.message;
        return (
          <FieldRoot invalid={!!message}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Textarea
              {...props}
              id={id}
              name={name}
              required={required}
              aria-required={required}
              value={field.value ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={!!message}
              aria-describedby={message ? errorId : hint ? hintId : undefined}
            />
            {hint && !message && <FieldHelperText id={hintId}>{hint}</FieldHelperText>}
            {message && (
              <FieldErrorText id={errorId} role="alert" aria-label={message}>
                {message}
              </FieldErrorText>
            )}
          </FieldRoot>
        );
      }}
    />
  );
}
