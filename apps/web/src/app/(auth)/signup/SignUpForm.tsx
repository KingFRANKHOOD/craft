'use client';

import { useActionState } from 'react';
import { signUpAction, type SignUpState } from './actions';

const initialState: SignUpState = { status: 'idle', message: '' };

export default function SignUpForm() {
    const [state, formAction, isPending] = useActionState(signUpAction, initialState);

    if (state.status === 'success') {
        return (
            <div role="status" className="text-center space-y-2">
                <p className="text-green-600 font-medium">{state.message}</p>
                <a href="/signin" className="text-sm text-blue-600 underline">
                    Go to sign in
                </a>
            </div>
        );
    }

    return (
        <form action={formAction} noValidate className="space-y-4 w-full max-w-sm">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    aria-required="true"
                    disabled={isPending}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                               disabled:opacity-50"
                />
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                    <span className="ml-1 text-xs text-gray-400 font-normal">(min. 8 characters)</span>
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    aria-required="true"
                    minLength={8}
                    disabled={isPending}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                               disabled:opacity-50"
                />
            </div>

            <div>
                <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    Confirm password
                </label>
                <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    aria-required="true"
                    minLength={8}
                    disabled={isPending}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                               disabled:opacity-50"
                />
            </div>

            {state.status === 'error' && (
                <p role="alert" className="text-sm text-red-600">
                    {state.message}
                </p>
            )}

            <button
                type="submit"
                disabled={isPending}
                aria-busy={isPending}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white
                           hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                           disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
                {isPending ? 'Creating account…' : 'Create account'}
            </button>

            <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <a href="/signin" className="text-blue-600 underline">
                    Sign in
                </a>
            </p>
        </form>
    );
}
