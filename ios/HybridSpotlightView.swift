import UIKit

// MARK: - PassthroughView

/// A UIView that only claims a touch when one of its subviews explicitly
/// wants it. Transparent gaps never block the underlying window content.
final class PassthroughView: UIView {
  override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
    subviews.contains {
      !$0.isHidden
        && $0.alpha > 0.01
        && $0.isUserInteractionEnabled
        && $0.point(inside: convert(point, to: $0), with: event)
    }
  }
}

// MARK: - HybridSpotlightView

class HybridSpotlightView: HybridSpotlightViewSpec {

  // MARK: - Nitro

  private let anchorView      = UIView(frame: .zero)
  private let overlayView     = SpotlightOverlayView()
  /// Sits directly above overlayView in the UIWindow; receives reparented RN tooltip views.
  private let tooltipHostView = PassthroughView(frame: .zero)
  private weak var attachedWindow: UIWindow?
  private var overlayAdded = false

  var view: UIView { anchorView }

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
    didSet { overlayView.onBackdropPress = onBackdropPress }
  }

  // MARK: - Methods

  func highlight(x: Double, y: Double, width: Double, height: Double) throws {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      let rect = CGRect(x: x, y: y, width: width, height: height)
      addOverlayToWindow()
      overlayView.setHighlight(rect, animated: false)
      onTargetLayout?(Rect(x: x, y: y, width: width, height: height))
    }
  }

  func highlightAnimated(x: Double, y: Double, width: Double, height: Double, durationMs: Double) throws {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      let rect = CGRect(x: x, y: y, width: width, height: height)
      addOverlayToWindow()
      overlayView.setHighlight(rect, animated: true, duration: durationMs / 1000.0)
      onTargetLayout?(Rect(x: x, y: y, width: width, height: height))
    }
  }

  func clear() throws {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      overlayView.clear()
      removeOverlayFromWindow()
    }
  }

  /// Reparents the Fabric UIView for `viewTag` into the tooltip host layer.
  ///
  /// Both the slot view and tooltipHostView are in the same UIWindow —
  /// same-window reparenting never triggers UIViewControllerHierarchyInconsistency.
  func showTooltip(viewTag: Double, x: Double, y: Double, width: Double, height: Double) throws {
    let tag   = Int32(viewTag)
    let frame = CGRect(x: x, y: y, width: width, height: height)
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      if !overlayAdded { addOverlayToWindow() }
      guard let fabricView = Self.findFabricView(tag: tag) else {
        print("[Spotlight] showTooltip: no Fabric view for tag \(tag)")
        return
      }
      fabricView.removeFromSuperview()
      fabricView.frame = frame
      tooltipHostView.addSubview(fabricView)
    }
  }

  func hideTooltip() throws {
    DispatchQueue.main.async { [weak self] in
      self?.tooltipHostView.subviews.forEach { $0.removeFromSuperview() }
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

    overlayView.frame            = window.bounds
    overlayView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    overlayView.dimOpacity        = CGFloat(dimOpacity        ?? Self.defaultDimOpacity)
    overlayView.borderRadius      = CGFloat(borderRadius      ?? Self.defaultBorderRadius)
    overlayView.padding           = CGFloat(padding           ?? Self.defaultPadding)
    overlayView.borderWidth       = CGFloat(borderWidth       ?? Self.defaultBorderWidth)
    overlayView.borderColor       = borderColor               ?? Self.defaultBorderColor
    overlayView.allowOverlayClick = allowOverlayClick         ?? Self.defaultAllowOverlayClick
    overlayView.onBackdropPress   = onBackdropPress

    tooltipHostView.frame            = window.bounds
    tooltipHostView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    tooltipHostView.backgroundColor  = .clear

    // Add both to the window, then force them to the very top.
    // bringSubviewToFront is needed because navigation transitions (react-native-screens)
    // can add UITransitionViews to the UIWindow after our views, pushing us below headers.
    window.addSubview(overlayView)
    window.addSubview(tooltipHostView)
    window.bringSubviewToFront(overlayView)
    window.bringSubviewToFront(tooltipHostView)
    overlayAdded = true
  }

  private func removeOverlayFromWindow() {
    guard overlayAdded else { return }
    overlayAdded = false
    tooltipHostView.subviews.forEach { $0.removeFromSuperview() }
    tooltipHostView.removeFromSuperview()
    overlayView.removeFromSuperview()
    attachedWindow = nil
  }

  // MARK: - Fabric view lookup

  /// Walk all UIWindowScene windows and return the UIView whose .tag matches
  /// the given React tag. Fabric sets UIView.tag = reactTag for every mounted
  /// component view — pure Swift, no React imports needed.
  private static func findFabricView(tag: Int32) -> UIView? {
    let target = Int(tag)
    func search(_ v: UIView) -> UIView? {
      if v.tag == target { return v }
      for sub in v.subviews { if let f = search(sub) { return f } }
      return nil
    }
    for scene in UIApplication.shared.connectedScenes {
      guard let ws = scene as? UIWindowScene else { continue }
      for window in ws.windows {
        if let found = search(window) { return found }
      }
    }
    return nil
  }

  // MARK: - Defaults

  private static let defaultDimOpacity       = 0.55
  private static let defaultBorderRadius     = 12.0
  private static let defaultPadding          = 6.0
  private static let defaultBorderWidth      = 1.5
  private static let defaultBorderColor      = "#FFFFFF"
  private static let defaultAllowOverlayClick = false
}
