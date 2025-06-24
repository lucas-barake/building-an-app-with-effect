/**
 * A utility type for components that handle both create and edit modes.
 *
 * @template T - Object defining props for each mode
 * @template T.common - Common props shared between both modes
 * @template T.create - Props specific to create mode (can be undefined if no extra props needed)
 * @template T.update - Props specific to edit mode (required)
 *
 * @example
 * ```typescript
 * type MyComponentProps = UpsertProps<{
 *   common: { open: boolean; onOpenChange: (open: boolean) => void };
 *   create: undefined;
 *   update: { item: { id: string; name: string } };
 * }>;
 *
 * // Usage for create mode - only common props needed
 * <MyComponent open={true} onOpenChange={() => {}} mode="create" />
 *
 * // Usage for edit mode - requires update props
 * <MyComponent open={true} onOpenChange={() => {}} mode="edit" item={{ id: "1", name: "test" }} />
 * ```
 */
export type UpsertProps<T extends { common: any; create?: any; update: any }> = T["common"] &
  (
    | ({ mode: "create" } & (T["create"] extends undefined ? unknown : T["create"]))
    | ({ mode: "edit" } & T["update"])
  );

/**
 * A utility type for dialog components that handle both create and edit modes.
 * Automatically includes common dialog props (open and onOpenChange).
 *
 * @template T - Object defining props for each mode
 * @template T.common - Additional common props beyond the default dialog props
 * @template T.create - Props specific to create mode (can be undefined if no extra props needed)
 * @template T.update - Props specific to edit mode (required)
 *
 * @example
 * ```typescript
 * type MyDialogProps = UpsertDialogProps<{
 *   common: { title: string };
 *   create: undefined;
 *   update: { item: { id: string; name: string } };
 * }>;
 *
 * // Usage for create mode
 * <MyDialog open={true} onOpenChange={() => {}} title="Create Item" mode="create" />
 *
 * // Usage for edit mode
 * <MyDialog open={true} onOpenChange={() => {}} title="Edit Item" mode="edit" item={{ id: "1", name: "test" }} />
 * ```
 */
export type UpsertDialogProps<T extends { common?: any; create?: any; update: any }> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & (T["common"] extends undefined ? unknown : T["common"]) &
  (
    | ({ mode: "create" } & (T["create"] extends undefined ? unknown : T["create"]))
    | ({ mode: "edit" } & T["update"])
  );
