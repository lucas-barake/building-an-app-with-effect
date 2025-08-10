import { Button, Separator } from "@/components/ui";
import { FieldInput, FieldTextarea } from "@/components/ui/form";
import { deleteStyleRx, stylesRx, upsertStyleRx } from "@/data-access/styles-rx";
import { makeFormOptions } from "@/lib/forms/make-form-options";
import { useRxPromise, useRxSetPromiseUnwrapped } from "@/rx/rx-utils";
import { Result, useRxValue } from "@effect-rx/rx-react";
import { UpsertStylePayload, type Style } from "@org/domain/styles-rpc";
import { useForm } from "@tanstack/react-form";
import { Schema } from "effect";
import { constant } from "effect/Function";
import { TrashIcon } from "lucide-react";
import React from "react";

const UpsertStyle: React.FC = () => {
  const upsert = useRxSetPromiseUnwrapped(upsertStyleRx);

  const form = useForm({
    ...makeFormOptions({
      defaultValues: {
        name: "",
        rule: "",
      },
      schema: UpsertStylePayload,
      validator: "onSubmit",
    }),
    onSubmit: async ({ value }) => {
      const decoded = Schema.decodeSync(UpsertStylePayload)(value);
      await upsert(decoded);
      form.reset();
    },
  });

  return (
    <section className="bg-card p-6 rounded-lg border border-border shadow-sm">
      <h2 className="text-lg font-semibold text-foreground mb-4">Add New Style</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit(event);
        }}
        className="space-y-4"
      >
        <form.Field name="name">
          {(fieldApi) => (
            <FieldInput
              name={fieldApi.name}
              label="Name"
              value={fieldApi.state.value}
              onChange={(event) => {
                fieldApi.handleChange(event.currentTarget.value);
              }}
            />
          )}
        </form.Field>

        <form.Field name="rule">
          {(fieldApi) => (
            <FieldTextarea
              name={fieldApi.name}
              label="Rule"
              value={fieldApi.state.value}
              onChange={(event) => {
                fieldApi.handleChange(event.currentTarget.value);
              }}
              rows={5}
            />
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" loading={isSubmitting} className="w-full">
              {isSubmitting ? "Submitting..." : "Save Changes"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </section>
  );
};

const StyleItem: React.FC<{ style: Style }> = ({ style }) => {
  const [delState, del] = useRxPromise(deleteStyleRx);

  const handleDelete = () => del(style.id);

  return (
    <article className="bg-card p-4 rounded-lg border border-border hover:bg-background-secondary transition-colors">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">{style.name}</h3>
          <Button variant="ghost" size="icon" onClick={handleDelete} loading={delState.waiting}>
            <TrashIcon className="size-4" />
            <span className="sr-only">Delete {style.name}</span>
          </Button>
        </div>
        <pre className="bg-background-secondary p-3 rounded-md border border-border font-mono text-sm text-muted-foreground">
          {style.rule}
        </pre>
      </header>
    </article>
  );
};

const SuccessView: React.FC<{ styles: ReadonlyArray<Style> }> = ({ styles }) => {
  return (
    <main className="flex flex-col gap-2">
      <UpsertStyle />

      <Separator />

      <section className="flex flex-col gap-2">
        {styles.map((style) => (
          <StyleItem key={style.id} style={style} />
        ))}
      </section>
    </main>
  );
};

export const RootPage: React.FC = () => {
  const stylesResult = useRxValue(stylesRx);
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {Result.builder(stylesResult)
        .onFailure(constant("Something went wrong..."))
        .onSuccess((styles) => <SuccessView styles={styles} />)
        .onWaiting((result) => Result.isInitial(result) && result.waiting && <p>Loading...</p>)
        .orNull()}
    </div>
  );
};
