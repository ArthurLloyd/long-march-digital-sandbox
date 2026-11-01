import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<
  {
    children: ReactNode;
    onRetry?: () => void;
    onError?: () => void;
    title?: string;
    message?: string;
    className?: string;
    retryLabel?: string;
  },
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
        <div className={this.props.className ?? 'scene-state'} role="alert">
          <h3>{this.props.title ?? '场景暂时无法加载'}</h3>
          <p>{this.props.message ?? '请重试，或继续打开资料面板阅读。'}</p>
          <button
            className="text-button"
            onClick={() => {
              this.setState({ error: false });
              this.props.onRetry?.();
            }}
          >
            {this.props.retryLabel ?? '重新加载场景'}
          </button>
        </div>
      );
    return this.props.children;
  }
}
