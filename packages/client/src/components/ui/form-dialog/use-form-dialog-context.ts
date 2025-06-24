import { type AnyFormApi } from "@tanstack/react-form";
import React from "react";

type FormDialogContextValue = {
  setIsDirty: (isDirty: boolean) => void;
  formApi?: AnyFormApi;
  registerFormApi: (formApi: AnyFormApi) => void;
  unregisterFormApi: () => void;
};

export const FormDialogContext = React.createContext<FormDialogContextValue | null>(null);

const useFormDialogContext = () => {
  const context = React.useContext(FormDialogContext);
  if (context === null) {
    throw new Error("Form dialog hook must be used within a FormDialog");
  }
  return context;
};

export const useRegisterFormApi = (formApi: AnyFormApi) => {
  const context = useFormDialogContext();

  React.useEffect(() => {
    context.registerFormApi(formApi);
    return () => {
      context.unregisterFormApi();
    };
  }, [context, formApi]);
};

export const useSetFormDialogDirty = () => {
  const context = useFormDialogContext();
  return context.setIsDirty;
};

export const useFormDialogFormApi = () => {
  const context = useFormDialogContext();
  return context.formApi;
};
