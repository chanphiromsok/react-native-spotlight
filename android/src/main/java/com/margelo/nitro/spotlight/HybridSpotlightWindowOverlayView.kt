package com.margelo.nitro.spotlight

import android.view.View
import android.widget.FrameLayout
import androidx.annotation.Keep
import com.facebook.common.internal.DoNotStrip
import com.facebook.react.uimanager.ThemedReactContext
import com.margelo.nitro.views.RecyclableView

@DoNotStrip
@Keep
class HybridSpotlightWindowOverlayView(
  context: ThemedReactContext,
) : HybridSpotlightWindowOverlayViewSpec(), RecyclableView {
  private val containerView = FrameLayout(context).apply {
    clipChildren = false
    clipToPadding = false
  }

  override val view: View get() = containerView
}
