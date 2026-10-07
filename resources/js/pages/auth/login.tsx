import { Head, useForm } from '@inertiajs/react';
import React from 'react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/login', { onFinish: () => setData('password', '') });
    };

    return (
        <div className="min-h-screen bg-[#ffffff] text-[#022c22] flex items-center justify-center px-4 font-['Inter',sans-serif]">
            <Head title="Giriş" />
            <form
                onSubmit={submit}
                className="w-full max-w-sm bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] p-6 space-y-4 shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px]"
            >
                <div>
                    <h1 className="font-['Inter_Tight',sans-serif] text-xl font-bold">iprep</h1>
                    <p className="text-[12px] text-[#71717a] mt-1">IP itibar paneline giriş yapın.</p>
                </div>

                <div>
                    <label htmlFor="email" className="block text-[12px] font-semibold mb-1">E-posta</label>
                    <input
                        id="email"
                        type="email"
                        required
                        autoFocus
                        autoComplete="username"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-[8px] border border-[#e5e7eb] text-[13px] focus:outline-none focus:border-[#10b981]"
                    />
                    {errors.email && <p className="mt-1 text-[12px] text-[#dc2626]">{errors.email}</p>}
                </div>

                <div>
                    <label htmlFor="password" className="block text-[12px] font-semibold mb-1">Şifre</label>
                    <input
                        id="password"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-[8px] border border-[#e5e7eb] text-[13px] focus:outline-none focus:border-[#10b981]"
                    />
                    {errors.password && <p className="mt-1 text-[12px] text-[#dc2626]">{errors.password}</p>}
                </div>

                <label className="flex items-center gap-2 text-[12px] text-[#71717a]">
                    <input type="checkbox" checked={data.remember} onChange={(e) => setData('remember', e.target.checked)} />
                    Beni hatırla
                </label>

                <button
                    type="submit"
                    disabled={processing}
                    className="w-full px-5 py-2 rounded-[9999px] text-[14px] font-medium bg-[#00bc7d] hover:bg-[#007a55] text-white transition disabled:opacity-50"
                >
                    Giriş Yap
                </button>
            </form>
        </div>
    );
}
