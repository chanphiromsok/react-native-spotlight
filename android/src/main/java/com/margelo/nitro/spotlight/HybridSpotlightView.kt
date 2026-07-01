package com.margelo.nitro.spotlight

import android.graphics.Color
import android.graphics.Rect
import android.graphics.RectF
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.annotation.Keep
import com.facebook.common.internal.DoNotStrip
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.ThemedReactContext
import com.margelo.nitro.views.RecyclableView

@DoNotStrip
@Keep
class HybridSpotlightView(
  private val context: ThemedReactContext,
) : HybridSpotlightViewSpec(), RecyclableView {

  // -------------------------------------------------------------------------
  // Views
  // -------------------------------------------------------------------------

  /**
   * The dim + cutout overlay. Returned as the Fabric/Nitro view so React
   * Native sizes it (via StyleSheet.absoluteFillObject in the JS wrapper) and
   * JS siblings (SpotlightTooltip) render above it in Android z-order —
   * matching the iOS architecture exactly.
   */
  private val spotlightView = SpotlightOverlayView(context)

  /**
   * Covers the area above the React tree (status bar + native navigation
   * header) so the dim feels full-screen. Added to the decor-view only while
   * a spotlight is active; removed on clear(). The screen-body overlay with
   * the hole stays in the React tree so tooltips can render above it.
   */
  private val headerDimView = View(context)
  private var headerDimAdded = false
  private var headerDimRetryPosted = false
  private var decorView: ViewGroup? = null

  init {
    // Clean up headerDimView when the spotlight overlay detaches from its
    // window (unmount without recycle). prepareForRecycle() handles the pool
    // case; this listener covers destruction / direct unmount.
    spotlightView.addOnAttachStateChangeListener(object : View.OnAttachStateChangeListener {
      override fun onViewAttachedToWindow(v: View) {}
      override fun onViewDetachedFromWindow(v: View) {
        hideHeaderDim()
      }
    })
  }

  // -------------------------------------------------------------------------
  // Property backing fields
  // -------------------------------------------------------------------------

  private var dimOpacityValue: Double? = null
  private var shapeValue: String? = null
  private var borderRadiusValue: Double? = null
  private var paddingValue: Double? = null
  private var borderWidthValue: Double? = null
  private var borderColorValue: String? = null
  private var allowOverlayClickValue: Boolean? = null

  // -------------------------------------------------------------------------
  // Nitro / Fabric entry-point
  // -------------------------------------------------------------------------

  override val view: View get() = spotlightView

  // -------------------------------------------------------------------------
  // Properties
  // -------------------------------------------------------------------------

  override var dimOpacity: Double?
    get() = dimOpacityValue
    set(value) {
      if (dimOpacityValue == value) return
      dimOpacityValue = value
      UiThreadUtil.runOnUiThread {
        spotlightView.dimOpacity = (value ?: DEFAULT_DIM_OPACITY).toFloat()
        if (headerDimAdded) {
          headerDimView.setBackgroundColor(dimArgb(value ?: DEFAULT_DIM_OPACITY))
        }
      }
    }

  override var shape: String?
    get() = shapeValue
    set(value) {
      if (shapeValue == value) return
      shapeValue = value
      UiThreadUtil.runOnUiThread { spotlightView.shape = value ?: DEFAULT_SHAPE }
    }

  override var borderRadius: Double?
    get() = borderRadiusValue
    set(value) {
      if (borderRadiusValue == value) return
      borderRadiusValue = value
      UiThreadUtil.runOnUiThread { spotlightView.borderRadius = (value ?: DEFAULT_BORDER_RADIUS).toFloat() }
    }

  override var padding: Double?
    get() = paddingValue
    set(value) {
      if (paddingValue == value) return
      paddingValue = value
      UiThreadUtil.runOnUiThread { spotlightView.padding = (value ?: DEFAULT_PADDING).toFloat() }
    }

  override var borderWidth: Double?
    get() = borderWidthValue
    set(value) {
      if (borderWidthValue == value) return
      borderWidthValue = value
      UiThreadUtil.runOnUiThread { spotlightView.borderWidth = (value ?: DEFAULT_BORDER_WIDTH).toFloat() }
    }

  override var borderColor: String?
    get() = borderColorValue
    set(value) {
      if (borderColorValue == value) return
      borderColorValue = value
      UiThreadUtil.runOnUiThread { spotlightView.borderColor = value ?: DEFAULT_BORDER_COLOR }
    }

  override var allowOverlayClick: Boolean?
    get() = allowOverlayClickValue
    set(value) {
      if (allowOverlayClickValue == value) return
      allowOverlayClickValue = value
      UiThreadUtil.runOnUiThread { spotlightView.allowOverlayClick = value ?: DEFAULT_ALLOW_OVERLAY_CLICK }
    }

  override var onTargetLayout: ((com.margelo.nitro.spotlight.Rect) -> Unit)? = null

  override var onBackdropPress: (() -> Unit)? = null
    set(value) {
      field = value
      UiThreadUtil.runOnUiThread {
        spotlightView.onBackdropPress = value
        syncHeaderDimClickHandler()
      }
    }

  // -------------------------------------------------------------------------
  // Commands
  // -------------------------------------------------------------------------

  override fun highlight(
    x: Double,
    y: Double,
    width: Double,
    height: Double,
  ) {
    UiThreadUtil.runOnUiThread {
      spotlightView.setHighlight(
        xDp      = x.toFloat(),
        yDp      = y.toFloat(),
        widthDp  = width.toFloat(),
        heightDp = height.toFloat(),
        animated = false,
      )
      onTargetLayout?.invoke(localDipRect(x, y, width, height))
      showHeaderDim()
    }
  }

  override fun highlightAnimated(
    x: Double,
    y: Double,
    width: Double,
    height: Double,
    durationMs: Double,
  ) {
    UiThreadUtil.runOnUiThread {
      spotlightView.setHighlight(
        xDp        = x.toFloat(),
        yDp        = y.toFloat(),
        widthDp    = width.toFloat(),
        heightDp   = height.toFloat(),
        animated   = true,
        durationMs = durationMs.toLong(),
      )
      onTargetLayout?.invoke(localDipRect(x, y, width, height))
      showHeaderDim()
    }
  }

  override fun clear() {
    UiThreadUtil.runOnUiThread {
      spotlightView.clear(durationMs = 0L)
      hideHeaderDim()
    }
  }

  // -------------------------------------------------------------------------
  // RecyclableView
  // -------------------------------------------------------------------------

  override fun prepareForRecycle() {
    onTargetLayout = null
    onBackdropPress = null
    dimOpacityValue = null
    shapeValue = null
    borderRadiusValue = null
    paddingValue = null
    borderWidthValue = null
    borderColorValue = null
    allowOverlayClickValue = null
    UiThreadUtil.runOnUiThread {
      spotlightView.dimOpacity = DEFAULT_DIM_OPACITY.toFloat()
      spotlightView.shape = DEFAULT_SHAPE
      spotlightView.borderRadius = DEFAULT_BORDER_RADIUS.toFloat()
      spotlightView.padding = DEFAULT_PADDING.toFloat()
      spotlightView.borderWidth = DEFAULT_BORDER_WIDTH.toFloat()
      spotlightView.borderColor = DEFAULT_BORDER_COLOR
      spotlightView.allowOverlayClick = DEFAULT_ALLOW_OVERLAY_CLICK
      spotlightView.onBackdropPress = null
      spotlightView.clear(durationMs = 0L)
      hideHeaderDim()
      decorView = null
    }
  }

  // -------------------------------------------------------------------------
  // Coordinate helpers
  // -------------------------------------------------------------------------

  /**
   * Convert a measureInWindow rect (DIP relative to visibleWindowFrame) into
   * a Rect expressed in the SpotlightOverlayView's local DIP coordinates.
   *
   * On non-edge-to-edge devices the values are identical. On edge-to-edge
   * (mandatory on Android 15+) the overlay sits at physical y=0 while
   * measureInWindow is relative to visibleWindowFrame.top, so y is offset by
   * the status-bar height. Using local DIP ensures SpotlightTooltip positions
   * correctly regardless of windowing mode.
   */
  private fun localDipRect(x: Double, y: Double, width: Double, height: Double): com.margelo.nitro.spotlight.Rect {
    val windowDp = RectF(x.toFloat(), y.toFloat(), (x + width).toFloat(), (y + height).toFloat())
    val local = spotlightView.windowDpToLocalDip(windowDp)
    return if (local.isEmpty) {
      com.margelo.nitro.spotlight.Rect(x = x, y = y, width = width, height = height)
    } else {
      com.margelo.nitro.spotlight.Rect(
        x      = local.left.toDouble(),
        y      = local.top.toDouble(),
        width  = local.width().toDouble(),
        height = local.height().toDouble(),
      )
    }
  }

  // -------------------------------------------------------------------------
  // Header dim: covers status bar + native nav header in decor-view
  // -------------------------------------------------------------------------

  private fun showHeaderDim() {
    val dv = context.currentActivity?.window?.decorView as? ViewGroup ?: return

    // Skip if the spotlight overlay lives in a different window than the
    // activity (e.g. a BottomSheetDialogFragment or any modal dialog).
    // The host dialog provides its own scrim; adding a dim strip to the
    // activity's decor view would place it behind the dialog — invisible
    // and incorrect. The dim + cutout inside the dialog window is enough.
    if (spotlightView.windowToken != dv.windowToken) return

    decorView = dv

    // Measure how many pixels sit above the React-managed spotlightView
    // (status bar height + native navigation header height).
    val origin = IntArray(2)
    spotlightView.getLocationOnScreen(origin)

    // origin[1] is the screen-y of spotlightView's top edge.
    // Everything from y=0 to y=origin[1] is above the React tree.
    val coveredHeight = origin[1]
    if (coveredHeight <= 0) {
      // spotlightView hasn't been laid out yet (e.g. highlight() called on
      // first mount before the first layout pass) — getLocationOnScreen
      // returns [0,0]. Retry once after the next layout/message-queue pass
      // instead of leaving the header permanently un-dimmed.
      if (!headerDimRetryPosted) {
        headerDimRetryPosted = true
        spotlightView.post {
          headerDimRetryPosted = false
          showHeaderDim()
        }
      }
      return
    }

    // Update color in case dimOpacity changed since last time.
    headerDimView.setBackgroundColor(dimArgb(dimOpacityValue ?: DEFAULT_DIM_OPACITY))
    syncHeaderDimClickHandler()

    // hideHeaderDim() sets headerDimAdded = false then asynchronously posts
    // removeView. If showHeaderDim fires again before that post runs, the view is
    // still attached — addView would throw "already has a parent". Re-adopt it.
    if (headerDimView.parent === dv) {
      headerDimAdded = true
      val params = headerDimView.layoutParams as? FrameLayout.LayoutParams
      if (params != null && params.height != coveredHeight) {
        params.height = coveredHeight
        headerDimView.layoutParams = params
      }
      return
    }

    dv.addView(
      headerDimView,
      FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, coveredHeight),
    )
    headerDimAdded = true
  }

  private fun syncHeaderDimClickHandler() {
    val handler = onBackdropPress
    headerDimView.isClickable = handler != null
    headerDimView.setOnClickListener(if (handler != null) View.OnClickListener { handler() } else null)
  }

  private fun hideHeaderDim() {
    if (!headerDimAdded) return
    headerDimAdded = false
    val dv = decorView ?: return
    // Post so we never remove a child during the decor-view's own layout traversal.
    dv.post {
      if (headerDimView.parent === dv) dv.removeView(headerDimView)
    }
  }

  private fun dimArgb(opacity: Double): Int =
    Color.argb((opacity.coerceIn(0.0, 1.0) * 255).toInt(), 0, 0, 0)

  companion object {
    private const val DEFAULT_DIM_OPACITY = 0.55
    private const val DEFAULT_SHAPE = "rect"
    private const val DEFAULT_BORDER_RADIUS = 12.0
    private const val DEFAULT_PADDING = 6.0
    private const val DEFAULT_BORDER_WIDTH = 1.5
    private const val DEFAULT_BORDER_COLOR = "#FFFFFF"
    private const val DEFAULT_ALLOW_OVERLAY_CLICK = false
  }
}
