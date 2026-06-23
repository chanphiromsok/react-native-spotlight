package com.margelo.nitro.spotlight

import android.view.View
import android.view.ViewGroup
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
   * anchorView is what Fabric/Nitro holds in the JS view tree.
   * Zero-size, invisible — its only job is attach/detach lifecycle callbacks.
   */
  private val anchorView = View(context).apply {
    // This native view is only a Fabric/Nitro lifecycle anchor. It must never
    // participate in Android hit-testing; the real touch-handling overlay is
    // added to decorView only after highlight()/highlightAnimated().
    visibility = View.GONE
    isEnabled = false
    isClickable = false
    isFocusable = false
    isFocusableInTouchMode = false
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  /**
   * The real overlay. Sits outside the Fabric tree, attached directly to the
   * activity decor-view only while a spotlight is active.
   *
   * KEY FIX: we add spotlightView to the decor-view ONLY when highlight() is
   * called, and remove it again when clear() finishes. A MATCH_PARENT view
   * that lives permanently in the decor-view hierarchy always wins Android's
   * ViewGroup bounds-check and swallows touches — even when INVISIBLE or
   * isEnabled=false — because the framework hit-tests bounds before it ever
   * calls the child's dispatchTouchEvent. The only 100 % reliable solution
   * is to not have the view in the hierarchy at all when it is not needed.
   */
  private val spotlightView = SpotlightOverlayView(context)

  /** True while anchorView is attached to a window (i.e. the screen is live). */
  private var anchorAttached = false

  /** The decor-view we most recently added spotlightView to. */
  private var decorView: ViewGroup? = null

  /** True while spotlightView is a child of decorView. */
  private var overlayAdded = false

  private var dimOpacityValue: Double? = null
  private var borderRadiusValue: Double? = null
  private var paddingValue: Double? = null
  private var borderWidthValue: Double? = null
  private var borderColorValue: String? = null
  private var allowOverlayClickValue: Boolean? = null
  private var useWindowOverlayValue: Boolean? = null

  // -------------------------------------------------------------------------
  // Nitro / Fabric entry-point
  // -------------------------------------------------------------------------

  override val view: View get() = anchorView

  // -------------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------------

  init {
    anchorView.addOnAttachStateChangeListener(object : View.OnAttachStateChangeListener {
      override fun onViewAttachedToWindow(v: View) {
        anchorAttached = true
        decorView = context.currentActivity?.window?.decorView as? ViewGroup
      }

      override fun onViewDetachedFromWindow(v: View) {
        anchorAttached = false
        // If React Navigation/native-screens detaches this screen, remove the
        // overlay immediately so it cannot remain on top of the previous/next
        // screen. clear(0) also cancels any in-flight cutout animation.
        spotlightView.clear(durationMs = 0L, onFinished = {
          removeOverlayFromDecor()
          decorView = null
        })
      }
    })
  }

  // -------------------------------------------------------------------------
  // Properties
  // -------------------------------------------------------------------------

  override var dimOpacity: Double?
    get() = dimOpacityValue
    set(value) {
      if (dimOpacityValue == value) return
      dimOpacityValue = value
      UiThreadUtil.runOnUiThread { spotlightView.dimOpacity = (value ?: DEFAULT_DIM_OPACITY).toFloat() }
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

  // iOS-only prop. Android already attaches the native overlay to decorView.
  override var useWindowOverlay: Boolean?
    get() = useWindowOverlayValue
    set(value) {
      useWindowOverlayValue = value
    }

  override var onTargetLayout: ((Rect) -> Unit)? = null

  override var onBackdropPress: (() -> Unit)? = null
    set(value) {
      field = value
      UiThreadUtil.runOnUiThread { spotlightView.onBackdropPress = value }
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
      // Add overlay to decor-view first so it has a valid layout when
      // setHighlight() queries getLocationOnScreen().
      addOverlayToDecor()
      spotlightView.setHighlight(
        xDp       = x.toFloat(),
        yDp       = y.toFloat(),
        widthDp   = width.toFloat(),
        heightDp  = height.toFloat(),
        animated  = false,
      )
      onTargetLayout?.invoke(Rect(x = x, y = y, width = width, height = height))
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
      addOverlayToDecor()
      spotlightView.setHighlight(
        xDp       = x.toFloat(),
        yDp       = y.toFloat(),
        widthDp   = width.toFloat(),
        heightDp  = height.toFloat(),
        animated  = true,
        durationMs = durationMs.toLong(),
      )
      onTargetLayout?.invoke(Rect(x = x, y = y, width = width, height = height))
    }
  }

  override fun clear() {
    UiThreadUtil.runOnUiThread {
      // Match iOS behavior: clear must remove the decor overlay immediately.
      // This is important for navigation back gestures/buttons, otherwise the
      // overlay can remain visible for the clear animation while the previous
      // screen is already appearing.
      spotlightView.clear(durationMs = 0L, onFinished = { removeOverlayFromDecor() })
    }
  }

  // -------------------------------------------------------------------------
  // RecyclableView
  // -------------------------------------------------------------------------

  override fun prepareForRecycle() {
    onTargetLayout = null
    onBackdropPress = null
    dimOpacityValue = null
    borderRadiusValue = null
    paddingValue = null
    borderWidthValue = null
    borderColorValue = null
    allowOverlayClickValue = null
    UiThreadUtil.runOnUiThread {
      spotlightView.dimOpacity = DEFAULT_DIM_OPACITY.toFloat()
      spotlightView.borderRadius = DEFAULT_BORDER_RADIUS.toFloat()
      spotlightView.padding = DEFAULT_PADDING.toFloat()
      spotlightView.borderWidth = DEFAULT_BORDER_WIDTH.toFloat()
      spotlightView.borderColor = DEFAULT_BORDER_COLOR
      spotlightView.allowOverlayClick = DEFAULT_ALLOW_OVERLAY_CLICK
      spotlightView.onBackdropPress = null
      spotlightView.clear(durationMs = 0L, onFinished = { removeOverlayFromDecor() })
    }
  }

  // -------------------------------------------------------------------------
  // Overlay add / remove
  // -------------------------------------------------------------------------

  private fun addOverlayToDecor() {
    if (overlayAdded) return
    val dv = decorView ?: return

    val params = android.widget.FrameLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT,
    )
    dv.addView(spotlightView, params)

    // Sync props that may have been set before the overlay was attached.
    spotlightView.dimOpacity = (dimOpacityValue ?: DEFAULT_DIM_OPACITY).toFloat()
    spotlightView.borderRadius = (borderRadiusValue ?: DEFAULT_BORDER_RADIUS).toFloat()
    spotlightView.padding = (paddingValue ?: DEFAULT_PADDING).toFloat()
    spotlightView.borderWidth = (borderWidthValue ?: DEFAULT_BORDER_WIDTH).toFloat()
    spotlightView.borderColor = borderColorValue ?: DEFAULT_BORDER_COLOR
    spotlightView.allowOverlayClick = allowOverlayClickValue ?: DEFAULT_ALLOW_OVERLAY_CLICK
    spotlightView.onBackdropPress = onBackdropPress

    overlayAdded = true
  }

  /**
   * Remove spotlightView from the decor-view.
   * Posted via Handler so we never remove a child during the decor-view's
   * own dispatchDetachedFromWindow traversal (which would corrupt its child
   * list on some Android versions).
   */
  private fun removeOverlayFromDecor() {
    if (!overlayAdded) return
    overlayAdded = false

    val dv = decorView
    dv?.post {
      if (spotlightView.parent === dv) {
        dv.removeView(spotlightView)
      }
    }
  }

  companion object {
    private const val DEFAULT_DIM_OPACITY = 0.55
    private const val DEFAULT_BORDER_RADIUS = 12.0
    private const val DEFAULT_PADDING = 6.0
    private const val DEFAULT_BORDER_WIDTH = 1.5
    private const val DEFAULT_BORDER_COLOR = "#FFFFFF"
    private const val DEFAULT_ALLOW_OVERLAY_CLICK = false
  }
}
