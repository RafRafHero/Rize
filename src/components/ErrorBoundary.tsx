import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`[ErrorBoundary] ${this.props.name || 'Component'} crashed:`, error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/50 backdrop-blur-md text-white p-8 text-center rounded-2xl border border-white/10">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                    <p className="text-white/60 text-sm max-w-md mb-6">
                        The {this.props.name || 'component'} encountered a terminal error and had to be stopped.
                        {this.state.error && <code className="block mt-2 p-2 bg-black/40 rounded text-xs text-red-300/80">{this.state.error.message}</code>}
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 font-medium"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Restore Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
