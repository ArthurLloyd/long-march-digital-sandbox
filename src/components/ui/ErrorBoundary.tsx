import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<
  { children: ReactNode; onRetry?: () => void; onError?: () => void },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    if (this.state.error)
      return (
        <div className="scene-state" role="alert">
          <h3>场景暂时无法加载</h3>
          <p>请重试，或继续打开资料面板阅读。</p>
          <button
            className="text-button"
            onClick={() => {
              this.setState({ error: false });
              this.props.onRetry?.();
            }}
          >
            重新加载场景
          </button>
        </div>
      );
    return this.props.children;
  }
}
