import UIKit

// MARK: - HybridSpotlightWindowOverlayView

class HybridSpotlightWindowOverlayView: HybridSpotlightWindowOverlayViewSpec {
  private let hostView = SpotlightWindowOverlayHostView(frame: .zero)

  var view: UIView {
    hostView
  }

  override init() {
    super.init()
  }

  deinit {
    hostView.detachFromWindow()
  }
}

// MARK: - SpotlightWindowOverlayHostView

private final class SpotlightWindowOverlayHostView: UIView {
  private let containerView = SpotlightWindowOverlayContainerView(frame: .zero)
  private weak var attachedWindow: UIWindow?

  override init(frame: CGRect) {
    super.init(frame: frame)

    backgroundColor = .clear
    clipsToBounds = false
    layer.masksToBounds = false
    isUserInteractionEnabled = false

    containerView.backgroundColor = .clear
    containerView.clipsToBounds = false
    containerView.layer.masksToBounds = false
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()

    guard let window else {
      detachFromWindow()
      return
    }

    attach(to: window)
  }

  override func didMoveToSuperview() {
    super.didMoveToSuperview()

    if superview == nil {
      detachFromWindow()
    } else if let window {
      attach(to: window)
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    updateContainerFrame()
  }

  override func addSubview(_ view: UIView) {
    if view === containerView {
      super.addSubview(view)
      return
    }

    containerView.addSubview(view)
  }

  override func insertSubview(_ view: UIView, at index: Int) {
    if view === containerView {
      super.insertSubview(view, at: index)
      return
    }

    containerView.insertSubview(view, at: index)
  }

  override func insertSubview(_ view: UIView, aboveSubview siblingSubview: UIView) {
    containerView.insertSubview(view, aboveSubview: siblingSubview)
  }

  override func insertSubview(_ view: UIView, belowSubview siblingSubview: UIView) {
    containerView.insertSubview(view, belowSubview: siblingSubview)
  }

  func detachFromWindow() {
    containerView.removeFromSuperview()
    attachedWindow = nil
  }

  private func attach(to window: UIWindow) {
    if attachedWindow !== window || containerView.superview !== window {
      containerView.removeFromSuperview()
      window.addSubview(containerView)
      attachedWindow = window
    }

    updateContainerFrame()
    window.bringSubviewToFront(containerView)
  }

  private func updateContainerFrame() {
    guard let attachedWindow else { return }
    containerView.frame = attachedWindow.bounds
    containerView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
  }
}

// MARK: - SpotlightWindowOverlayContainerView

private final class SpotlightWindowOverlayContainerView: UIView {
  override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
    for subview in subviews.reversed() where !subview.isHidden && subview.isUserInteractionEnabled {
      let convertedPoint = subview.convert(point, from: self)
      if subview.point(inside: convertedPoint, with: event) {
        return true
      }
    }

    return false
  }

  override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    guard isUserInteractionEnabled, !isHidden, alpha > 0.01 else { return nil }

    for subview in subviews.reversed() where !subview.isHidden && subview.isUserInteractionEnabled {
      let convertedPoint = subview.convert(point, from: self)
      if let hitView = subview.hitTest(convertedPoint, with: event) {
        return hitView
      }
    }

    return nil
  }

  override func didMoveToSuperview() {
    super.didMoveToSuperview()
    superview?.bringSubviewToFront(self)
  }
}
