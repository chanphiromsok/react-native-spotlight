import UIKit

// MARK: - HybridSpotlightView

class HybridSpotlightView: HybridSpotlightViewSpec {

  // MARK: - Nitro

  private let anchorView = UIView(frame: .zero)
  private let overlayView = SpotlightOverlayView()
  private weak var attachedWindow: UIWindow?
  private var overlayAdded = false

  var view: UIView {
    anchorView
  }

  override init() {
    super.init()

    anchorView.isHidden = true
    anchorView.isUserInteractionEnabled = false
    anchorView.accessibilityElementsHidden = true
  }

  // MARK: - Props

  var dimOpacity: Double? {
    didSet {
      guard oldValue != dimOpacity else { return }
      overlayView.dimOpacity = CGFloat(dimOpacity ?? Self.defaultDimOpacity)
    }
  }

  var borderRadius: Double? {
    didSet {
      guard oldValue != borderRadius else { return }
      overlayView.borderRadius = CGFloat(borderRadius ?? Self.defaultBorderRadius)
    }
  }

  var padding: Double? {
    didSet {
      guard oldValue != padding else { return }
      overlayView.padding = CGFloat(padding ?? Self.defaultPadding)
    }
  }

  var borderWidth: Double? {
    didSet {
      guard oldValue != borderWidth else { return }
      overlayView.borderWidth = CGFloat(borderWidth ?? Self.defaultBorderWidth)
    }
  }

  var borderColor: String? {
    didSet {
      guard oldValue != borderColor else { return }
      overlayView.borderColor = borderColor ?? Self.defaultBorderColor
    }
  }

  var allowOverlayClick: Bool? {
    didSet {
      guard oldValue != allowOverlayClick else { return }
      overlayView.allowOverlayClick = allowOverlayClick ?? Self.defaultAllowOverlayClick
    }
  }

  var onTargetLayout: ((Rect) -> Void)?

  var onBackdropPress: (() -> Void)? {
    didSet {
      overlayView.onBackdropPress = onBackdropPress
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

      let rect = CGRect(
        x: x,
        y: y,
        width: width,
        height: height
      )

      addOverlayToWindow()
      overlayView.setHighlight(
        rect,
        animated: false
      )

      onTargetLayout?(
        Rect(
          x: x,
          y: y,
          width: width,
          height: height
        )
      )
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

      let rect = CGRect(
        x: x,
        y: y,
        width: width,
        height: height
      )

      addOverlayToWindow()
      overlayView.setHighlight(
        rect,
        animated: true,
        duration: durationMs / 1000.0
      )

      onTargetLayout?(
        Rect(
          x: x,
          y: y,
          width: width,
          height: height
        )
      )
    }
  }

  func clear() throws {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      overlayView.clear()
      removeOverlayFromWindow()
    }
  }

  func measureViewByTag(reactTag: Double) -> Rect {
    return Rect(x: 0, y: 0, width: 0, height: 0)
  }

  // MARK: - Overlay add/remove

  private func addOverlayToWindow() {
    if overlayAdded { return }

    guard let window = anchorView.window else { return }
    attachedWindow = window

    overlayView.frame = window.bounds
    overlayView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    overlayView.dimOpacity = CGFloat(dimOpacity ?? Self.defaultDimOpacity)
    overlayView.borderRadius = CGFloat(borderRadius ?? Self.defaultBorderRadius)
    overlayView.padding = CGFloat(padding ?? Self.defaultPadding)
    overlayView.borderWidth = CGFloat(borderWidth ?? Self.defaultBorderWidth)
    overlayView.borderColor = borderColor ?? Self.defaultBorderColor
    overlayView.allowOverlayClick = allowOverlayClick ?? Self.defaultAllowOverlayClick
    overlayView.onBackdropPress = onBackdropPress

    window.addSubview(overlayView)
    overlayAdded = true
  }

  private func removeOverlayFromWindow() {
    guard overlayAdded else { return }
    overlayAdded = false
    overlayView.removeFromSuperview()
    attachedWindow = nil
  }

  private static let defaultDimOpacity = 0.55
  private static let defaultBorderRadius = 12.0
  private static let defaultPadding = 6.0
  private static let defaultBorderWidth = 1.5
  private static let defaultBorderColor = "#FFFFFF"
  private static let defaultAllowOverlayClick = false
}
