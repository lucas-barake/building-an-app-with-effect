import React from "react";
import { MountableDialog } from "./mountable-dialog";

/**
 * A Higher-Order Component (HOC) that controls the mounting and unmounting of a dialog component.
 * It ensures that the dialog remains in the DOM during its closing animation and is fully
 * unmounted afterward. This is essential for preserving animations and resetting the dialog's
 * state when it's reopened.
 *
 * This HOC is designed to be used with dialog components that have an `open` prop to control visibility.
 *
 * @template P The props of the component to wrap. Must include an `open: boolean` prop.
 * @param {React.ComponentType<P>} Component The dialog component to wrap.
 * @returns A new component with controlled mounting and unmounting.
 */
export const withMountableDialog = <P extends { open: boolean }>(
  Component: React.ComponentType<P>,
) => {
  const WithMountable = (props: P) => {
    return (
      <MountableDialog open={props.open}>
        <Component {...props} />
      </MountableDialog>
    );
  };
  WithMountable.displayName = `withMountable(${Component.displayName ?? Component.name})`;
  return WithMountable;
};
