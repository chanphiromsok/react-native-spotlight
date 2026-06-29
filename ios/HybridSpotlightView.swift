import UIKit

// MARK: - HybridSpotlightView

class HybridSpotlightView: HybridSpotlightViewSpec {

  // MARK: - Nitro

  private let spotlightView = SpotlightView()

  var view: UIView {
    spotlightView
  }

  override init() {
    super.init()
  }

  func beforeUpdate() {
    spotlightView.dimOpacity = CGFloat(dimOpacity ?? Self.defaultDimOpacity)
    spotlightView.borderRadius = CGFloat(borderRadius ?? Self.defaultBorderRadius)
    spotlightView.borderColor = borderColor ?? Self.defaultBorderColor
    spotlightView.padding = CGFloat(padding ?? Self.defaultPadding)
    spotlightView.borderWidth = CGFloat(borderWidth ?? Self.defaultBorderWidth)
    spotlightView.allowOverlayClick = allowOverlayClick ?? Self.defaultAllowOverlayClick
  }

  func onDropView() {
    DispatchQueue.main.async { [weak self] in
      self?.spotlightView.clear()
    }
  }

  // MARK: - Props

  var dimOpacity: Double? {
    didSet {
      guard oldValue != dimOpacity else { return }
      spotlightView.dimOpacity = CGFloat(dimOpacity ?? Self.defaultDimOpacity)
    }
  }

  var borderRadius: Double? {
    didSet {
      guard oldValue != borderRadius else { return }
      spotlightView.borderRadius = CGFloat(borderRadius ?? Self.defaultBorderRadius)
    }
  }

  var padding: Double? {
    didSet {
      guard oldValue != padding else { return }
      spotlightView.padding = CGFloat(padding ?? Self.defaultPadding)
    }
  }

  var borderWidth: Double? {
    didSet {
      guard oldValue != borderWidth else { return }
      spotlightView.borderWidth = CGFloat(borderWidth ?? Self.defaultBorderWidth)
    }
  }

  var borderColor: String? {
    didSet {
      guard oldValue != borderColor else { return }
      spotlightView.borderColor = borderColor ?? Self.defaultBorderColor
    }
  }

  var allowOverlayClick: Bool? {
    didSet {
      guard oldValue != allowOverlayClick else { return }
      spotlightView.allowOverlayClick = allowOverlayClick ?? Self.defaultAllowOverlayClick
    }
  }

  var onTargetLayout: ((Rect) -> Void)?

  var onBackdropPress: (() -> Void)? {
    didSet {
      spotlightView.onBackdropPress = onBackdropPress
    }
  }

  // MARK: - Methods

  func highlight(
    x: Double,
    y: Double,
    width: Double,
    height: Double
  ) throws {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      spotlightView.setHighlight(CGRect(x: x, y: y, width: width, height: height), animated: false)
      onTargetLayout?(Rect(x: x, y: y, width: width, height: height))
    }
  }

  func highlightAnimated(
    x: Double,
    y: Double,
    width: Double,
    height: Double,
    durationMs: Double
  ) throws {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      spotlightView.setHighlight(
        CGRect(x: x, y: y, width: width, height: height),
        animated: true,
        duration: durationMs / 1000.0
      )
      onTargetLayout?(Rect(x: x, y: y, width: width, height: height))
    }
  }

  func clear() throws {
    DispatchQueue.main.async { [weak self] in
      self?.spotlightView.clear()
    }
  }

  private static let defaultDimOpacity = 0.55
  private static let defaultBorderRadius = 12.0
  private static let defaultPadding = 6.0
  private static let defaultBorderWidth = 1.5
  private static let defaultBorderColor = "#FFFFFF"
  private static let defaultAllowOverlayClick = false
}
