import * as DialogPrimitive from "@radix-ui/react-dialog";
import { type AnyFormApi } from "@tanstack/react-form";
import { Store, useStore } from "@tanstack/react-store";
import * as React from "react";
import { Button } from "../button";
import { Dialog } from "../dialog";
import { FormDialogContext } from "./use-form-dialog-context";

const useFormDialogBlocker = (isDirty: boolean, disabled = false) => {
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [pendingClose, setPendingClose] = React.useState<(() => void) | null>(null);

  const handleClose = React.useCallback(
    (closeCallback: () => void) => {
      if (!disabled && isDirty) {
        setPendingClose(() => closeCallback);
        setShowConfirmDialog(true);
      } else {
        closeCallback();
      }
    },
    [isDirty, disabled],
  );

  const confirmClose = React.useCallback(() => {
    if (pendingClose !== null) {
      pendingClose();
    }
    setShowConfirmDialog(false);
    setPendingClose(null);
  }, [pendingClose]);

  const cancelClose = React.useCallback(() => {
    setShowConfirmDialog(false);
    setPendingClose(null);
  }, []);

  return {
    handleClose,
    showConfirmDialog,
    confirmClose,
    cancelClose,
  };
};

type FormDialogRootProps = {
  form?: AnyFormApi;
  disabled?: boolean;
  isDirty?: boolean;
} & React.ComponentProps<typeof DialogPrimitive.Root>;

const FormDialogRoot = ({
  disabled = false,
  form,
  isDirty: propIsDirty,
  onOpenChange,
  ...props
}: FormDialogRootProps) => {
  const [contextIsDirty, setContextIsDirty] = React.useState(false);
  const [registeredFormApi, setRegisteredFormApi] = React.useState<AnyFormApi | undefined>(
    undefined,
  );

  const activeForm = form ?? registeredFormApi;
  const placeholderStore = React.useMemo(() => new Store({ isDirty: false }), []);
  const formIsDirty = useStore(
    activeForm?.store ?? (placeholderStore as unknown as AnyFormApi["store"]),
    (state) => state.isDirty,
  );
  const isDirty = propIsDirty ?? (formIsDirty || contextIsDirty);
  const { cancelClose, confirmClose, handleClose, showConfirmDialog } = useFormDialogBlocker(
    isDirty,
    disabled,
  );

  const registerFormApi = React.useCallback((formApi: AnyFormApi) => {
    setRegisteredFormApi(formApi);
  }, []);

  const unregisterFormApi = React.useCallback(() => {
    setRegisteredFormApi(undefined);
  }, []);

  const contextValue = React.useMemo(
    () => ({
      setIsDirty: setContextIsDirty,
      registerFormApi,
      unregisterFormApi,
      ...(activeForm !== undefined && { formApi: activeForm }),
    }),
    [activeForm, registerFormApi, unregisterFormApi],
  );

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        handleClose(() => {
          onOpenChange?.(false);
          activeForm?.reset();
        });
      } else {
        onOpenChange?.(true);
      }
    },
    [activeForm, handleClose, onOpenChange],
  );

  return (
    <FormDialogContext.Provider value={contextValue}>
      <DialogPrimitive.Root data-slot="dialog" onOpenChange={handleOpenChange} {...props} />
      <DialogPrimitive.Root
        open={showConfirmDialog}
        onOpenChange={(open) => {
          if (!open) {
            cancelClose();
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 max-h-[calc(100vh-2rem)] overflow-y-auto max-w-[calc(100%-2rem)] sm:max-w-lg">
            <div className="flex flex-col gap-2 text-center sm:text-left">
              <DialogPrimitive.Title className="text-lg leading-none font-semibold">
                Unsaved Changes
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-muted-foreground">
                You have unsaved changes. Are you sure you want to close this dialog? Your changes
                will be lost.
              </DialogPrimitive.Description>
            </div>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={cancelClose}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmClose}>
                Discard Changes
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </FormDialogContext.Provider>
  );
};

const FormDialogTrigger = (props: React.ComponentProps<typeof Dialog.Trigger>) => {
  return <Dialog.Trigger {...props} />;
};

const FormDialogPortal = (props: React.ComponentProps<typeof Dialog.Portal>) => {
  return <Dialog.Portal {...props} />;
};

const FormDialogClose = (props: React.ComponentProps<typeof Dialog.Close>) => {
  return <Dialog.Close {...props} />;
};

const FormDialogOverlay = (props: React.ComponentProps<typeof Dialog.Overlay>) => {
  return <Dialog.Overlay {...props} />;
};

type FormDialogContentProps = React.ComponentProps<typeof Dialog.Content> & {
  overlayClassName?: string;
};

const FormDialogContent = ({ overlayClassName, ...props }: FormDialogContentProps) => {
  return (
    <FormDialogPortal>
      <FormDialogOverlay className={overlayClassName} />
      <Dialog.Content {...props} />
    </FormDialogPortal>
  );
};

const FormDialogHeader = (props: React.ComponentProps<typeof Dialog.Header>) => {
  return <Dialog.Header {...props} />;
};

const FormDialogFooter = (props: React.ComponentProps<typeof Dialog.Footer>) => {
  return <Dialog.Footer {...props} />;
};

const FormDialogTitle = (props: React.ComponentProps<typeof Dialog.Title>) => {
  return <Dialog.Title {...props} />;
};

const FormDialogDescription = (props: React.ComponentProps<typeof Dialog.Description>) => {
  return <Dialog.Description {...props} />;
};

const FormCancelButton = (
  props: Omit<React.ComponentProps<typeof Button>, "children" | "variant"> & {
    children?: React.ReactNode;
  },
) => {
  return (
    <FormDialogTrigger asChild>
      <Button variant="secondary" {...props}>
        {props.children ?? "Cancel"}
      </Button>
    </FormDialogTrigger>
  );
};

export const FormDialog = Object.assign(FormDialogRoot, {
  Trigger: FormDialogTrigger,
  Portal: FormDialogPortal,
  Close: FormDialogClose,
  Content: FormDialogContent,
  Header: FormDialogHeader,
  Footer: FormDialogFooter,
  Title: FormDialogTitle,
  Description: FormDialogDescription,
  CancelButton: FormCancelButton,
});
