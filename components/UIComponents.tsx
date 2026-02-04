import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-2xl p-6 shadow-sm relative overflow-hidden group ${className} ${onClick ? 'cursor-pointer hover:shadow-md transition-all active:scale-[0.99]' : ''}`}
  >
    {children}
  </div>
);

export const Button: React.FC<{ 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; 
  className?: string;
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "px-5 py-3 rounded-xl font-bold tracking-wide transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 shadow-sm text-sm";
  const variants = {
    primary: "bg-slate-800 text-white hover:bg-slate-700 shadow-slate-900/10",
    secondary: "bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-white text-red-600 hover:bg-red-50",
    ghost: "bg-transparent text-slate-500 hover:text-slate-800 shadow-none hover:bg-slate-100"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
    >
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    {...props}
    className={`w-full bg-slate-50 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all placeholder-slate-400 text-sm ${props.className}`}
  />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select 
    {...props}
    className={`w-full bg-slate-50 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all text-sm ${props.className}`}
  >
    {props.children}
  </select>
);

export const ProgressBar: React.FC<{ value: number; max: number; color?: string }> = ({ value, max, color = 'bg-brand-mid' }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} transition-all duration-700 ease-out`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'bg-slate-100 text-slate-600' }) => (
  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${color}`}>
    {children}
  </span>
);