import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ReactNode } from "react";
import { FormProvider, type FieldValues, useForm } from "react-hook-form";
import { Form } from "../ui";

type SimpleFormProps<Output> = {
  schema: StandardSchemaV1<FieldValues, Output>;
  defaultValues: FieldValues;
  onSubmit: (values: Output) => void | Promise<void>;
  children: ReactNode;
  reValidateMode?: "onBlur" | "onSubmit";
  "aria-label"?: string;
};

/** 폼 상태는 react-hook-form이 들고, 필드는 컨텍스트로 붙는다(value/onChange props 없음). */
export function SimpleForm<Output>({
  schema,
  defaultValues,
  onSubmit,
  children,
  reValidateMode,
  ...props
}: SimpleFormProps<Output>) {
  const methods = useForm({
    defaultValues,
    resolver: standardSchemaResolver(schema),
    reValidateMode: reValidateMode ?? "onSubmit",
  });

  // 제출이 끝나면 defaultValues로 되돌린다. 생성 폼이 이전 입력을 들고 있지 않게 한다.
  const submit = methods.handleSubmit(async (values) => {
    await onSubmit(values);
    methods.reset();
  });

  return (
    <FormProvider {...methods}>
      <Form onSubmit={submit} noValidate {...props}>
        {children}
      </Form>
    </FormProvider>
  );
}
