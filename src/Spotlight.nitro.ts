import type {
  HybridView,
  HybridViewProps,
  HybridViewMethods,
} from 'react-native-nitro-modules';

export interface Rect {
  x: number;

  y: number;

  width: number;

  height: number;
}

export interface SpotlightProps extends HybridViewProps {
  dimOpacity?: number;

  /** Border radius of the cutout hole. */

  borderRadius?: number;

  padding?: number;

  /** Width of the border around the cutout. Set to 0 to remove it. */

  borderWidth?: number;

  /** Color of the border around the cutout. */

  borderColor?: string;

  /** Whether backdrop taps should pass through to Pressables underneath. onBackdropPress still fires. */

  allowOverlayClick?: boolean;

  // Called after native measures the target — JS uses this to position tooltip

  onTargetLayout?: (rect: Rect) => void;

  /** Called when the dimmed backdrop outside the cutout is tapped. */

  onBackdropPress?: () => void;
}

export interface SpotlightMethods extends HybridViewMethods {
  highlight(x: number, y: number, width: number, height: number): void;

  highlightAnimated(
    x: number,

    y: number,

    width: number,

    height: number,

    durationMs: number
  ): void;

  clear(): void;

  /**

   * Reparents the RN Fabric UIView for `viewTag` into the secondary

   * `SpotlightWindow`'s tooltip host layer (above the dim overlay, above

   * the navigation header).

   *

   * x, y, width, height MUST be screen coordinates — typically obtained

   * from `measureInWindow` in JS.

   *

   * SAFETY: the source view's ancestor chain must NOT contain an

   * `RNSScreen` UIViewController, or reparenting across windows will

   * trigger `UIViewControllerHierarchyInconsistency`. This is guaranteed

   * when the slot view is rendered ABOVE `<NavigationContainer>` in the

   * React tree (see `SpotlightTooltipHost`).

   */

  showTooltip(
    viewTag: number,

    x: number,

    y: number,

    width: number,

    height: number
  ): void;

  /**

   * Removes the tooltip UIView from `SpotlightWindow`'s tooltip host layer.

   * Also called automatically by `clear()` so JS state stays in sync.

   */

  hideTooltip(): void;
}

export type SpotlightView = HybridView<SpotlightProps, SpotlightMethods>;
