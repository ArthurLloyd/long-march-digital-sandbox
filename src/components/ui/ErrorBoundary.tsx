import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error)
      return (
        <div className="scene-state" role="alert">
          <h3>场景暂时无法加载</h3>
          <p>请重试，或继续查看右侧资料。</p>
          <button
            className="text-button"
            onClick={() => this.setState({ error: false })}
          >
            重新加载场景
          </button>
        </div>
      );
    return this.props.children;
  }
}
