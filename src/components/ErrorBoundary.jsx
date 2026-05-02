import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
          <p className="text-6xl">⚠️</p>
          <h1 className="text-xl font-bold text-text-primary mt-4">Terjadi Kesalahan</h1>
          <p className="text-text-secondary mt-2 text-sm max-w-xs">
            Maaf, terjadi kesalahan yang tidak terduga. Coba muat ulang halaman.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-primary text-white px-6 py-2.5 rounded-full text-sm font-semibold active:scale-[0.98] transition-transform"
          >
            Muat Ulang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
