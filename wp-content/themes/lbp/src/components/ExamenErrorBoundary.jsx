import { Component } from 'react';

/**
 * Error Boundary для перехвата ошибок DOM (например removeChild) при обновлении
 * списка слов. ReactQuill и другие библиотеки могут рассинхронизировать DOM.
 */
class ExamenErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('ExamenErrorBoundary поймал ошибку:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="examen-error-fallback" style={{
          padding: '24px',
          margin: '16px 0',
          border: '1px solid #ff9800',
          borderRadius: '8px',
          backgroundColor: '#fff8e1',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 12px', color: '#e65100' }}>
            При обновлении отображения произошла ошибка. Это может быть связано с редактором подсказок.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ff9800',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Продолжить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ExamenErrorBoundary;
