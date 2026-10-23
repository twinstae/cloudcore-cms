import { CreateTagInput } from "@cloudcore/schema";
import { SimpleForm } from "../form/simple-form";
import { SimpleInput, SimpleTextarea } from "../form/simple-field";
import { Button, HStack } from "../ui";

export type TagFormValues = { name: string; slug: string; description: string };

type TagFormProps = {
  defaultValues?: TagFormValues;
  submitLabel: string;
  onSubmit: (values: CreateTagInput) => void | Promise<void>;
  onCancel?: () => void;
};

const EMPTY: TagFormValues = { name: "", slug: "", description: "" };

export function TagForm({ defaultValues = EMPTY, submitLabel, onSubmit, onCancel }: TagFormProps) {
  return (
    <SimpleForm schema={CreateTagInput} defaultValues={defaultValues} onSubmit={onSubmit}>
      <SimpleInput name="name" label="이름" required />
      <SimpleInput name="slug" label="slug" hint="소문자, 숫자, 하이픈만 씁니다" required />
      <SimpleTextarea name="description" label="설명" />
      <HStack justify="end">
        {onCancel && (
          <Button tone="ghost" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button type="submit" tone="primary">
          {submitLabel}
        </Button>
      </HStack>
    </SimpleForm>
  );
}
