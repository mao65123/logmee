
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import {
  Play, Square, Plus, Clock, Users, FileText,
  Settings, Home, Edit2, CheckCircle, X, Calculator, BellRing, Flame, Trophy, Activity, Printer, Calendar, Eye, Download, Check, AlertTriangle, Briefcase, Trash2, Maximize2, Palette, LayoutList, History, Coins, PictureInPicture2, GripVertical, ChevronLeft, ChevronRight, BarChart2, TrendingUp, DollarSign, PieChart as PieChartIcon, HelpCircle, BookOpen, Lightbulb, MousePointerClick, ArrowRight, LogOut, Cloud, CloudOff
} from 'lucide-react';
import { ResponsiveContainer, Cell, BarChart, Bar, XAxis, Tooltip as RechartsTooltip, PieChart, Pie, Legend } from 'recharts';

import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppState, Client, TimeEntry, MonthlyFixedFee, Project, Currency, SavedReport } from './types';
import { loadState, saveState } from './services/storage';
import { exportToCSV } from './services/pdfGenerator';
import { Card, Button, Input, Select, Badge } from './components/UIComponents';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './hooks/useAuth';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import {
  loadAllUserData,
  saveClient,
  deleteClient as deleteClientFromSupabase,
  saveTimeEntry,
  deleteTimeEntry as deleteEntryFromSupabase,
  saveUserSettings,
  saveMonthlyFixedFee,
  deleteMonthlyFixedFee as deleteFeeFromSupabase,
  saveProject,
  deleteProject as deleteProjectFromSupabase,
  saveSavedReport,
  deleteSavedReport as deleteSavedReportFromSupabase
} from './services/supabase';

// --- Theme Style Wrapper ---
const ThemeProvider: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => {
  useEffect(() => {
    const root = document.documentElement;
    let solidColor = color;
    let contrast = '#1e293b'; // Default Slate 800 (Dark text)

    const darkColors = ['#1e293b', '#0f172a', '#334155', '#b91c1c', '#4338ca', '#15803d', '#0F2027'];
    
    if (darkColors.includes(color) || color.includes('gradient')) {
      // Logic for contrasting text colors
      if (color.includes('#FFD700') || color.includes('#fdbed6') || color.includes('#fc9f97') || color.includes('#e2e8f0')) {
         contrast = '#1e293b';
      } else {
         contrast = '#ffffff';
      }
    }
    
    // Set CSS Variables
    root.style.setProperty('--theme-color', solidColor);
    root.style.setProperty('--theme-bg-gradient', color);
    root.style.setProperty('--theme-contrast-text', contrast);

    // Update meta theme-color for mobile browser status bar
    const metaThemeColor = document.getElementById('meta-theme-color') as HTMLMetaElement | null;
    if (metaThemeColor) {
      // For gradients, extract the first color; for solid colors, use as-is
      if (color.includes('gradient')) {
        const match = color.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/);
        metaThemeColor.content = match ? match[0] : '#334155';
      } else {
        metaThemeColor.content = color;
      }
    }
  }, [color]);
  return <>{children}</>;
};

// --- Stylish Color Palette (Earthy & Muted Tones) ---
const STYLISH_COLORS = [
    '#4A6FA5', // Muted Blue
    '#6B8E23', // Olive Drab
    '#CD853F', // Peru
    '#BC8F8F', // Rosy Brown
    '#708090', // Slate Gray
    '#5F9EA0', // Cadet Blue
    '#A0522D', // Sienna
    '#808000', // Olive
    '#4682B4', // Steel Blue
    '#D2691E', // Chocolate
    '#9ACD32', // Yellow Green
    '#778899', // Light Slate Gray
    '#CD5C5C', // Indian Red
    '#8FBC8F', // Dark Sea Green
    '#DB7093', // Pale Violet Red
];

const getNextStylishColor = (existingColors: string[]) => {
    const available = STYLISH_COLORS.filter(c => !existingColors.includes(c));
    if (available.length > 0) return available[0];
    return STYLISH_COLORS[Math.floor(Math.random() * STYLISH_COLORS.length)];
};

// --- Draggable Component ---
const DraggableTimer: React.FC<{
    activeClientName: string;
    onStop: () => void;
    elapsedTime: string;
    onTogglePiP: () => void;
    isPiPActive: boolean;
}> = ({ activeClientName, onStop, elapsedTime, onTogglePiP, isPiPActive }) => {
    const [position, setPosition] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 100 });
    const [isDragging, setIsDragging] = useState(false);
    const offset = useRef({ x: 0, y: 0 });
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (window.innerWidth < 768) {
             setPosition({ x: (window.innerWidth - 300) / 2, y: window.innerHeight - 140 });
        }
    }, []);

    const handleStart = (clientX: number, clientY: number) => {
        if (ref.current) {
            setIsDragging(true);
            const rect = ref.current.getBoundingClientRect();
            offset.current = {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        }
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (isDragging) {
            setPosition({
                x: clientX - offset.current.x,
                y: clientY - offset.current.y
            });
        }
    };

    const handleEnd = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const onMouseUp = () => handleEnd();
        const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
        const onTouchEnd = () => handleEnd();

        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('touchmove', onTouchMove, { passive: false });
            window.addEventListener('touchend', onTouchEnd);
        }

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, [isDragging]);

    if (isPiPActive) return null;

    return (
        <div
            ref={ref}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                touchAction: 'none',
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: 9999
            }}
            onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
            onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
            className="shadow-2xl rounded-full"
        >
            <div className="bg-[#334155] text-white rounded-full p-2 pl-6 pr-2 flex items-center gap-4 shadow-lg border border-slate-600/50 min-w-[280px] max-w-[320px]">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                   <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                   <div className="flex flex-col overflow-hidden">
                       <span className="text-[10px] text-slate-400 font-bold leading-none mb-0.5">計測中</span>
                       <span className="text-sm font-bold truncate leading-none">{activeClientName || '作業中'}</span>
                   </div>
                </div>

                <div className="font-mono font-bold text-lg text-slate-200 tabular-nums">
                    {elapsedTime}
                </div>

                <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={onTogglePiP}
                    className="h-10 w-10 bg-[#1e293b] hover:bg-black text-white rounded-full text-xs font-bold flex items-center justify-center active:scale-95 transition-all border border-slate-600"
                    title="ピクチャーインピクチャーで表示"
                >
                   <PictureInPicture2 size={16} />
                </button>

                <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={onStop}
                    className="h-10 px-5 bg-[#1e293b] hover:bg-black text-white rounded-full text-xs font-bold flex items-center gap-2 active:scale-95 transition-all border border-slate-600"
                >
                   <Square size={10} fill="currentColor" /> 停止
                </button>
            </div>
        </div>
    );
};

// --- Helper Components ---

const MobileNavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active?: boolean }> = ({ to, icon, label, active }) => {
  return (
    <Link to={to} className="flex flex-col items-center justify-center py-2 flex-1 relative transition-colors duration-200">
      <div className={`${active ? 'theme-text' : 'text-slate-400'}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: active ? 2.5 : 2, fill: "none" })}
      </div>
      <span className={`text-[10px] mt-1 font-bold ${active ? 'theme-text' : 'text-slate-400'}`}>{label}</span>
      {active && <div className="absolute bottom-1 w-1 h-1 rounded-full theme-bg"></div>}
    </Link>
  );
};

const DesktopNavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active?: boolean }> = ({ to, icon, label, active }) => {
    return (
      <Link to={to} className={`flex items-center gap-4 px-6 py-4 transition-colors duration-200 rounded-xl mx-2 ${active ? 'bg-slate-50 theme-text font-black' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-bold'}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: active ? 2.5 : 2 })}
        <span className="text-sm">{label}</span>
        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full theme-bg"></div>}
      </Link>
    );
};
  

const formatForInput = (ts: number | null) => {
  if (!ts) return '';
  const d = new Date(ts);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(ts - offset).toISOString().slice(0, 16);
};

const formatTimeLong = (ms: number) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)));
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};
const formatTimeShort = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)));
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

// --- Shared Components ---

const EditEntryDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    entry: TimeEntry | null;
    clients: Client[];
    allEntries: TimeEntry[];
    onSave: (id: string, updates: Partial<TimeEntry>) => void;
    onDelete: (id: string) => void;
}> = ({ isOpen, onClose, entry, clients, allEntries, onSave, onDelete }) => {
    const [editDesc, setEditDesc] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [editClientId, setEditClientId] = useState('');
    const [editProjectId, setEditProjectId] = useState<string>('');
    const [editCategory, setEditCategory] = useState('');

    useEffect(() => {
        if (entry) {
            setEditDesc(entry.description);
            const startStr = formatForInput(entry.startTime);
            const endStr = formatForInput(entry.endTime);
            setEditStartDate(startStr ? startStr.split('T')[0] : '');
            setEditStartTime(startStr ? startStr.split('T')[1] : '');
            setEditEndDate(endStr ? endStr.split('T')[0] : '');
            setEditEndTime(endStr ? endStr.split('T')[1] : '');
            setEditClientId(entry.clientId);
            setEditProjectId(entry.projectId || '');
            setEditCategory(entry.category || '');
        }
    }, [entry]);

    if (!isOpen || !entry) return null;

    const selectedClient = clients.find(c => c.id === editClientId);
    const activeProjects = selectedClient?.projects?.filter(p => p.isActive) || [];
    const clientCategories = selectedClient?.categories || [];
    const categoryOptions = editCategory && !clientCategories.includes(editCategory)
        ? [...clientCategories, editCategory]
        : clientCategories;

    const handleStartDateChange = (val: string) => {
        setEditStartDate(val);
        // Sync end date to start date
        if (editEndDate) {
            setEditEndDate(val);
        }
    };

    const handleSave = () => {
        const startCombined = editStartDate && editStartTime ? `${editStartDate}T${editStartTime}` : '';
        const endCombined = editEndDate && editEndTime ? `${editEndDate}T${editEndTime}` : '';
        onSave(entry.id, {
            description: editDesc,
            clientId: editClientId,
            startTime: startCombined ? new Date(startCombined).getTime() : entry.startTime,
            endTime: endCombined ? new Date(endCombined).getTime() : null,
            projectId: editProjectId || undefined,
            category: editCategory || undefined,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-y-auto mx-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-800">履歴の編集</h3>
                    <button
                        onClick={() => {
                            if (confirm('この履歴を完全に削除しますか？')) {
                                onDelete(entry.id);
                                onClose();
                            }
                        }}
                        className="p-2 text-red-500 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>

                <div className="space-y-5 mb-8">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">クライアント</label>
                        <Select value={editClientId} onChange={e => { setEditClientId(e.target.value); setEditProjectId(''); setEditCategory(''); }} className="!rounded-xl border-slate-200 h-12">
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </Select>
                    </div>

                    {activeProjects.length > 0 && (
                        <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">案件</label>
                            <Select value={editProjectId} onChange={e => setEditProjectId(e.target.value)} className="!rounded-xl border-slate-200 h-12">
                                <option value="">案件なし（全般）</option>
                                {activeProjects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </Select>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">作業内容</label>
                        <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="!h-12" />
                    </div>

                    {categoryOptions.length > 0 && (
                        <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">カテゴリ</label>
                            <Select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="!rounded-xl border-slate-200 h-12">
                                <option value="">カテゴリなし</option>
                                {categoryOptions.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </Select>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">日付</label>
                        <Input type="date" value={editStartDate} onChange={e => handleStartDateChange(e.target.value)} className="!text-sm font-bold h-12" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">開始時刻</label>
                            <Input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} className="!text-sm font-bold h-12" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">終了時刻</label>
                            <Input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} className="!text-sm font-bold h-12" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button onClick={onClose} variant="secondary" className="flex-1 h-14 rounded-2xl">閉じる</Button>
                    <Button onClick={handleSave} className="flex-[2] theme-bg contrast-text border-none font-black h-14 rounded-2xl">保存する</Button>
                </div>
            </div>
        </div>
    );
};

// --- Page Components ---

const UsagePage: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in pb-20">
             <div className="mb-4 ml-1">
                 <h2 className="text-xl font-black text-slate-800">使い方ガイド</h2>
                 <p className="text-xs text-slate-500 font-bold mt-1">はじめての方はこの流れで進めましょう</p>
            </div>

            <div className="space-y-6">
                {/* Step 1 */}
                <section>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-7 h-7 rounded-full theme-bg contrast-text flex items-center justify-center font-black text-sm shadow-sm">1</div>
                        <h3 className="font-bold text-slate-700 text-sm">クライアントを登録</h3>
                    </div>
                    <Card className="!p-4 border-l-4 theme-border">
                        <div className="flex gap-3">
                            <div className="mt-0.5 text-slate-400 shrink-0"><Users size={20} /></div>
                            <div>
                                <p className="text-xs text-slate-600 mb-2">下メニューの<span className="font-bold text-slate-800">「管理」</span>から登録します。</p>
                                <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-500">
                                    <li><span className="font-bold text-slate-700">時給</span>を設定 → 売上を自動計算</li>
                                    <li><span className="font-bold text-slate-700">締日</span>を設定 → 報告書の期間指定が楽に</li>
                                    <li><span className="font-bold text-slate-700">カテゴリ</span>を追加 → 作業を分類できる</li>
                                </ul>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* Step 2 */}
                <section>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-7 h-7 rounded-full theme-bg contrast-text flex items-center justify-center font-black text-sm shadow-sm">2</div>
                        <h3 className="font-bold text-slate-700 text-sm">案件を登録（任意）</h3>
                    </div>
                    <Card className="!p-4 border-l-4 theme-border">
                        <div className="flex gap-3">
                            <div className="mt-0.5 text-slate-400 shrink-0"><Briefcase size={20} /></div>
                            <div>
                                <p className="text-xs text-slate-600 mb-2"><span className="font-bold text-slate-800">「管理」→「案件」</span>タブから登録します。</p>
                                <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-500">
                                    <li>クライアントに紐づけて案件を作成</li>
                                    <li><span className="font-bold text-slate-700">固定報酬</span>を設定 → 月次で売上管理</li>
                                    <li>案件選択時は自動で「固定」報酬に切替</li>
                                </ul>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* Step 3 */}
                <section>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-7 h-7 rounded-full theme-bg contrast-text flex items-center justify-center font-black text-sm shadow-sm">3</div>
                        <h3 className="font-bold text-slate-700 text-sm">作業時間を計測</h3>
                    </div>
                    <Card className="!p-4 border-l-4 theme-border">
                        <div className="flex gap-3">
                            <div className="mt-0.5 text-slate-400 shrink-0"><Clock size={20} /></div>
                            <div>
                                <p className="text-xs text-slate-600 mb-2"><span className="font-bold text-slate-800">「タイマー」</span>画面で作業を記録します。</p>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                                        <div className="text-xs text-slate-600">クライアント → 案件 → 内容を選んで<span className="font-bold">「作業を開始」</span></div>
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        長押しでクライアントの並び順を変更できます。よく使う作業内容は自動でプリセット保存されます。
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* Step 4 */}
                <section>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-7 h-7 rounded-full theme-bg contrast-text flex items-center justify-center font-black text-sm shadow-sm">4</div>
                        <h3 className="font-bold text-slate-700 text-sm">月次報酬を管理</h3>
                    </div>
                    <Card className="!p-4 border-l-4 theme-border">
                        <div className="flex gap-3">
                            <div className="mt-0.5 text-slate-400 shrink-0"><Coins size={20} /></div>
                            <div>
                                <p className="text-xs text-slate-600 mb-2"><span className="font-bold text-slate-800">「管理」→「案件」</span>タブ下部で月ごとにON/OFFします。</p>
                                <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-500">
                                    <li>トグルONでその月の売上に固定報酬を加算</li>
                                    <li>月額契約や単発案件にも対応</li>
                                </ul>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* Step 5 */}
                <section>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-7 h-7 rounded-full theme-bg contrast-text flex items-center justify-center font-black text-sm shadow-sm">5</div>
                        <h3 className="font-bold text-slate-700 text-sm">履歴を確認・修正</h3>
                    </div>
                    <Card className="!p-4 border-l-4 theme-border">
                        <div className="flex gap-3">
                            <div className="mt-0.5 text-slate-400 shrink-0"><History size={20} /></div>
                            <div>
                                <p className="text-xs text-slate-600 mb-2"><span className="font-bold text-slate-800">「履歴」</span>で日々の記録を確認できます。</p>
                                <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-500">
                                    <li>タップで時間・内容の修正が可能</li>
                                    <li>クライアント・案件・カテゴリでフィルタ</li>
                                    <li>月切替や日付範囲指定にも対応</li>
                                </ul>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* Step 6 */}
                <section>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-7 h-7 rounded-full theme-bg contrast-text flex items-center justify-center font-black text-sm shadow-sm">6</div>
                        <h3 className="font-bold text-slate-700 text-sm">報告書を作成</h3>
                    </div>
                    <Card className="!p-4 border-l-4 theme-border">
                        <div className="flex gap-3">
                            <div className="mt-0.5 text-slate-400 shrink-0"><FileText size={20} /></div>
                            <div>
                                <p className="text-xs text-slate-600 mb-2"><span className="font-bold text-slate-800">「報告書」</span>でPDFを生成・印刷します。</p>
                                <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-500">
                                    <li>「今月」「先月」ボタンで締日に合わせた期間指定</li>
                                    <li>同日の作業をまとめる、案件フィルタなどオプション多数</li>
                                    <li>CSV出力にも対応</li>
                                </ul>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* Tips */}
                <section>
                     <div className="flex items-center gap-2 mb-3 mt-4">
                        <Lightbulb size={18} className="text-yellow-500 fill-current" />
                        <h3 className="font-bold text-slate-700 text-sm">知っておくと便利</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         <Card className="!p-4 bg-slate-50">
                             <div className="font-bold text-xs mb-1 flex items-center gap-2 text-slate-700"><PictureInPicture2 size={14} /> フローティングタイマー</div>
                             <div className="text-[11px] text-slate-500 leading-relaxed">
                                 計測中は画面下部にバーが出現。PCではPiP小窓、スマホでは通知で経過時間を確認できます。
                             </div>
                         </Card>
                         <Card className="!p-4 bg-slate-50">
                             <div className="font-bold text-xs mb-1 flex items-center gap-2 text-slate-700"><Flame size={14} className="text-orange-400" /> タスクプリセット</div>
                             <div className="text-[11px] text-slate-500 leading-relaxed">
                                 入力した作業内容は自動保存。次回からワンタップで入力できます。
                             </div>
                         </Card>
                         <Card className="!p-4 bg-slate-50">
                             <div className="font-bold text-xs mb-1 flex items-center gap-2 text-slate-700"><BarChart2 size={14} /> データ分析</div>
                             <div className="text-[11px] text-slate-500 leading-relaxed">
                                 クライアント別の稼働時間・売上をグラフで確認できます。
                             </div>
                         </Card>
                         <Card className="!p-4 bg-slate-50">
                             <div className="font-bold text-xs mb-1 flex items-center gap-2 text-slate-700"><Cloud size={14} /> データ同期</div>
                             <div className="text-[11px] text-slate-500 leading-relaxed">
                                 Googleログインでデータをクラウド保存。別端末でもアクセスできます。
                             </div>
                         </Card>
                    </div>
                </section>
            </div>

            <div className="mt-8 text-center">
                 <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-full theme-bg contrast-text font-black text-sm shadow-md hover:shadow-lg transition-all active:scale-95">
                     さっそく使い始める <ArrowRight size={16} />
                 </Link>
            </div>
        </div>
    );
};

type ClientStat = { 
    name: string; 
    color: string;
    hours: number; 
    revenue: number; 
    count: number;
};

const AnalyticsPage: React.FC<{ state: AppState }> = ({ state }) => {
    const [displayMonth, setDisplayMonth] = useState(new Date());

    const handlePrevMonth = () => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1));
    const handleNextMonth = () => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1));

    const analysis = useMemo(() => {
        const yearMonth = `${displayMonth.getFullYear()}-${String(displayMonth.getMonth() + 1).padStart(2, '0')}`;
        const startOfMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1).getTime();
        const endOfMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0, 23, 59, 59).getTime();

        const monthlyEntries = state.entries.filter(e => e.startTime >= startOfMonth && e.startTime <= endOfMonth);

        const clientStats: {[key: string]: ClientStat} = {};
        const categoryStats: {[key: string]: { hours: number; count: number }} = {};

        // 時間計測ベースの集計
        monthlyEntries.forEach(e => {
            const client = state.clients.find(c => c.id === e.clientId);
            if (!client) return;

            if (!clientStats[e.clientId]) {
                clientStats[e.clientId] = {
                    name: client.name,
                    color: client.color,
                    hours: 0,
                    revenue: 0,
                    count: 0
                };
            }

            const hours = (e.endTime ? (e.endTime - e.startTime) : (Date.now() - e.startTime)) / 3600000;
            clientStats[e.clientId].hours += hours;
            clientStats[e.clientId].count += 1;

            // Revenue: client hourly rate
            const hourlyRate = client.defaultHourlyRate;
            if (hourlyRate) {
                clientStats[e.clientId].revenue += Math.floor(hours * hourlyRate);
            }

            // Category stats
            const cat = e.category || '未分類';
            if (!categoryStats[cat]) {
                categoryStats[cat] = { hours: 0, count: 0 };
            }
            categoryStats[cat].hours += hours;
            categoryStats[cat].count += 1;
        });

        // 月次固定報酬を加算（案件→クライアント逆引き）
        const allProjects = state.clients.flatMap(c => (c.projects || []).map(p => ({ ...p, client: c })));
        const monthlyFixedFees = state.monthlyFixedFees.filter(f => f.yearMonth === yearMonth);
        monthlyFixedFees.forEach(fee => {
            const projectInfo = allProjects.find(p => p.id === fee.projectId);
            if (!projectInfo) return;
            const client = projectInfo.client;

            if (!clientStats[client.id]) {
                clientStats[client.id] = {
                    name: client.name,
                    color: client.color,
                    hours: 0,
                    revenue: 0,
                    count: 0
                };
            }
            clientStats[client.id].revenue += fee.amount;
        });

        const totalHours = Object.values(clientStats).reduce((acc, c) => acc + c.hours, 0);
        const totalRevenue = Object.values(clientStats).reduce((acc, c) => acc + c.revenue, 0);

        const pieData = Object.values(clientStats).map(c => ({
            name: c.name,
            value: c.hours,
            color: c.color
        })).filter(d => d.value > 0);

        // Category pie data
        const CATEGORY_COLORS = ['#4A6FA5', '#6B8E23', '#CD853F', '#BC8F8F', '#708090', '#5F9EA0', '#A0522D', '#808000', '#4682B4', '#D2691E'];
        const categoryPieData = Object.entries(categoryStats)
            .map(([name, stat], i) => ({
                name,
                value: stat.hours,
                color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
            }))
            .filter(d => d.value > 0)
            .sort((a, b) => b.value - a.value);

        const dailyData = [];
        const daysInMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate();
        for(let i=1; i<=daysInMonth; i++) {
            const dayStart = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), i).getTime();
            const dayEnd = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), i+1).getTime();
            const dayHours = monthlyEntries.reduce((acc, e) => {
                if(e.startTime >= dayStart && e.startTime < dayEnd) {
                    return acc + ((e.endTime || Date.now()) - e.startTime)/3600000;
                }
                return acc;
            }, 0);
            dailyData.push({ day: i, hours: dayHours });
        }

        return { clientStats, categoryStats, totalHours, totalRevenue, pieData, categoryPieData, dailyData };
    }, [state.entries, state.clients, state.monthlyFixedFees, displayMonth]);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
             <div className="flex justify-between items-center mb-2">
                 <h2 className="text-lg font-black text-slate-800">データ分析・実績</h2>
                 <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                     <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft size={18} className="text-slate-500" /></button>
                     <span className="text-xs font-bold text-slate-800 px-3 min-w-[80px] text-center">
                         {displayMonth.getFullYear()}年{displayMonth.getMonth() + 1}月
                     </span>
                     <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight size={18} className="text-slate-500" /></button>
                 </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Card className="!p-4 bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col justify-between h-28">
                    <div className="flex items-center gap-2 opacity-80">
                        <TrendingUp size={16} />
                        <span className="text-xs font-bold">総稼働時間</span>
                    </div>
                    <div className="text-3xl font-black tracking-tighter">
                        {analysis.totalHours.toFixed(2)} <span className="text-sm opacity-60">h</span>
                    </div>
                </Card>
                <Card className="!p-4 theme-bg contrast-text flex flex-col justify-between h-28">
                    <div className="flex items-center gap-2 opacity-80">
                        <DollarSign size={16} />
                        <span className="text-xs font-bold">推定売上</span>
                    </div>
                    <div className="text-3xl font-black tracking-tighter">
                        <span className="text-sm opacity-60">¥</span> {analysis.totalRevenue.toLocaleString()}
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="!p-4 min-h-[300px]">
                    <div className="flex items-center gap-2 mb-4">
                        <PieChartIcon size={16} className="text-slate-400" />
                        <h3 className="text-xs font-black text-slate-700 uppercase">クライアント別 稼働割合</h3>
                    </div>
                    <div className="h-56 w-full flex items-center justify-center">
                        {analysis.pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analysis.pieData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {analysis.pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        iconType="circle" 
                                        iconSize={8}
                                        formatter={(value) => <span className="text-[10px] font-bold text-slate-600 ml-1">{value}</span>}
                                    />
                                    <RechartsTooltip 
                                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                        formatter={(value: number) => `${value.toFixed(2)} h`}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-slate-300 text-xs font-bold">データがありません</div>
                        )}
                    </div>
                </Card>

                <Card className="!p-4 min-h-[300px]">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity size={16} className="text-slate-400" />
                        <h3 className="text-xs font-black text-slate-700 uppercase">日次稼働推移</h3>
                    </div>
                    <div className="h-56 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analysis.dailyData}>
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} interval={4} />
                                <RechartsTooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                    formatter={(value: number) => [`${value.toFixed(2)} h`, '稼働']}
                                />
                                <Bar dataKey="hours" fill="#cbd5e1" radius={[2, 2, 2, 2]} barSize={4} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* カテゴリ別 稼働割合 */}
            {analysis.categoryPieData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="!p-4 min-h-[300px]">
                        <div className="flex items-center gap-2 mb-4">
                            <PieChartIcon size={16} className="text-slate-400" />
                            <h3 className="text-xs font-black text-slate-700 uppercase">カテゴリ別 時間割合</h3>
                        </div>
                        <div className="h-56 w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analysis.categoryPieData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {analysis.categoryPieData.map((entry, index) => (
                                            <Cell key={`cat-cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        iconSize={8}
                                        formatter={(value) => <span className="text-[10px] font-bold text-slate-600 ml-1">{value}</span>}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                        formatter={(value: number) => `${value.toFixed(2)} h`}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="!p-4 min-h-[300px]">
                        <div className="flex items-center gap-2 mb-4">
                            <LayoutList size={16} className="text-slate-400" />
                            <h3 className="text-xs font-black text-slate-700 uppercase">カテゴリ別 時間一覧</h3>
                        </div>
                        <div className="space-y-2">
                            {analysis.categoryPieData.map((cat) => (
                                <div key={cat.name} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: cat.color}}></div>
                                        <span className="text-xs font-bold text-slate-700">{cat.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-xs font-bold text-slate-600">{cat.value.toFixed(2)} h</span>
                                        <span className="text-[10px] font-bold text-slate-400 min-w-[40px] text-right">
                                            {analysis.totalHours > 0 ? ((cat.value / analysis.totalHours) * 100).toFixed(1) : 0}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                    <LayoutList size={16} className="text-slate-400" />
                    <h3 className="text-xs font-black text-slate-700 uppercase">月次実績表</h3>
                </div>
                {/* Desktop: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                <th className="p-4 rounded-tl-lg">クライアント</th>
                                <th className="p-4 text-right">稼働時間</th>
                                <th className="p-4 text-right">推定売上</th>
                                <th className="p-4 text-right">シェア</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {Object.values(analysis.clientStats).sort((a: ClientStat, b: ClientStat) => b.hours - a.hours).map((client: ClientStat) => (
                                <tr key={client.name} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: client.color}}></div>
                                            <span className="text-xs font-bold text-slate-700">{client.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-mono text-xs font-bold text-slate-600">
                                        {client.hours.toFixed(2)} h
                                    </td>
                                    <td className="p-4 text-right font-mono text-xs font-bold text-slate-800">
                                        ¥{client.revenue.toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right text-[10px] font-bold text-slate-400">
                                        {analysis.totalHours > 0 ? ((client.hours / analysis.totalHours) * 100).toFixed(1) : 0}%
                                    </td>
                                </tr>
                            ))}
                            {Object.keys(analysis.clientStats).length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-xs text-slate-400 font-bold">データがありません</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t-2 border-slate-100">
                            <tr>
                                <td className="p-4 text-xs font-black text-slate-700">合計</td>
                                <td className="p-4 text-right font-mono text-xs font-black text-slate-800">{analysis.totalHours.toFixed(2)} h</td>
                                <td className="p-4 text-right font-mono text-xs font-black text-slate-800">¥{analysis.totalRevenue.toLocaleString()}</td>
                                <td className="p-4"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                {/* Mobile: Card list */}
                <div className="md:hidden divide-y divide-slate-100">
                    {Object.values(analysis.clientStats).sort((a: ClientStat, b: ClientStat) => b.hours - a.hours).map((client: ClientStat) => (
                        <div key={client.name} className="px-4 py-3">
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: client.color}}></div>
                                <span className="text-xs font-bold text-slate-700 flex-1 truncate">{client.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 shrink-0">{analysis.totalHours > 0 ? ((client.hours / analysis.totalHours) * 100).toFixed(1) : 0}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-mono text-xs font-bold text-slate-600">{client.hours.toFixed(2)} h</span>
                                <span className="font-mono text-xs font-bold text-slate-800">¥{client.revenue.toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                    {Object.keys(analysis.clientStats).length === 0 && (
                        <div className="p-8 text-center text-xs text-slate-400 font-bold">データがありません</div>
                    )}
                    <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
                        <span className="text-xs font-black text-slate-700">合計</span>
                        <div className="flex gap-4">
                            <span className="font-mono text-xs font-black text-slate-800">{analysis.totalHours.toFixed(2)} h</span>
                            <span className="font-mono text-xs font-black text-slate-800">¥{analysis.totalRevenue.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LogsPage: React.FC<{ state: AppState; dispatch: (a: any) => void }> = ({ state, dispatch }) => {
  const [filterClientId, setFilterClientId] = useState('all');
  const [filterProjectId, setFilterProjectId] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const isDateFilterActive = filterStartDate !== '' || filterEndDate !== '';

  const handlePrevMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1));
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const handleNextMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1));
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // Reset project filter when client changes
  useEffect(() => {
    setFilterProjectId('all');
  }, [filterClientId]);

  const selectedFilterClient = state.clients.find(c => c.id === filterClientId);
  const filterClientProjects = selectedFilterClient?.projects?.filter(p => p.isActive) || [];

  // Get unique categories from all entries for filter
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    state.entries.forEach(e => { if (e.category) cats.add(e.category); });
    return Array.from(cats).sort();
  }, [state.entries]);

  const entriesByDate = useMemo(() => {
    let list = [...state.entries];
    if (isDateFilterActive) {
      if (filterStartDate) {
        const start = new Date(filterStartDate).getTime();
        list = list.filter(e => e.startTime >= start);
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate + 'T23:59:59').getTime();
        list = list.filter(e => e.startTime <= end);
      }
    } else {
      const startOfMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1).getTime();
      const endOfMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0, 23, 59, 59).getTime();
      list = list.filter(e => e.startTime >= startOfMonth && e.startTime <= endOfMonth);
    }
    if (filterClientId !== 'all') {
      list = list.filter(e => e.clientId === filterClientId);
    }
    if (filterProjectId !== 'all') {
      list = list.filter(e => e.projectId === filterProjectId);
    }
    if (filterCategory !== 'all') {
      list = list.filter(e => (e.category || '') === filterCategory);
    }
    list.sort((a, b) => b.startTime - a.startTime);
    const groups: { [key: string]: { entries: TimeEntry[], totalDuration: number } } = {};
    list.forEach(e => {
      const dateKey = new Date(e.startTime).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
      if (!groups[dateKey]) groups[dateKey] = { entries: [], totalDuration: 0 };
      groups[dateKey].entries.push(e);
      if (e.endTime) {
          groups[dateKey].totalDuration += (e.endTime - e.startTime);
      }
    });
    return groups;
  }, [state.entries, filterClientId, filterProjectId, filterCategory, displayMonth, filterStartDate, filterEndDate, isDateFilterActive]);

  return (
    <div className="space-y-4 animate-fade-in pb-20">
      <div className="flex flex-col gap-4 px-1">
        <div className="flex justify-between items-center">
             <h2 className="text-lg font-black text-slate-800">稼働履歴</h2>
             <div className={`flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm transition-opacity ${isDateFilterActive ? 'opacity-40' : ''}`}>
                 <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft size={18} className="text-slate-500" /></button>
                 <span className="text-xs font-bold text-slate-800 px-3 min-w-[80px] text-center">
                     {displayMonth.getFullYear()}年{displayMonth.getMonth() + 1}月
                 </span>
                 <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight size={18} className="text-slate-500" /></button>
             </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white rounded-xl border border-slate-200 px-3 py-1.5 shadow-sm min-w-0">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="text-xs font-bold text-slate-700 outline-none bg-transparent min-w-0 flex-1" />
                <span className="text-xs text-slate-400 shrink-0">〜</span>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="text-xs font-bold text-slate-700 outline-none bg-transparent min-w-0 flex-1" />
            </div>
            {isDateFilterActive && (
                <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-500 transition-all">
                    <X size={12} />
                    クリア
                </button>
            )}
        </div>

        <div className="flex items-center gap-2 flex-wrap pb-1">
           <button
             onClick={() => setFilterClientId('all')}
             className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${filterClientId === 'all' ? 'bg-slate-800 text-white border-transparent' : 'bg-white border-slate-200 text-slate-500'}`}
           >
             すべて
           </button>
           {state.clients.map(c => (
             <button
               key={c.id}
               onClick={() => setFilterClientId(c.id)}
               className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 ${filterClientId === c.id ? 'theme-bg contrast-text border-transparent' : 'bg-white border-slate-200 text-slate-500'}`}
             >
               <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50"></div>
               {c.name}
             </button>
           ))}
        </div>

        {/* Project filter chips */}
        {filterClientId !== 'all' && filterClientProjects.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pb-1">
            <span className="text-[10px] font-bold text-slate-400 shrink-0">案件:</span>
            <button onClick={() => setFilterProjectId('all')} className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${filterProjectId === 'all' ? 'bg-slate-700 text-white border-transparent' : 'bg-white border-slate-200 text-slate-500'}`}>すべて</button>
            {filterClientProjects.map(p => (
              <button key={p.id} onClick={() => setFilterProjectId(p.id)} className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${filterProjectId === p.id ? 'bg-slate-700 text-white border-transparent' : 'bg-white border-slate-200 text-slate-500'}`}>{p.name}</button>
            ))}
          </div>
        )}

        {/* Category filter chips */}
        {allCategories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pb-1">
            <span className="text-[10px] font-bold text-slate-400 shrink-0">カテゴリ:</span>
            <button onClick={() => setFilterCategory('all')} className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${filterCategory === 'all' ? 'bg-slate-700 text-white border-transparent' : 'bg-white border-slate-200 text-slate-500'}`}>すべて</button>
            {allCategories.map(cat => (
              <button key={cat} onClick={() => setFilterCategory(cat)} className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${filterCategory === cat ? 'bg-slate-700 text-white border-transparent' : 'bg-white border-slate-200 text-slate-500'}`}>{cat}</button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200 whitespace-nowrap">日付</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200 whitespace-nowrap">開始</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200 whitespace-nowrap">終了</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200 whitespace-nowrap">時間(h)</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200 whitespace-nowrap">クライアント</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200 whitespace-nowrap">案件</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200 whitespace-nowrap">カテゴリ</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200 whitespace-nowrap">種別</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-slate-500">内容</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(entriesByDate).map(dateKey => {
                const { entries, totalDuration } = entriesByDate[dateKey];
                const totalHours = totalDuration / 3600000;
                return (
                  <React.Fragment key={dateKey}>
                    {entries.map((e, i) => {
                      const client = state.clients.find(c => c.id === e.clientId);
                      const project = e.projectId ? client?.projects?.find(p => p.id === e.projectId) : null;
                      const duration = e.endTime ? (e.endTime - e.startTime) / 3600000 : 0;
                      const dateStr = new Date(e.startTime).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', weekday: 'short' });
                      return (
                        <tr
                          key={e.id}
                          onClick={() => setEditingEntry(e)}
                          className="border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-2 text-xs font-medium text-slate-700 border-r border-slate-100 whitespace-nowrap">{i === 0 ? dateStr : ''}</td>
                          <td className="px-3 py-2 text-xs font-mono text-slate-600 border-r border-slate-100 whitespace-nowrap">{new Date(e.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                          <td className="px-3 py-2 text-xs font-mono text-slate-600 border-r border-slate-100 whitespace-nowrap">{e.endTime ? new Date(e.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : <span className="text-green-500 font-bold">稼働中</span>}</td>
                          <td className="px-3 py-2 text-xs font-bold text-slate-800 border-r border-slate-100 text-right whitespace-nowrap">{e.endTime ? duration.toFixed(2) : '-'}</td>
                          <td className="px-3 py-2 border-r border-slate-100 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: client?.color || '#ccc' }}></div>
                              <span className="text-xs text-slate-700">{client?.name || '不明'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500 border-r border-slate-100 whitespace-nowrap">{project?.name || '-'}</td>
                          <td className="px-3 py-2 text-xs text-slate-500 border-r border-slate-100 whitespace-nowrap">{e.category || '-'}</td>
                          <td className="px-3 py-2 text-xs text-slate-500 border-r border-slate-100 whitespace-nowrap">{e.rateType === 'fixed' ? '固定' : '時給'}</td>
                          <td className="px-3 py-2 text-xs text-slate-700 max-w-[200px] truncate">{e.description || '(未設定)'}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <td className="px-3 py-1.5 text-xs font-bold text-slate-500 border-r border-slate-100" colSpan={3}>小計</td>
                      <td className="px-3 py-1.5 text-xs font-black text-slate-800 border-r border-slate-100 text-right">{totalHours.toFixed(2)}</td>
                      <td colSpan={5}></td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {Object.keys(entriesByDate).length === 0 && (
          <div className="text-center py-10 text-slate-400 text-xs">
            {isDateFilterActive
              ? '指定された期間の履歴はありません'
              : `${displayMonth.getFullYear()}年${displayMonth.getMonth() + 1}月の履歴はありません`
            }
          </div>
        )}
      </div>

      {/* Mobile: Card view */}
      <div className="md:hidden space-y-3">
        {Object.keys(entriesByDate).length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            {isDateFilterActive
              ? '指定された期間の履歴はありません'
              : `${displayMonth.getFullYear()}年${displayMonth.getMonth() + 1}月の履歴はありません`
            }
          </div>
        ) : (
          Object.keys(entriesByDate).map(dateKey => {
            const { entries, totalDuration } = entriesByDate[dateKey];
            const totalHours = totalDuration / 3600000;
            const dateStr = new Date(entries[0].startTime).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', weekday: 'short' });
            return (
              <div key={dateKey} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-black text-slate-700">{dateStr}</span>
                  <span className="text-xs font-bold text-slate-500">{totalHours.toFixed(2)} h</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {entries.map(e => {
                    const client = state.clients.find(c => c.id === e.clientId);
                    const project = e.projectId ? client?.projects?.find(p => p.id === e.projectId) : null;
                    const duration = e.endTime ? (e.endTime - e.startTime) / 3600000 : 0;
                    return (
                      <div key={e.id} onClick={() => setEditingEntry(e)} className="px-4 py-3 active:bg-slate-50 cursor-pointer">
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: client?.color || '#ccc' }}></div>
                            <span className="text-xs font-bold text-slate-700 truncate">{client?.name || '不明'}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-800 shrink-0 ml-2">{e.endTime ? `${duration.toFixed(2)} h` : <span className="text-green-500">稼働中</span>}</span>
                        </div>
                        <div className="text-xs text-slate-500 mb-1">
                          <span className="font-mono">{new Date(e.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                          <span className="mx-1">〜</span>
                          <span className="font-mono">{e.endTime ? new Date(e.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</span>
                          {project && <span className="ml-2 text-slate-400">・{project.name}</span>}
                          {e.category && <span className="ml-1 text-slate-400">・{e.category}</span>}
                        </div>
                        {e.description && <div className="text-xs text-slate-600 truncate">{e.description}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <EditEntryDrawer
         isOpen={!!editingEntry}
         onClose={() => setEditingEntry(null)}
         entry={editingEntry}
         clients={state.clients}
         allEntries={state.entries}
         onSave={(id, updates) => dispatch({type: 'UPDATE_ENTRY', payload: {id, ...updates}})}
         onDelete={(id) => dispatch({type: 'DELETE_ENTRY', payload: id})}
      />
    </div>
  );
};

const ReportPage: React.FC<{ state: AppState; dispatch: (a: any) => void }> = ({ state, dispatch }) => {
  const { user: reportUser } = useAuth();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  
  const [selectedClientId, setSelectedClientId] = useState(() => state.clients.length > 0 ? state.clients[0].id : '');
  const [reportTitle, setReportTitle] = useState('作業報告書');
  const [reportBusinessName, setReportBusinessName] = useState('');
  const googleName = reportUser?.user_metadata?.full_name || reportUser?.user_metadata?.name || '';
  const [customUserName, setCustomUserName] = useState(
    (state.settings.userName && state.settings.userName !== 'Freelancer') ? state.settings.userName : googleName || state.settings.userName || 'Logmee User'
  );
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [groupByDate, setGroupByDate] = useState(false);
  const [showTimeRange, setShowTimeRange] = useState(true);
  const [showDuration, setShowDuration] = useState(true);
  const [showProject, setShowProject] = useState(true);
  const [showCategory, setShowCategory] = useState(true);
  const [showTotalHoursOnly, setShowTotalHoursOnly] = useState(true);
  const [showRevenue, setShowRevenue] = useState(true);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [includeNoProject, setIncludeNoProject] = useState(true);

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  useEffect(() => {
      const gName = reportUser?.user_metadata?.full_name || reportUser?.user_metadata?.name || '';
      setCustomUserName(
        (state.settings.userName && state.settings.userName !== 'Freelancer') ? state.settings.userName : gName || state.settings.userName || 'Logmee User'
      );
  }, [state.settings.userName, reportUser]);

  useEffect(() => {
      if (selectedClientId === 'all' || selectedClientId === '') {
          if (state.clients.length > 0) setSelectedClientId(state.clients[0].id);
      } else if (state.clients.length > 0 && !state.clients.find(c => c.id === selectedClientId)) {
          setSelectedClientId(state.clients[0].id);
      }
  }, [state.clients, selectedClientId]);

  // クライアント変更時に案件フィルタをリセット（全選択）
  useEffect(() => {
      const client = state.clients.find(c => c.id === selectedClientId);
      setSelectedProjectIds((client?.projects || []).map(p => p.id));
      setIncludeNoProject(true);
  }, [selectedClientId, state.clients]);

  const handleSetDateRange = (type: 'thisMonth' | 'lastMonth') => {
      const today = new Date();
      let sDate = new Date();
      let eDate = new Date();
      const client = state.clients.find(c => c.id === selectedClientId);
      const closingDay = (client && client.closingDate) ? client.closingDate : 99;
      const currentDay = today.getDate();
      let targetYear = today.getFullYear();
      let targetMonth = today.getMonth();

     if (closingDay === 99) {
         if (type === 'thisMonth') {
             sDate = new Date(targetYear, targetMonth, 1);
             eDate = new Date(targetYear, targetMonth + 1, 0);
         } else {
             sDate = new Date(targetYear, targetMonth - 1, 1);
             eDate = new Date(targetYear, targetMonth, 0);
         }
     } else {
         if (type === 'thisMonth') {
             if (currentDay <= closingDay) {
                 sDate = new Date(targetYear, targetMonth - 1, closingDay + 1);
                 eDate = new Date(targetYear, targetMonth, closingDay);
             } else {
                 sDate = new Date(targetYear, targetMonth - 1, closingDay + 1);
                 eDate = new Date(targetYear, targetMonth + 1, closingDay);
             }
         } else {
             if (currentDay <= closingDay) {
                 sDate = new Date(targetYear, targetMonth - 2, closingDay + 1);
                 eDate = new Date(targetYear, targetMonth - 1, closingDay);
             } else {
                 sDate = new Date(targetYear, targetMonth - 1, closingDay + 1);
                 eDate = new Date(targetYear, targetMonth, closingDay);
             }
         }
     }
      setStartDate(formatForInput(sDate.getTime()).slice(0, 10));
      setEndDate(formatForInput(eDate.getTime()).slice(0, 10));
  };

  const filteredEntriesRaw = useMemo(() => {
    const sDate = new Date(startDate);
    const eDate = new Date(endDate + 'T23:59:59');
    return state.entries.filter(entry => {
        if (!entry.endTime) return false;
        const entryDate = new Date(entry.startTime);
        const matchesClient = entry.clientId === selectedClientId;
        const inRange = entryDate >= sDate && entryDate <= eDate;
        if (!matchesClient || !inRange) return false;
        // 案件フィルタ
        if (entry.projectId) {
            return selectedProjectIds.includes(entry.projectId);
        } else {
            return includeNoProject;
        }
    }).sort((a,b) => a.startTime - b.startTime);
  }, [state.entries, startDate, endDate, selectedClientId, selectedProjectIds, includeNoProject]);

  const handlePreviewReport = () => {
    const client = state.clients.find(c => c.id === selectedClientId);
    let processedEntries = filteredEntriesRaw.map(e => {
        const proj = e.projectId ? client?.projects?.find(p => p.id === e.projectId) : null;
        return { ...e, projectName: proj?.name || '' };
    });
    if (groupByDate) {
        const groups: {[key: string]: any} = {};
        processedEntries.forEach(e => {
            const dateKey = new Date(e.startTime).toLocaleDateString('ja-JP');
            if (!groups[dateKey]) {
                groups[dateKey] = {
                    ...e,
                    rawDescriptions: [e.description],
                    duration: (e.endTime! - e.startTime),
                    count: 1
                };
            } else {
                groups[dateKey].duration += (e.endTime! - e.startTime);
                groups[dateKey].rawDescriptions.push(e.description);
                groups[dateKey].count += 1;
            }
        });
        processedEntries = Object.values(groups).map((g: any) => ({
            ...g,
            description: Array.from(new Set(g.rawDescriptions.filter(Boolean))).join(' / ') || '作業一式',
        })).sort((a: any, b: any) => a.startTime - b.startTime);
    }
    const totalHours = processedEntries.reduce((acc, curr) => acc + (groupByDate ? (curr.duration / 3600000) : ((curr.endTime! - curr.startTime) / 3600000)), 0);

    // 期間内の月次固定報酬を取得
    const sDateObj = new Date(startDate);
    const eDateObj = new Date(endDate);
    const monthsInRange: string[] = [];
    let currentDate = new Date(sDateObj.getFullYear(), sDateObj.getMonth(), 1);
    while (currentDate <= eDateObj) {
        const ym = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        monthsInRange.push(ym);
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    const fixedFeeForPeriod = state.monthlyFixedFees
        .filter(f => {
            const proj = client?.projects?.find((p: Project) => p.id === f.projectId);
            return proj && proj.clientId === selectedClientId && monthsInRange.includes(f.yearMonth);
        })
        .reduce((sum, f) => sum + f.amount, 0);

    // 時給ベースの売上計算（クライアントの時給のみ使用）
    let hourlyRevenue = 0;
    const rate = client?.defaultHourlyRate || 0;
    processedEntries.forEach(pe => {
        const hrs = groupByDate ? ((pe as any).duration / 3600000) : ((pe.endTime! - pe.startTime) / 3600000);
        hourlyRevenue += Math.floor(hrs * rate);
    });

    setPreviewData({
        clientName: client?.name || 'クライアント',
        periodStart: startDate,
        periodEnd: endDate,
        count: processedEntries.length,
        totalHours,
        entries: processedEntries,
        hourlyRate: client?.defaultHourlyRate || 0,
        hourlyRevenue,
        fixedFee: fixedFeeForPeriod,
        totalRevenue: hourlyRevenue + fixedFeeForPeriod,
        options: {
            title: reportTitle,
            businessName: reportBusinessName,
            userName: customUserName,
            issueDate: issueDate,
            groupByDate,
            showTimeRange,
            showDuration,
            showProject,
            showCategory,
            showTotalHoursOnly,
            showRevenue
        }
    });
    setShowPreview(true);
  };

  const handleDownloadPDF = () => {
     const printWindow = window.open('', '_blank');
     if (!printWindow) {
         alert('ポップアップがブロックされました。ダウンロードを許可してください。');
         return;
     }
     const content = document.getElementById('printable-content');
     if (!content) return;
     const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <title>${previewData?.options?.title || 'Report'}</title>
    <style>
       @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap');
       body { background: white; margin: 0; padding: 20px; font-family: "Noto Sans JP", sans-serif; color: #000; font-size: 10pt; }
       .font-bold { font-weight: 700; }
       .text-right { text-align: right; }
       .text-center { text-align: center; }
       .flex { display: flex; }
       .justify-between { justify-content: space-between; }
       .items-end { align-items: flex-end; }
       .items-center { align-items: center; }
       .w-full { width: 100%; }
       .mb-1 { margin-bottom: 0.25rem; }
       .mb-2 { margin-bottom: 0.5rem; }
       .mb-4 { margin-bottom: 1rem; }
       .mb-8 { margin-bottom: 2rem; }
       .pb-2 { padding-bottom: 0.5rem; }
       .pb-4 { padding-bottom: 1rem; }
       .mt-2 { margin-top: 0.5rem; }
       .mt-8 { margin-top: 2rem; }
       .border-b { border-bottom: 1px solid #e5e7eb; }
       .border-b-2 { border-bottom: 2px solid #000; }
       .border-black { border-color: #000; }
       .text-2xl { font-size: 1.5rem; line-height: 2rem; }
       .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
       .text-sm { font-size: 0.875rem; }
       .text-xs { font-size: 0.75rem; }
       .text-gray-500 { color: #6b7280; }
       .bg-gray-50 { background-color: #f9fafb; }
       .p-4 { padding: 1rem; }
       .rounded-lg { border-radius: 0.5rem; }
       .border { border: 1px solid #e5e7eb; }
       .table-row { display: flex; padding: 6px 0; border-bottom: 1px dashed #ddd; break-inside: avoid; }
       .table-header { display: flex; border-bottom: 1px solid #aaa; padding-bottom: 4px; font-weight: bold; font-size: 9pt; color: #555; text-transform: uppercase; }
       .col-date { width: 100px; flex-shrink: 0; font-family: monospace; }
       .col-time { width: 90px; flex-shrink: 0; font-family: monospace; font-size: 8pt; color: #555; }
       .col-desc { flex: 1; padding: 0 8px; }
       .col-dur { width: 60px; text-align: right; font-family: monospace; font-weight: bold; }
       .no-print { display: none; }
       @media print { @page { margin: 15mm; } body { padding: 0; } .no-print { display: none !important; } }
    </style>
  </head>
  <body>
    ${content.innerHTML}
  </body>
</html>`;
     printWindow.document.write(htmlContent.replace('</body>', '<script>setTimeout(() => { window.print(); }, 500);<\/script></body>'));
     printWindow.document.close();

     // Save report snapshot
     const savedReport: SavedReport = {
       id: `sr_${Date.now()}`,
       clientId: selectedClientId,
       title: previewData?.options?.title || reportTitle,
       periodStart: startDate,
       periodEnd: endDate,
       createdAt: Date.now(),
       htmlContent
     };
     dispatch({ type: 'ADD_SAVED_REPORT', payload: savedReport });
  };

  const handleExportCSV = () => {
    exportToCSV(state, new Date(startDate), new Date(endDate + 'T23:59:59'));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <h2 className="text-lg font-black text-slate-800 ml-1">報告書作成</h2>
      <Card className="!rounded-3xl shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label className="text-[10px] font-black text-slate-400 ml-1 mb-2 block uppercase tracking-widest">対象期間</label>
                  <div className="flex items-center gap-2 mb-2">
                      <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="!text-xs font-bold" />
                      <span className="text-slate-300">~</span>
                      <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="!text-xs font-bold" />
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => handleSetDateRange('thisMonth')} className="px-3 py-1.5 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600 hover:bg-slate-200">今月</button>
                      <button onClick={() => handleSetDateRange('lastMonth')} className="px-3 py-1.5 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600 hover:bg-slate-200">先月</button>
                  </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-1 mb-2 block uppercase tracking-widest">対象クライアント</label>
                <Select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="!rounded-xl border-slate-200">
                    {state.clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    {state.clients.length === 0 && <option value="" disabled>クライアントがいません</option>}
                </Select>
              </div>
          </div>
          {(() => {
              const client = state.clients.find(c => c.id === selectedClientId);
              const projects = client?.projects || [];
              if (projects.length === 0) return null;
              const allSelected = selectedProjectIds.length === projects.length && includeNoProject;
              return (
                  <div className="border-t border-slate-100 pt-4">
                      <label className="text-[10px] font-black text-slate-400 ml-1 mb-3 block uppercase tracking-widest flex items-center gap-2">
                          <Briefcase size={12}/> 対象案件
                      </label>
                      <div className="bg-slate-50 p-3 rounded-xl space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${allSelected ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300'}`}>
                                  {allSelected && <Check size={10} className="text-white" />}
                              </div>
                              <input type="checkbox" className="hidden" checked={allSelected} onChange={() => {
                                  if (allSelected) {
                                      setSelectedProjectIds([]);
                                      setIncludeNoProject(false);
                                  } else {
                                      setSelectedProjectIds(projects.map(p => p.id));
                                      setIncludeNoProject(true);
                                  }
                              }} />
                              <span className="text-xs font-bold text-slate-700">すべて選択</span>
                          </label>
                          <div className="border-t border-slate-200 pt-2 space-y-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${includeNoProject ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300'}`}>
                                      {includeNoProject && <Check size={10} className="text-white" />}
                                  </div>
                                  <input type="checkbox" className="hidden" checked={includeNoProject} onChange={e => setIncludeNoProject(e.target.checked)} />
                                  <span className="text-xs font-bold text-slate-500">案件なし（全般）</span>
                              </label>
                              {projects.map(p => {
                                  const checked = selectedProjectIds.includes(p.id);
                                  return (
                                      <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300'}`}>
                                              {checked && <Check size={10} className="text-white" />}
                                          </div>
                                          <input type="checkbox" className="hidden" checked={checked} onChange={() => {
                                              setSelectedProjectIds(prev => checked ? prev.filter(id => id !== p.id) : [...prev, p.id]);
                                          }} />
                                          <span className="text-xs font-bold text-slate-700">{p.name}</span>
                                      </label>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              );
          })()}
          <div className="border-t border-slate-100 pt-4">
             <label className="text-[10px] font-black text-slate-400 ml-1 mb-3 block uppercase tracking-widest flex items-center gap-2">
                 <FileText size={12}/> 書類設定
             </label>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1 block">タイトル</label>
                    <Input value={reportTitle} onChange={e => setReportTitle(e.target.value)} placeholder="例: 作業報告書" />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1 block">発行者名</label>
                    <Input value={customUserName} onChange={e => setCustomUserName(e.target.value)} placeholder="氏名を入力" />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1 block">報告日</label>
                    <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="!text-xs font-bold" />
                 </div>
             </div>
             <div className="mb-4">
                <label className="text-[10px] font-bold text-slate-400 mb-1 block">業務名・件名 (任意)</label>
                <Input value={reportBusinessName} onChange={e => setReportBusinessName(e.target.value)} placeholder="例: 〇〇開発案件、事務サポート業務" />
             </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
             <label className="text-[10px] font-black text-slate-400 ml-1 mb-3 block uppercase tracking-widest flex items-center gap-2">
                 <LayoutList size={12}/> 明細オプション
             </label>
             <div className="space-y-3">
                 <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${groupByDate ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            <Calendar size={16} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-700">同日の作業をまとめる</div>
                            <div className="text-[9px] text-slate-400">同じ日の明細を1行に合算します</div>
                        </div>
                    </div>
                    <button onClick={() => setGroupByDate(!groupByDate)} className={`w-10 h-6 rounded-full relative transition-colors ${groupByDate ? 'bg-slate-800' : 'bg-slate-200'}`}>
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${groupByDate ? 'left-5' : 'left-1'}`}></div>
                    </button>
                 </div>
                 <div className="bg-slate-50 p-3 rounded-xl">
                     <div className="text-[10px] font-bold text-slate-400 mb-2">日報に表示する項目</div>
                     <div className="grid grid-cols-2 gap-2">
                         <label className="flex items-center gap-2 cursor-pointer">
                             <div className={`w-4 h-4 rounded border flex items-center justify-center ${showTimeRange ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300'}`}>
                                 {showTimeRange && <Check size={10} className="text-white" />}
                             </div>
                             <input type="checkbox" className="hidden" checked={showTimeRange} onChange={e => setShowTimeRange(e.target.checked)} />
                             <span className="text-xs font-bold text-slate-700">開始・終了時刻</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                             <div className={`w-4 h-4 rounded border flex items-center justify-center ${showDuration ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300'}`}>
                                 {showDuration && <Check size={10} className="text-white" />}
                             </div>
                             <input type="checkbox" className="hidden" checked={showDuration} onChange={e => setShowDuration(e.target.checked)} />
                             <span className="text-xs font-bold text-slate-700">所要時間</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                             <div className={`w-4 h-4 rounded border flex items-center justify-center ${showProject ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300'}`}>
                                 {showProject && <Check size={10} className="text-white" />}
                             </div>
                             <input type="checkbox" className="hidden" checked={showProject} onChange={e => setShowProject(e.target.checked)} />
                             <span className="text-xs font-bold text-slate-700">案件</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                             <div className={`w-4 h-4 rounded border flex items-center justify-center ${showCategory ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300'}`}>
                                 {showCategory && <Check size={10} className="text-white" />}
                             </div>
                             <input type="checkbox" className="hidden" checked={showCategory} onChange={e => setShowCategory(e.target.checked)} />
                             <span className="text-xs font-bold text-slate-700">カテゴリ</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                             <div className={`w-4 h-4 rounded border flex items-center justify-center ${showTotalHoursOnly ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300'}`}>
                                 {showTotalHoursOnly && <Check size={10} className="text-white" />}
                             </div>
                             <input type="checkbox" className="hidden" checked={showTotalHoursOnly} onChange={e => setShowTotalHoursOnly(e.target.checked)} />
                             <span className="text-xs font-bold text-slate-700">合計時間</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                             <div className={`w-4 h-4 rounded border flex items-center justify-center ${showRevenue ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300'}`}>
                                 {showRevenue && <Check size={10} className="text-white" />}
                             </div>
                             <input type="checkbox" className="hidden" checked={showRevenue} onChange={e => setShowRevenue(e.target.checked)} />
                             <span className="text-xs font-bold text-slate-700">金額</span>
                         </label>
                     </div>
                 </div>
             </div>
          </div>
          <div className="pt-2 space-y-3">
              <Button onClick={handlePreviewReport} disabled={!selectedClientId} className="w-full h-12 rounded-2xl theme-bg contrast-text border-none font-black">
                  <Eye size={18} /> プレビューしてPDF作成
              </Button>
              <Button onClick={handleExportCSV} variant="secondary" className="w-full h-12 rounded-2xl">
                  <Download size={18} /> CSVデータ出力
              </Button>
          </div>
      </Card>
      <div className="mt-8">
          <h3 className="text-xs font-black text-slate-400 ml-1 mb-3 uppercase tracking-widest">対象期間の作業一覧 (タップして編集)</h3>
          {/* Desktop: Table view */}
          <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200 whitespace-nowrap">日付</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200 whitespace-nowrap">開始</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200 whitespace-nowrap">終了</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200 whitespace-nowrap">時間(h)</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200 whitespace-nowrap">案件</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200 whitespace-nowrap">カテゴリ</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-slate-500">内容</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntriesRaw.length > 0 ? (
                    (() => {
                      const reportClient = state.clients.find(c => c.id === selectedClientId);
                      let lastDate = '';
                      return filteredEntriesRaw.map(e => {
                        const project = e.projectId ? reportClient?.projects?.find(p => p.id === e.projectId) : null;
                        const duration = e.endTime ? (e.endTime - e.startTime) / 3600000 : 0;
                        const dateStr = new Date(e.startTime).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', weekday: 'short' });
                        const showDate = dateStr !== lastDate;
                        lastDate = dateStr;
                        return (
                          <tr
                            key={e.id}
                            onClick={() => setEditingEntry(e)}
                            className="border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer transition-colors"
                          >
                            <td className="px-3 py-2 text-xs font-medium text-slate-700 border-r border-slate-100 whitespace-nowrap">{showDate ? dateStr : ''}</td>
                            <td className="px-3 py-2 text-xs font-mono text-slate-600 border-r border-slate-100 whitespace-nowrap">{new Date(e.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                            <td className="px-3 py-2 text-xs font-mono text-slate-600 border-r border-slate-100 whitespace-nowrap">{e.endTime ? new Date(e.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}</td>
                            <td className="px-3 py-2 text-xs font-bold text-slate-800 border-r border-slate-100 text-right whitespace-nowrap">{e.endTime ? duration.toFixed(2) : '-'}</td>
                            <td className="px-3 py-2 text-xs text-slate-500 border-r border-slate-100 whitespace-nowrap">{project?.name || '-'}</td>
                            <td className="px-3 py-2 text-xs text-slate-500 border-r border-slate-100 whitespace-nowrap">{e.category || '-'}</td>
                            <td className="px-3 py-2 text-xs text-slate-700 max-w-[200px] truncate">{e.description || '(未設定)'}</td>
                          </tr>
                        );
                      });
                    })()
                  ) : null}
                </tbody>
                {filteredEntriesRaw.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td className="px-3 py-1.5 text-xs font-bold text-slate-500 border-r border-slate-100" colSpan={3}>合計</td>
                      <td className="px-3 py-1.5 text-xs font-black text-slate-800 border-r border-slate-100 text-right">
                        {(filteredEntriesRaw.reduce((sum, e) => sum + (e.endTime ? (e.endTime - e.startTime) / 3600000 : 0), 0)).toFixed(2)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {filteredEntriesRaw.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs font-bold">対象期間に履歴がありません</div>
            )}
          </div>
          {/* Mobile: Card view */}
          <div className="md:hidden space-y-2">
            {filteredEntriesRaw.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-bold bg-white rounded-2xl border border-slate-200">対象期間に履歴がありません</div>
            ) : (
              <>
                {(() => {
                  const reportClient = state.clients.find(c => c.id === selectedClientId);
                  return filteredEntriesRaw.map(e => {
                    const project = e.projectId ? reportClient?.projects?.find(p => p.id === e.projectId) : null;
                    const duration = e.endTime ? (e.endTime - e.startTime) / 3600000 : 0;
                    const dateStr = new Date(e.startTime).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', weekday: 'short' });
                    return (
                      <div key={e.id} onClick={() => setEditingEntry(e)} className="bg-white rounded-xl border border-slate-200 px-4 py-3 active:bg-slate-50 cursor-pointer">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-700">{dateStr}</span>
                          <span className="text-xs font-bold text-slate-800">{e.endTime ? `${duration.toFixed(2)} h` : '-'}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          <span className="font-mono">{new Date(e.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                          <span className="mx-1">〜</span>
                          <span className="font-mono">{e.endTime ? new Date(e.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</span>
                          {project && <span className="ml-2 text-slate-400">・{project.name}</span>}
                        </div>
                        {e.description && <div className="text-xs text-slate-600 mt-1 truncate">{e.description}</div>}
                      </div>
                    );
                  });
                })()}
                <div className="flex justify-between items-center px-4 py-2 bg-slate-100 rounded-xl">
                  <span className="text-xs font-bold text-slate-500">合計</span>
                  <span className="text-xs font-black text-slate-800">{(filteredEntriesRaw.reduce((sum, e) => sum + (e.endTime ? (e.endTime - e.startTime) / 3600000 : 0), 0)).toFixed(2)} h</span>
                </div>
              </>
            )}
          </div>
      </div>
      <EditEntryDrawer isOpen={!!editingEntry} onClose={() => setEditingEntry(null)} entry={editingEntry} clients={state.clients} allEntries={state.entries} onSave={(id, updates) => dispatch({type: 'UPDATE_ENTRY', payload: {id, ...updates}})} onDelete={(id) => dispatch({type: 'DELETE_ENTRY', payload: id})} />
      {showPreview && previewData && (
         <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><FileText size={18} /> プレビュー</h3>
                    <button onClick={() => setShowPreview(false)} className="p-1 rounded-full hover:bg-slate-200 transition-colors"><X size={20} className="text-slate-500" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100">
                    <div id="printable-content" className="bg-white p-4 md:p-12 shadow-sm mx-auto max-w-[210mm] min-h-0 md:min-h-[297mm] text-black relative">
                        <div className="border-b-2 border-black pb-4 mb-8 flex justify-between items-end">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight mb-1 text-black">{previewData.options.title}</h1>
                                {previewData.options.businessName && <div className="text-sm font-bold text-gray-700 mb-1">{previewData.options.businessName}</div>}
                                <div className="text-xs text-gray-500">{new Date(previewData.options.issueDate).toLocaleDateString('ja-JP', {year: 'numeric', month: 'long', day: 'numeric'})}</div>
                            </div>
                            <div className="text-right"><div className="text-lg font-bold text-black">{previewData.options.userName}</div></div>
                        </div>
                        <div className="flex justify-between mb-8">
                             <div className="bg-gray-50 p-4 rounded-lg w-[48%] border border-gray-100">
                                <div className="text-[10px] font-bold text-gray-500 uppercase">宛先</div>
                                <div className="text-lg font-bold mt-1 text-black">{previewData.clientName} 御中</div>
                             </div>
                             <div className="bg-gray-50 p-4 rounded-lg w-[48%] border border-gray-100">
                                <div className="text-[10px] font-bold text-gray-500 uppercase">対象期間</div>
                                <div className="text-sm font-bold mt-2 text-black">{new Date(previewData.periodStart).toLocaleDateString('ja-JP')} 〜 {new Date(previewData.periodEnd).toLocaleDateString('ja-JP')}</div>
                             </div>
                        </div>
                        {previewData.options.showTotalHoursOnly && (
                            <div className="mb-8">
                                <div className="flex justify-between items-center border-b border-gray-300 pb-3">
                                   <div className="font-bold text-black text-lg">稼働時間合計</div>
                                   <div className="text-right text-black text-lg font-bold">{previewData.totalHours.toFixed(2)} h</div>
                                </div>
                                {previewData.options.showRevenue && (previewData.hourlyRevenue > 0 || previewData.fixedFee > 0) && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                        {previewData.hourlyRevenue > 0 && (
                                            <div className="flex justify-between items-center text-sm mb-2">
                                                <div className="text-gray-600">時給報酬 ({previewData.totalHours.toFixed(2)}h × ¥{previewData.hourlyRate.toLocaleString()})</div>
                                                <div className="font-bold text-black">¥{Math.floor(previewData.hourlyRevenue).toLocaleString()}</div>
                                            </div>
                                        )}
                                        {previewData.fixedFee > 0 && (
                                            <div className="flex justify-between items-center text-sm mb-2">
                                                <div className="text-gray-600">固定報酬</div>
                                                <div className="font-bold text-black">¥{previewData.fixedFee.toLocaleString()}</div>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                                            <div className="font-bold text-black">合計金額</div>
                                            <div className="font-bold text-black text-lg">¥{Math.floor(previewData.totalRevenue).toLocaleString()}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="mt-8">
                            <h4 className="text-xs font-black text-gray-500 uppercase border-b border-gray-300 pb-2 mb-4">{previewData.options.groupByDate ? '日別作業報告' : '作業履歴詳細'}</h4>
                            <div className="w-full">
                                <div className="table-header">
                                    <div className="col-date">日付</div>
                                    {previewData.options.showTimeRange && <div className="col-time">時刻</div>}
                                    {previewData.options.showProject && <div style={{width: '80px', flexShrink: 0, fontSize: '8pt'}}>案件</div>}
                                    {previewData.options.showCategory && <div style={{width: '70px', flexShrink: 0, fontSize: '8pt'}}>カテゴリ</div>}
                                    <div className="col-desc">作業内容</div>
                                    {previewData.options.showDuration && <div className="col-dur">時間</div>}
                                </div>
                                <div className="mt-2">
                                    {previewData.entries.map((e: any, idx: number) => (
                                        <div key={idx} className="table-row">
                                            <div className="col-date">{new Date(e.startTime).toLocaleDateString('ja-JP')}</div>
                                            {previewData.options.showTimeRange && (
                                                <div className="col-time">{previewData.options.groupByDate ? '-' : `${new Date(e.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${e.endTime ? new Date(e.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '...'}`}</div>
                                            )}
                                            {previewData.options.showProject && <div style={{width: '80px', flexShrink: 0, fontSize: '8pt', padding: '0 4px'}}>{e.projectName || '-'}</div>}
                                            {previewData.options.showCategory && <div style={{width: '70px', flexShrink: 0, fontSize: '8pt', padding: '0 4px'}}>{e.category || '-'}</div>}
                                            <div className="col-desc">{e.description || '(内容未設定)'}</div>
                                            {previewData.options.showDuration && (
                                                <div className="col-dur">{(previewData.options.groupByDate ? (e.duration / 3600000) : ((e.endTime - e.startTime) / 3600000)).toFixed(2)} h</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t bg-white flex justify-end gap-3 no-print">
                    <Button variant="secondary" onClick={() => setShowPreview(false)} className="rounded-xl">閉じる</Button>
                    <Button onClick={handleDownloadPDF} className="theme-bg contrast-text border-none rounded-xl"><Printer size={18} /> PDF保存 (印刷画面へ)</Button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

// --- Sortable Client Chip ---
const SortableClientChip: React.FC<{
  client: Client;
  isSelected: boolean;
  onSelect: (id: string) => void;
}> = ({ client, isSelected, onSelect }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: client.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => { if (!isDragging) onSelect(client.id); }}
      className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 touch-none ${isDragging ? 'scale-105' : ''} ${isSelected ? 'bg-white text-slate-900 border-transparent shadow-lg shadow-black/20' : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-700/50'}`}
    >
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: client.color }}></div>
      {client.name}
    </button>
  );
};

const Dashboard: React.FC<{
  state: AppState;
  onStartTimer: (clientId: string, description: string, rateType?: 'hourly' | 'fixed', projectId?: string, category?: string) => void;
  onStopTimer: () => void;
  onUpdateDescription: (id: string, description: string) => void;
  onDeletePreset: (clientId: string, presetName: string) => void;
  onReorderClients: (clients: Client[]) => void;
}> = ({ state, onStartTimer, onStopTimer, onUpdateDescription, onDeletePreset, onReorderClients }) => {
    const activeEntry = state.activeEntryId ? state.entries.find(e => e.id === state.activeEntryId) : null;
    const activeClient = activeEntry ? state.clients.find(c => c.id === activeEntry.clientId) : null;
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (!activeEntry) return;
        const interval = setInterval(() => {
            setElapsed(Date.now() - activeEntry.startTime);
        }, 1000);
        setElapsed(Date.now() - activeEntry.startTime);
        return () => clearInterval(interval);
    }, [activeEntry]);

    const [selectedClientId, setSelectedClientId] = useState(state.clients.length > 0 ? state.clients[0].id : '');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [rateType, setRateType] = useState<'hourly' | 'fixed'>('hourly');
    const [selectedPresets, setSelectedPresets] = useState<string[]>([]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { delay: 300, tolerance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 5 } })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = state.clients.findIndex(c => c.id === active.id);
            const newIndex = state.clients.findIndex(c => c.id === over.id);
            const reordered = arrayMove(state.clients, oldIndex, newIndex);
            onReorderClients(reordered);
        }
    };

    useEffect(() => {
        if (state.clients.length > 0 && (!selectedClientId || !state.clients.find(c => c.id === selectedClientId))) {
            setSelectedClientId(state.clients[0].id);
        }
    }, [state.clients, selectedClientId]);

    // クライアント変更時に報酬タイプを自動設定 & プリセット選択をリセット
    useEffect(() => {
        const client = state.clients.find(c => c.id === selectedClientId);
        if (client) {
            if (!!client.defaultHourlyRate) {
                setRateType('hourly');
            }
        }
        setSelectedPresets([]);
        setDescription('');
        setSelectedProjectId('');
        setCategory('');
    }, [selectedClientId, state.clients]);

    // 案件選択時は固定報酬に自動設定
    useEffect(() => {
        if (!selectedProjectId) return;
        setRateType('fixed');
    }, [selectedProjectId]);

    const selectedClient = state.clients.find(c => c.id === selectedClientId);
    const clientCategories = selectedClient?.categories || [];

    const handleStart = () => {
        if (!selectedClientId) return;
        onStartTimer(selectedClientId, description, rateType, selectedProjectId || undefined, category || undefined);
        setDescription('');
        setSelectedPresets([]);
        setCategory('');
    };

    const todayTotal = useMemo(() => {
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        return state.entries
            .filter(e => e.startTime >= startOfDay.getTime())
            .reduce((acc, e) => acc + ((e.endTime || Date.now()) - e.startTime), 0);
    }, [state.entries, elapsed]);

    const monthlyStats = useMemo(() => {
        const now = new Date();
        const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);
        const monthlyEntries = state.entries.filter(e => e.startTime >= startOfMonth.getTime());
        let hours = 0;
        let revenue = 0;

        // 時給ベースの収入を計算（クライアントの時給のみ使用）
        monthlyEntries.forEach(e => {
            const client = state.clients.find(c => c.id === e.clientId);
            const duration = ((e.endTime || Date.now()) - e.startTime) / 3600000;
            hours += duration;
            const hourlyRate = client?.defaultHourlyRate;
            if (hourlyRate) {
                revenue += Math.floor(duration * hourlyRate);
            }
        });

        // 月次固定報酬を加算
        const monthlyFixedTotal = state.monthlyFixedFees
            .filter(f => f.yearMonth === currentYearMonth)
            .reduce((sum, f) => sum + f.amount, 0);
        revenue += monthlyFixedTotal;

        return { hours, revenue };
    }, [state.entries, state.clients, state.monthlyFixedFees, elapsed]);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-end mb-2 px-1">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">こんにちは、{state.settings.userName}さん</h2>
                    <p className="text-xs font-bold text-slate-400">今日の稼働: {(todayTotal / 3600000).toFixed(2)}時間</p>
                </div>
                {state.settings.monthlyGoalRevenue > 0 && (
                     <div className="text-right">
                         <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">目標達成率 (売上)</div>
                         <div className="text-lg font-black text-slate-800">
                             {Math.round((monthlyStats.revenue / state.settings.monthlyGoalRevenue) * 100)}%
                         </div>
                         <div className="text-[10px] font-bold text-slate-500">
                            ¥{Math.floor(monthlyStats.revenue).toLocaleString()} / ¥{state.settings.monthlyGoalRevenue.toLocaleString()}
                         </div>
                     </div>
                )}
            </div>

            <Card className="!p-1 !rounded-[32px] shadow-lg shadow-slate-200/50 overflow-visible">
                <div className="bg-slate-900 rounded-[28px] p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    {activeEntry ? (
                        <div className="relative z-10 text-center py-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold mb-6 border border-white/10 animate-pulse">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                RECORDING NOW
                            </div>
                            <div className="mb-8">
                                <div className="text-6xl font-black tracking-tighter tabular-nums mb-2 font-mono">{formatTimeShort(elapsed)}</div>
                                <div className="text-lg font-bold text-slate-300">{activeClient?.name || 'Unknown Client'}</div>
                                <div className="text-sm text-slate-400 mt-1">{activeEntry.description || '(内容未設定)'}</div>
                            </div>
                            <Button onClick={onStopTimer} className="w-full h-16 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black text-lg border-none shadow-xl shadow-black/20">
                                <Square fill="currentColor" size={20} /> 作業を終了する
                            </Button>
                        </div>
                    ) : (
                        <div className="relative z-10">
                             <div className="mb-6 px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">CLIENT</label>
                                {state.clients.length === 0 ? (
                                    <div className="text-xs text-slate-500 font-bold py-2">クライアントを追加してください</div>
                                ) : (
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={state.clients.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                                            <div className="flex items-center gap-2 flex-wrap pb-1">
                                                {state.clients.map(c => (
                                                    <SortableClientChip
                                                        key={c.id}
                                                        client={c}
                                                        isSelected={selectedClientId === c.id}
                                                        onSelect={setSelectedClientId}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                )}
                             </div>
                             {/* Project selection */}
                             {selectedClient && selectedClient.projects && selectedClient.projects.filter(p => p.isActive).length > 0 && (
                               <div className="mb-4 px-1">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">PROJECT</label>
                                 <div className="flex items-center gap-2 flex-wrap pb-1">
                                   <button
                                     onClick={() => setSelectedProjectId('')}
                                     className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${!selectedProjectId ? 'bg-slate-700 text-white border-transparent' : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700/50'}`}
                                   >
                                     全般
                                   </button>
                                   {selectedClient.projects.filter(p => p.isActive).map(p => (
                                     <button
                                       key={p.id}
                                       onClick={() => setSelectedProjectId(p.id)}
                                       className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${selectedProjectId === p.id ? 'bg-slate-700 text-white border-transparent' : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700/50'}`}
                                     >
                                       {p.name}
                                     </button>
                                   ))}
                                 </div>
                               </div>
                             )}
                             <div className="mb-4 px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">TASK</label>
                                <input type="text" value={description} onChange={e => { setDescription(e.target.value); setSelectedPresets([]); }} placeholder="作業内容を入力..." className="w-full bg-slate-800/50 text-white rounded-xl px-4 py-4 font-bold outline-none focus:ring-2 focus:ring-slate-600 transition-all placeholder-slate-600" />
                             </div>
                             {/* Category chip selection */}
                             {clientCategories.length > 0 && (
                             <div className="mb-4 px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">CATEGORY</label>
                                <div className="flex items-center gap-2 flex-wrap pb-1">
                                    <button
                                        onClick={() => setCategory('')}
                                        className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${!category ? 'bg-slate-700 text-white border-transparent' : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700/50'}`}
                                    >
                                        なし
                                    </button>
                                    {clientCategories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setCategory(cat)}
                                            className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${category === cat ? 'bg-slate-700 text-white border-transparent' : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700/50'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                             </div>
                             )}
                             <div className="mb-6 px-1 flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-500">報酬:</span>
                                <div className="flex gap-1">
                                     <button onClick={() => setRateType('hourly')} className={`flex items-center gap-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${rateType === 'hourly' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-800/50'}`}>
                                         <Clock size={12} />
                                         <span>時給</span>
                                     </button>
                                     <button onClick={() => setRateType('fixed')} className={`flex items-center gap-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${rateType === 'fixed' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-800/50'}`}>
                                         <Briefcase size={12} />
                                         <span>固定</span>
                                     </button>
                                </div>
                             </div>
                             <Button onClick={handleStart} disabled={state.clients.length === 0} className="w-full h-16 rounded-2xl theme-bg contrast-text border-none font-black text-lg shadow-xl shadow-black/20">
                                <Play fill="currentColor" size={20} /> 作業を開始
                             </Button>
                        </div>
                    )}
                </div>
            </Card>
            {selectedClient && selectedClient.taskPresets.length > 0 && !activeEntry && (
                <div className="px-1">
                    <h3 className="text-xs font-black text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-2"><Flame size={14} className="text-orange-400" /> よく使うタスク ({selectedClient.name})</h3>
                    <div className="flex flex-wrap gap-2">
                        {selectedClient.taskPresets.map((preset, idx) => {
                            const isSelected = selectedPresets.includes(preset);
                            return (
                                <button key={`${preset}-${idx}`} onClick={() => {
                                    const next = isSelected
                                        ? selectedPresets.filter(p => p !== preset)
                                        : [...selectedPresets, preset];
                                    setSelectedPresets(next);
                                    setDescription(next.join(', '));
                                }} className={`px-4 py-3 rounded-xl shadow-sm border font-bold text-sm active:scale-95 transition-all flex items-center gap-2 group ${isSelected ? 'theme-bg contrast-text border-transparent shadow-md' : 'bg-white border-slate-100 text-slate-700 hover:shadow-md hover:border-slate-200'}`}>
                                    {isSelected && <Check size={14} />}
                                    <span>{preset}</span>
                                    <span onClick={(e) => { e.stopPropagation(); onDeletePreset(selectedClient.id, preset); setSelectedPresets(prev => prev.filter(p => p !== preset)); }} className="opacity-0 group-hover:opacity-100 hover:bg-slate-100 p-1 rounded-full transition-all"><X size={12} className={isSelected ? 'text-current opacity-60' : 'text-slate-400'} /></span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Projects Page ---
const ProjectsPage: React.FC<{ state: AppState; dispatch: (a: any) => void }> = ({ state, dispatch }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [projectName, setProjectName] = useState('');
    const [projectClientId, setProjectClientId] = useState('');
    const [projectFixedFee, setProjectFixedFee] = useState('');
    const [filterClientId, setFilterClientId] = useState('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
    const [searchText, setSearchText] = useState('');

    // 月次固定報酬管理
    const currentYearMonth = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }, []);
    const [selectedYearMonth, setSelectedYearMonth] = useState(currentYearMonth);

    const getYearMonthOptions = () => {
        const options = [];
        const now = new Date();
        for (let i = -3; i <= 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
            options.push({ value: ym, label });
        }
        return options;
    };

    useEffect(() => {
        if (editingProject) {
            setProjectName(editingProject.name);
            setProjectClientId(editingProject.clientId);
            setProjectFixedFee(editingProject.fixedFee?.toString() || '0');
        } else {
            setProjectName('');
            setProjectClientId(state.clients.length > 0 ? state.clients[0].id : '');
            setProjectFixedFee('');
        }
    }, [editingProject, isFormOpen, state.clients]);

    const allProjects = useMemo(() => {
        return state.clients.flatMap(c => (c.projects || []).map(p => ({ ...p, clientName: c.name, clientColor: c.color })));
    }, [state.clients]);

    const filteredProjects = useMemo(() => {
        let result = allProjects;
        if (filterClientId !== 'all') {
            result = result.filter(p => p.clientId === filterClientId);
        }
        if (filterStatus === 'active') {
            result = result.filter(p => p.isActive);
        } else if (filterStatus === 'completed') {
            result = result.filter(p => !p.isActive);
        }
        if (searchText.trim()) {
            const q = searchText.trim().toLowerCase();
            result = result.filter(p => p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q));
        }
        return result;
    }, [allProjects, filterClientId, filterStatus, searchText]);

    // 月次報酬管理: アクティブ案件（フィルタ連動）
    const activeProjectsForFee = useMemo(() => {
        let result = allProjects.filter(p => p.isActive && p.fixedFee > 0);
        if (filterClientId !== 'all') {
            result = result.filter(p => p.clientId === filterClientId);
        }
        return result;
    }, [allProjects, filterClientId]);

    const getMonthlyFee = (projectId: string, yearMonth: string) => {
        return state.monthlyFixedFees.find(f => f.projectId === projectId && f.yearMonth === yearMonth);
    };

    const toggleMonthlyFee = (project: Project) => {
        const existing = state.monthlyFixedFees.find(
            f => f.projectId === project.id && f.yearMonth === selectedYearMonth
        );
        if (existing) {
            dispatch({ type: 'DELETE_MONTHLY_FIXED_FEE', payload: existing.id });
        } else {
            dispatch({
                type: 'ADD_MONTHLY_FIXED_FEE',
                payload: {
                    id: `mf_${Date.now()}`,
                    projectId: project.id,
                    yearMonth: selectedYearMonth,
                    amount: project.fixedFee
                }
            });
        }
    };

    const handleSubmit = () => {
        if (!projectName || !projectClientId) return;
        const project: Project = {
            id: editingProject ? editingProject.id : `p_${Date.now()}`,
            clientId: projectClientId,
            name: projectName,
            fixedFee: projectFixedFee ? Number(projectFixedFee) : 0,
            isActive: editingProject ? editingProject.isActive : true
        };
        if (editingProject) {
            dispatch({ type: 'UPDATE_PROJECT', payload: { clientId: projectClientId, project } });
        } else {
            dispatch({ type: 'ADD_PROJECT', payload: { clientId: projectClientId, project } });
        }
        setIsFormOpen(false);
        setEditingProject(null);
    };

    const handleToggleActive = (project: Project & { clientName: string }) => {
        const updated: Project = { id: project.id, clientId: project.clientId, name: project.name, fixedFee: project.fixedFee, isActive: !project.isActive };
        dispatch({ type: 'UPDATE_PROJECT', payload: { clientId: project.clientId, project: updated } });
    };

    const handleDelete = () => {
        if (!editingProject) return;
        if (!confirm('この案件を削除しますか？')) return;
        dispatch({ type: 'DELETE_PROJECT', payload: { clientId: editingProject.clientId, projectId: editingProject.id } });
        setIsFormOpen(false);
        setEditingProject(null);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-center mb-2 px-1">
                <h2 className="text-lg font-black text-slate-800">案件管理</h2>
                <Button onClick={() => { setEditingProject(null); setIsFormOpen(true); }} disabled={state.clients.length === 0} className="!py-2 !px-4 !rounded-lg text-xs theme-bg contrast-text"><Plus size={16} /> 新規登録</Button>
            </div>

            {/* Filter bar */}
            <div className="space-y-2 px-1">
                {/* Client filter chips */}
                <div className="flex items-center gap-2 flex-wrap pb-1">
                    <button onClick={() => setFilterClientId('all')} className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${filterClientId === 'all' ? 'bg-slate-700 text-white border-transparent' : 'bg-white border-slate-200 text-slate-500'}`}>すべて</button>
                    {state.clients.map(c => (
                        <button key={c.id} onClick={() => setFilterClientId(c.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1.5 ${filterClientId === c.id ? 'bg-slate-700 text-white border-transparent' : 'bg-white border-slate-200 text-slate-500'}`}>
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }}></div>
                            {c.name}
                        </button>
                    ))}
                </div>
                {/* Status filter + search */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-0.5 shrink-0">
                        {(['all', 'active', 'completed'] as const).map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${filterStatus === s ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                                {s === 'all' ? '全て' : s === 'active' ? 'アクティブ' : '完了'}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        placeholder="案件名で検索..."
                        className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-slate-400 transition-colors"
                    />
                </div>
            </div>

            {state.clients.length === 0 ? (
                <Card className="!p-8 text-center">
                    <div className="text-slate-400 mb-2"><Users size={32} className="mx-auto mb-2 opacity-50" /></div>
                    <p className="text-sm font-bold text-slate-500 mb-1">クライアントを先に登録してください</p>
                    <p className="text-xs text-slate-400">案件はクライアントに紐づけて管理します</p>
                    <Link to="/clients" className="inline-flex items-center gap-1 mt-4 text-xs font-bold theme-bg contrast-text px-4 py-2 rounded-lg">
                        <Users size={14} /> クライアント管理へ
                    </Link>
                </Card>
            ) : filteredProjects.length === 0 ? (
                <Card className="!p-8 text-center">
                    <div className="text-slate-400 mb-2"><Briefcase size={32} className="mx-auto mb-2 opacity-50" /></div>
                    <p className="text-sm font-bold text-slate-500">案件がありません</p>
                    <p className="text-xs text-slate-400 mt-1">「新規登録」ボタンから案件を追加しましょう</p>
                </Card>
            ) : (
                <>
                {/* Desktop: Table view */}
                <Card className="!p-0 overflow-hidden hidden md:block">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">案件名</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">クライアント</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">固定報酬</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">ステータス</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProjects.map(project => (
                                    <tr key={project.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer ${!project.isActive ? 'opacity-50' : ''}`} onClick={() => { setEditingProject(project); setIsFormOpen(true); }}>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-bold text-slate-800">{project.name}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.clientColor }}></div>
                                                <span className="text-xs font-bold text-slate-600">{project.clientName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-xs font-black text-slate-700">¥{project.fixedFee.toLocaleString()}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleToggleActive(project)}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${project.isActive ? 'theme-bg' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${project.isActive ? 'left-5' : 'left-0.5'}`}></div>
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => { setEditingProject(project); setIsFormOpen(true); }} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                                                <Edit2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
                {/* Mobile: Card view */}
                <div className="md:hidden space-y-2">
                    {filteredProjects.map(project => (
                        <Card key={project.id} onClick={() => { setEditingProject(project); setIsFormOpen(true); }} className={`!p-4 cursor-pointer active:bg-slate-50 ${!project.isActive ? 'opacity-50' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-800 truncate">{project.name}</div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.clientColor }}></div>
                                        <span className="text-xs text-slate-500">{project.clientName}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-3">
                                    <span className="text-xs font-black text-slate-700">¥{project.fixedFee.toLocaleString()}</span>
                                    <button
                                        onClick={e => { e.stopPropagation(); handleToggleActive(project); }}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${project.isActive ? 'theme-bg' : 'bg-slate-200'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${project.isActive ? 'left-5' : 'left-0.5'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
                </>
            )}

            {/* 月次報酬管理セクション */}
            {activeProjectsForFee.length > 0 && (
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 className="text-lg font-black text-slate-800">月次報酬管理</h3>
                        <select
                            value={selectedYearMonth}
                            onChange={e => setSelectedYearMonth(e.target.value)}
                            className="text-sm font-bold bg-slate-100 rounded-lg px-3 py-2 outline-none"
                        >
                            {getYearMonthOptions().map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <Card className="!p-3">
                        <div className="space-y-1">
                            {activeProjectsForFee.map(project => {
                                const fee = getMonthlyFee(project.id, selectedYearMonth);
                                const isEnabled = !!fee;
                                return (
                                    <div key={project.id} className="flex items-center justify-between py-2 px-2 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: project.clientColor }}>
                                                {project.clientName.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs font-bold text-slate-700 truncate block">{project.name}</span>
                                                <span className="text-[10px] text-slate-400">{project.clientName}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 shrink-0">¥{project.fixedFee.toLocaleString()}</span>
                                        </div>
                                        <button
                                            onClick={() => toggleMonthlyFee(project)}
                                            className={`w-10 h-5 rounded-full transition-colors relative ml-3 shrink-0 ${isEnabled ? 'theme-bg' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${isEnabled ? 'left-5' : 'left-0.5'}`}></div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500">合計</span>
                            <span className="text-sm font-black text-slate-800">
                                ¥{state.monthlyFixedFees
                                    .filter(f => f.yearMonth === selectedYearMonth)
                                    .reduce((sum, f) => sum + f.amount, 0)
                                    .toLocaleString()}
                            </span>
                        </div>
                    </Card>
                </div>
            )}

            {isFormOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-y-auto mx-4">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-slate-800">{editingProject ? '案件編集' : '新規案件'}</h3>
                            {editingProject && (
                                <button onClick={handleDelete} className="p-2 text-red-500 bg-red-50 rounded-full hover:bg-red-100 transition-colors"><Trash2 size={20} /></button>
                            )}
                        </div>
                        <div className="space-y-6 mb-8">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">クライアント</label>
                                <Select value={projectClientId} onChange={e => setProjectClientId(e.target.value)} className="!rounded-xl border-slate-200 h-14">
                                    {state.clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </Select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">案件名</label>
                                <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="案件名を入力" className="!h-14 font-bold" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">固定報酬 (¥)</label>
                                <Input type="number" value={projectFixedFee} onChange={e => setProjectFixedFee(e.target.value)} placeholder="0" className="!h-12 font-bold" />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button onClick={() => { setIsFormOpen(false); setEditingProject(null); }} variant="secondary" className="flex-1 h-14 rounded-2xl">キャンセル</Button>
                            <Button onClick={handleSubmit} disabled={!projectName || !projectClientId} className="flex-[2] theme-bg contrast-text border-none font-black h-14 rounded-2xl">保存する</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ClientsPage: React.FC<{ state: AppState; dispatch: (a: any) => void }> = ({ state, dispatch }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [name, setName] = useState('');
    const [color, setColor] = useState(STYLISH_COLORS[0]);
    const [hourlyRate, setHourlyRate] = useState('');
    const [closingDate, setClosingDate] = useState('99');

    // Category management state
    const [newCategoryName, setNewCategoryName] = useState('');

    useEffect(() => {
        if (editingClient) {
            setName(editingClient.name);
            setColor(editingClient.color);
            setHourlyRate(editingClient.defaultHourlyRate?.toString() || '');
            setClosingDate(editingClient.closingDate?.toString() || '99');
        } else {
            setName('');
            setColor(getNextStylishColor(state.clients.map(c => c.color)));
            setHourlyRate('');
            setClosingDate('99');
        }
    }, [editingClient, isFormOpen, state.clients]);
    const handleSubmit = () => {
        if (!name) return;
        const payload = {
            id: editingClient ? editingClient.id : `c_${Date.now()}`,
            name,
            color,
            defaultHourlyRate: Number(hourlyRate),
            closingDate: Number(closingDate),
            taskPresets: editingClient ? editingClient.taskPresets : [],
            projects: editingClient ? editingClient.projects : [],
            categories: editingClient ? editingClient.categories : []
        };
        if (editingClient) { dispatch({ type: 'UPDATE_CLIENT', payload }); } else { dispatch({ type: 'ADD_CLIENT', payload }); }
        setIsFormOpen(false);
        setEditingClient(null);
    };

    const handleAddCategory = () => {
        if (!newCategoryName.trim() || !editingClient) return;
        const trimmed = newCategoryName.trim();
        if (editingClient.categories.includes(trimmed)) return;
        setEditingClient({
            ...editingClient,
            categories: [...editingClient.categories, trimmed]
        });
        setNewCategoryName('');
    };

    const handleRemoveCategory = (cat: string) => {
        if (!editingClient) return;
        setEditingClient({
            ...editingClient,
            categories: editingClient.categories.filter(c => c !== cat)
        });
    };
    const handleDelete = () => {
        if (editingClient && confirm(`「${editingClient.name}」を削除しますか？`)) {
            dispatch({ type: 'DELETE_CLIENT', payload: editingClient.id });
            setIsFormOpen(false);
            setEditingClient(null);
        }
    };
    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-center mb-2 px-1">
                 <h2 className="text-lg font-black text-slate-800">クライアント管理</h2>
                 <Button onClick={() => { setEditingClient(null); setIsFormOpen(true); }} className="!py-2 !px-4 !rounded-lg text-xs theme-bg contrast-text"><Plus size={16} /> 新規登録</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {state.clients.map(client => (
                    <Card key={client.id} onClick={() => { setEditingClient(client); setIsFormOpen(true); }} className="!p-4 hover:!border-slate-300 transition-all border border-transparent cursor-pointer">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm relative" style={{ backgroundColor: client.color }}>
                                    {client.name.charAt(0)}
                                    {client.projects && client.projects.filter(p => p.isActive).length > 0 && (
                                        <div className="absolute -top-1 -right-1 bg-slate-800 text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                                            {client.projects.filter(p => p.isActive).length}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">{client.name}</h3>
                                    <div className="text-[9px] font-bold text-slate-400">締日: {client.closingDate === 99 ? '末日' : `${client.closingDate}日`}</div>
                                </div>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded-full text-slate-300"><Edit2 size={14} /></div>
                        </div>
                        <div className="space-y-1.5">
                             <div className="flex justify-between items-center p-1.5 bg-slate-50 rounded-lg">
                                 <span className="text-[9px] font-bold text-slate-500">時給</span>
                                 <span className="text-xs font-black text-slate-700">¥{client.defaultHourlyRate?.toLocaleString() || 0}</span>
                             </div>
                        </div>
                    </Card>
                ))}
                <button onClick={() => { setEditingClient(null); setIsFormOpen(true); }} className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all min-h-[140px]">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><Plus size={20} /></div>
                    <span className="text-xs font-bold">追加</span>
                </button>
            </div>

            {isFormOpen && (
                 <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-y-auto mx-4">
                        <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black text-slate-800">{editingClient ? 'クライアント編集' : '新規クライアント'}</h3>{editingClient && (<button onClick={handleDelete} className="p-2 text-red-500 bg-red-50 rounded-full hover:bg-red-100 transition-colors"><Trash2 size={20} /></button>)}</div>
                        <div className="space-y-6 mb-8">
                            <div><label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">クライアント名</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="会社名や個人名" className="!h-14 font-bold" /></div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">テーマカラー</label>
                                <div className="flex flex-wrap gap-3 items-center">
                                    {STYLISH_COLORS.slice(0, 10).map(c => (<button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-4 ring-slate-200 scale-110' : 'opacity-60 hover:opacity-100'}`} style={{ backgroundColor: c }} />))}
                                    {/* Custom Color Input */}
                                    <div className={`relative w-8 h-8 rounded-full overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center transition-all ${!STYLISH_COLORS.slice(0, 10).includes(color) ? 'ring-4 ring-slate-200 scale-110' : 'opacity-60 hover:opacity-100'}`} style={{ backgroundColor: color }}>
                                         <input 
                                            type="color" 
                                            value={color.startsWith('#') ? color : '#4A6FA5'} 
                                            onChange={(e) => setColor(e.target.value)}
                                            className="absolute inset-[-5px] w-[150%] h-[150%] cursor-pointer"
                                         />
                                         <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/10">
                                            <Palette size={12} className="text-white drop-shadow-sm" />
                                         </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">基本時給 (¥)</label>
                                <Input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="0" className="!h-12 font-bold" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">締日設定</label>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {[99, 15, 20, 25].map(d => (<button key={d} type="button" onClick={() => setClosingDate(d.toString())} className={`py-3 rounded-xl text-xs font-bold transition-all ${closingDate === d.toString() ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-500'}`}>{d === 99 ? '末日' : `${d}日`}</button>))}
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-slate-200 transition-all">
                                        <span className="text-[10px] font-bold text-slate-400 shrink-0">自由入力:</span>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="31" 
                                            value={closingDate === '99' ? '' : closingDate} 
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (val === '') return setClosingDate('99');
                                                const n = parseInt(val);
                                                if (!isNaN(n) && n >= 1 && n <= 31) setClosingDate(n.toString());
                                            }}
                                            placeholder="1〜31"
                                            className="bg-transparent w-full text-sm font-bold outline-none text-slate-700"
                                        />
                                        <span className="text-[10px] font-bold text-slate-400">日</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Category Management Section */}
                        {editingClient && (
                            <div className="mb-8 border-t border-slate-100 pt-6">
                                <label className="text-[10px] font-black text-slate-400 block mb-4 uppercase tracking-widest flex items-center gap-2">
                                    <LayoutList size={12} /> カテゴリ管理
                                </label>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {editingClient.categories.map(cat => (
                                        <span key={cat} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-700">
                                            {cat}
                                            <button onClick={() => handleRemoveCategory(cat)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={12} /></button>
                                        </span>
                                    ))}
                                    {editingClient.categories.length === 0 && (
                                        <div className="text-xs text-slate-400 font-bold py-2">カテゴリがありません</div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                                        placeholder="新しいカテゴリ名"
                                        className="!h-10 text-sm flex-1"
                                    />
                                    <button onClick={handleAddCategory} disabled={!newCategoryName.trim()} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1 shrink-0">
                                        <Plus size={14} /> 追加
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Link to Projects Page */}
                        {editingClient && (
                            <div className="mb-8 border-t border-slate-100 pt-4">
                                <Link to="/projects" onClick={() => setIsFormOpen(false)} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                        <Briefcase size={14} />
                                        <span>案件管理</span>
                                        {editingClient.projects && editingClient.projects.length > 0 && (
                                            <Badge className="!text-[9px]">{editingClient.projects.filter(p => p.isActive).length}件</Badge>
                                        )}
                                    </div>
                                    <ArrowRight size={14} className="text-slate-400" />
                                </Link>
                            </div>
                        )}

                        {/* Saved Reports Section */}
                        {editingClient && (() => {
                            const clientReports = state.savedReports.filter(r => r.clientId === editingClient.id);
                            if (clientReports.length === 0) return null;
                            return (
                                <div className="mb-8 border-t border-slate-100 pt-4">
                                    <h4 className="text-[10px] font-black text-slate-400 ml-1 mb-3 uppercase tracking-widest">保存済み報告書</h4>
                                    <div className="space-y-2">
                                        {clientReports.map(report => (
                                            <div key={report.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-slate-700 truncate">{report.title}</div>
                                                    <div className="text-xs text-slate-400">{report.periodStart} 〜 {report.periodEnd} ・ {new Date(report.createdAt).toLocaleDateString('ja-JP')}</div>
                                                </div>
                                                <div className="flex items-center gap-1 ml-2 shrink-0">
                                                    <button
                                                        onClick={() => {
                                                            const w = window.open('', '_blank');
                                                            if (!w) return;
                                                            w.document.write(report.htmlContent.replace('</body>', '<script>setTimeout(() => { window.print(); }, 500);<\/script></body>'));
                                                            w.document.close();
                                                        }}
                                                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="再ダウンロード"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('この報告書を削除しますか？')) {
                                                                dispatch({ type: 'DELETE_SAVED_REPORT', payload: report.id });
                                                            }
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="削除"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="flex gap-3"><Button onClick={() => setIsFormOpen(false)} variant="secondary" className="flex-1 h-14 rounded-2xl">キャンセル</Button><Button onClick={handleSubmit} className="flex-[2] theme-bg contrast-text border-none font-black h-14 rounded-2xl">保存する</Button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Management Page (Unified Clients + Projects for Mobile) ---
const ManagementPage: React.FC<{ state: AppState; dispatch: (a: any) => void }> = ({ state, dispatch }) => {
    const [activeTab, setActiveTab] = useState<'clients' | 'projects'>('clients');
    return (
        <div>
            <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1">
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'clients' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Users size={16} /> クライアント
                </button>
                <button
                    onClick={() => setActiveTab('projects')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'projects' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Briefcase size={16} /> 案件
                </button>
            </div>
            {activeTab === 'clients' ? (
                <ClientsPage state={state} dispatch={dispatch} />
            ) : (
                <ProjectsPage state={state} dispatch={dispatch} />
            )}
        </div>
    );
};

// --- Main Layout Component ---
const AppLayout: React.FC = () => {
  const { user, loading: authLoading, error: authError, signIn, signOut } = useAuth();
  const [state, setState] = useState<AppState>(loadState);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [floatingElapsed, setFloatingElapsed] = useState(0);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);
  const notificationRef = useRef<Notification | null>(null);
  const notificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Load data from Supabase when user logs in
  useEffect(() => {
    const loadData = async () => {
      if (user && !dataLoaded) {
        setIsSyncing(true);
        try {
          const cloudData = await loadAllUserData(user.id);
          if (cloudData) {
            // If cloud has data, use it
            if (cloudData.clients.length > 0 || cloudData.entries.length > 0) {
              setState(prev => ({
                ...prev,
                clients: cloudData.clients,
                entries: cloudData.entries,
                settings: cloudData.settings,
                monthlyFixedFees: cloudData.monthlyFixedFees,
                savedReports: cloudData.savedReports || []
              }));
            }
          }
          setDataLoaded(true);
        } catch (error) {
          console.error('Failed to load data from Supabase:', error);
        } finally {
          setIsSyncing(false);
        }
      }
    };
    loadData();
  }, [user, dataLoaded]);

  // Reset dataLoaded when user logs out
  useEffect(() => {
    if (!user) {
      setDataLoaded(false);
    }
  }, [user]);

  const activeEntry = state.activeEntryId ? state.entries.find(e => e.id === state.activeEntryId) : null;
  const activeClientName = activeEntry ? state.clients.find(c => c.id === activeEntry.clientId)?.name || '' : '';

  useEffect(() => {
    if (!activeEntry) {
      setFloatingElapsed(0);
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
        pipWindowRef.current = null;
        setIsPiPActive(false);
      }
      // Clear notification on timer stop
      if (notificationRef.current) {
        notificationRef.current.close();
        notificationRef.current = null;
      }
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
        notificationIntervalRef.current = null;
      }
      return;
    }
    const interval = setInterval(() => {
      setFloatingElapsed(Date.now() - activeEntry.startTime);
    }, 1000);
    setFloatingElapsed(Date.now() - activeEntry.startTime);
    return () => clearInterval(interval);
  }, [activeEntry]);

  // PiPウィンドウ内のタイマー更新
  useEffect(() => {
    if (!isPiPActive || !pipWindowRef.current || !activeEntry) return;

    const updatePiPContent = () => {
      if (!pipWindowRef.current) return;
      const timeEl = pipWindowRef.current.document.getElementById('pip-time');
      if (timeEl) {
        timeEl.textContent = formatTimeShort(Date.now() - activeEntry.startTime);
      }
    };

    const interval = setInterval(updatePiPContent, 1000);
    updatePiPContent();

    return () => clearInterval(interval);
  }, [isPiPActive, activeEntry]);

  const handleTogglePiP = async () => {
    // If already active, close PiP or notification
    if (isPiPActive) {
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
        pipWindowRef.current = null;
      }
      if (notificationRef.current) {
        notificationRef.current.close();
        notificationRef.current = null;
      }
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
        notificationIntervalRef.current = null;
      }
      setIsPiPActive(false);
      return;
    }

    // If PiP not supported (mobile), use Notification API
    if (!('documentPictureInPicture' in window)) {
      if (!('Notification' in window)) {
        alert('お使いのブラウザは通知機能に対応していません。');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('通知の許可が必要です。ブラウザの設定から通知を許可してください。');
        return;
      }

      const showNotification = () => {
        if (!activeEntry) return;
        const elapsed = formatTimeShort(Date.now() - activeEntry.startTime);
        const clientName = state.clients.find(c => c.id === activeEntry.clientId)?.name || '作業中';
        if (notificationRef.current) {
          notificationRef.current.close();
        }
        notificationRef.current = new Notification('Logmee - 計測中', {
          body: `${clientName} | ${elapsed}`,
          tag: 'logmee-timer',
          requireInteraction: true,
        });
      };

      showNotification();
      notificationIntervalRef.current = setInterval(showNotification, 30000);
      setIsPiPActive(true);
      return;
    }

    try {
      const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
        width: 320,
        height: 120,
      });

      pipWindowRef.current = pipWindow;

      const style = pipWindow.document.createElement('style');
      style.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #334155;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          padding: 12px;
          user-select: none;
        }
        .container {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
        }
        .indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ef4444;
          animation: pulse 2s infinite;
          box-shadow: 0 0 8px rgba(239,68,68,0.6);
          flex-shrink: 0;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        .label {
          font-size: 10px;
          color: #94a3b8;
          font-weight: bold;
          margin-bottom: 2px;
        }
        .client {
          font-size: 14px;
          font-weight: bold;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .time {
          font-family: ui-monospace, monospace;
          font-size: 20px;
          font-weight: bold;
          color: #e2e8f0;
          flex-shrink: 0;
        }
        .stop-btn {
          background: #1e293b;
          border: 1px solid #475569;
          color: white;
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .stop-btn:hover { background: #0f172a; }
        .stop-btn:active { transform: scale(0.95); }
        .stop-icon {
          width: 8px;
          height: 8px;
          background: currentColor;
        }
      `;
      pipWindow.document.head.appendChild(style);

      pipWindow.document.body.innerHTML = `
        <div class="container">
          <div class="indicator"></div>
          <div class="info">
            <div class="label">計測中</div>
            <div class="client">${activeClientName || '作業中'}</div>
          </div>
          <div class="time" id="pip-time">${formatTimeShort(floatingElapsed)}</div>
          <button class="stop-btn" id="pip-stop">
            <div class="stop-icon"></div>
            停止
          </button>
        </div>
      `;

      const stopBtn = pipWindow.document.getElementById('pip-stop');
      if (stopBtn) {
        stopBtn.addEventListener('click', () => {
          dispatch({ type: 'STOP_TIMER' });
          pipWindow.close();
        });
      }

      pipWindow.addEventListener('pagehide', () => {
        pipWindowRef.current = null;
        setIsPiPActive(false);
      });

      setIsPiPActive(true);
    } catch (error) {
      console.error('PiP error:', error);
      alert('ピクチャーインピクチャーの起動に失敗しました。');
    }
  };

  // Sync helper functions
  const syncToSupabase = useCallback(async (actionType: string, payload: any, newState: AppState) => {
    if (!user) return;

    try {
      switch (actionType) {
        case 'START_TIMER':
        case 'STOP_TIMER':
        case 'UPDATE_ENTRY': {
          const entry = newState.entries.find(e => e.id === payload?.id || e.id === newState.activeEntryId || e.startTime === payload?.startTime);
          if (entry) await saveTimeEntry(user.id, entry);
          // Also sync client if taskPresets updated
          const client = newState.clients.find(c => c.id === (entry?.clientId || payload?.clientId));
          if (client) await saveClient(user.id, client);
          break;
        }
        case 'DELETE_ENTRY':
          await deleteEntryFromSupabase(payload);
          break;
        case 'ADD_CLIENT':
        case 'UPDATE_CLIENT':
        case 'DELETE_CLIENT_PRESET':
        case 'CLEAR_CLIENT_PRESETS': {
          const clientToSync = newState.clients.find(c => c.id === (payload?.id || payload?.clientId || payload));
          if (clientToSync) await saveClient(user.id, clientToSync);
          break;
        }
        case 'DELETE_CLIENT':
          await deleteClientFromSupabase(payload);
          break;
        case 'UPDATE_THEME':
        case 'UPDATE_GOALS':
          await saveUserSettings(user.id, newState.settings);
          break;
        case 'ADD_PROJECT':
        case 'UPDATE_PROJECT':
          if (payload?.project) await saveProject(user.id, payload.project);
          break;
        case 'DELETE_PROJECT':
          if (payload?.projectId) await deleteProjectFromSupabase(payload.projectId);
          break;
        case 'ADD_MONTHLY_FIXED_FEE':
        case 'UPDATE_MONTHLY_FIXED_FEE':
          await saveMonthlyFixedFee(user.id, payload);
          break;
        case 'DELETE_MONTHLY_FIXED_FEE':
          await deleteFeeFromSupabase(payload);
          break;
        case 'ADD_SAVED_REPORT':
          await saveSavedReport(user.id, payload);
          break;
        case 'DELETE_SAVED_REPORT':
          await deleteSavedReportFromSupabase(payload);
          break;
        case 'REORDER_CLIENTS':
          for (const client of newState.clients) {
            await saveClient(user.id, client);
          }
          break;
      }
    } catch (error) {
      console.error('Failed to sync to Supabase:', error);
    }
  }, [user]);

  const dispatch = (action: { type: string; payload?: any }) => {
    setState(prev => {
        let newState = { ...prev };
        let entryForSync: TimeEntry | null = null;

        switch (action.type) {
            case 'START_TIMER':
                const newEntry: TimeEntry = {
                    id: `e_${Date.now()}`,
                    clientId: action.payload.clientId,
                    startTime: Date.now(),
                    endTime: null,
                    description: action.payload.description || '',
                    rateType: action.payload.rateType,
                    projectId: action.payload.projectId,
                    category: action.payload.category
                };
                newState.entries = [...prev.entries, newEntry];
                newState.activeEntryId = newEntry.id;
                entryForSync = newEntry;
                if (action.payload.description) {
                  newState.clients = prev.clients.map(c => {
                    if (c.id === action.payload.clientId && !c.taskPresets.includes(action.payload.description)) {
                      return { ...c, taskPresets: [action.payload.description, ...c.taskPresets].slice(0, 20) };
                    }
                    return c;
                  });
                }
                break;
            case 'STOP_TIMER':
                if (prev.activeEntryId) {
                    newState.entries = prev.entries.map(e => e.id === prev.activeEntryId ? { ...e, endTime: Date.now() } : e);
                    entryForSync = newState.entries.find(e => e.id === prev.activeEntryId) || null;
                    newState.activeEntryId = null;
                }
                break;
            case 'UPDATE_ENTRY':
                newState.entries = prev.entries.map(e => e.id === action.payload.id ? { ...action.payload } : e);
                const ent = action.payload as TimeEntry;
                if(ent.description && ent.clientId) {
                    newState.clients = newState.clients.map(c => {
                      if (c.id === ent.clientId && ent.description && !c.taskPresets.includes(ent.description)) {
                        return { ...c, taskPresets: [ent.description, ...c.taskPresets].slice(0, 20) };
                      }
                      return c;
                    });
                }
                break;
            case 'DELETE_ENTRY':
                newState.entries = prev.entries.filter(e => e.id !== action.payload);
                if (prev.activeEntryId === action.payload) newState.activeEntryId = null;
                break;
            case 'ADD_CLIENT': newState.clients = [...prev.clients, action.payload]; break;
            case 'UPDATE_CLIENT': newState.clients = prev.clients.map(c => c.id === action.payload.id ? action.payload : c); break;
            case 'DELETE_CLIENT': newState.clients = prev.clients.filter(c => c.id !== action.payload); break;
            case 'DELETE_CLIENT_PRESET':
                newState.clients = prev.clients.map(c => {
                    if (c.id === action.payload.clientId) { return { ...c, taskPresets: c.taskPresets.filter(p => p !== action.payload.presetName) }; }
                    return c;
                });
                break;
            case 'UPDATE_THEME': newState.settings = { ...prev.settings, themeColor: action.payload }; break;
            case 'UPDATE_GOALS': newState.settings = { ...prev.settings, ...action.payload }; break;
            case 'CLEAR_CLIENT_PRESETS': newState.clients = prev.clients.map(c => c.id === action.payload ? { ...c, taskPresets: [] } : c); break;
            case 'ADD_PROJECT':
                newState.clients = prev.clients.map(c => {
                    if (c.id === action.payload.clientId) {
                        return { ...c, projects: [...(c.projects || []), action.payload.project] };
                    }
                    return c;
                });
                break;
            case 'UPDATE_PROJECT':
                newState.clients = prev.clients.map(c => {
                    if (c.id === action.payload.clientId) {
                        return { ...c, projects: (c.projects || []).map(p => p.id === action.payload.project.id ? action.payload.project : p) };
                    }
                    return c;
                });
                break;
            case 'DELETE_PROJECT':
                newState.clients = prev.clients.map(c => {
                    if (c.id === action.payload.clientId) {
                        return { ...c, projects: (c.projects || []).filter(p => p.id !== action.payload.projectId) };
                    }
                    return c;
                });
                // Clear projectId from entries that reference this project
                newState.entries = prev.entries.map(e => e.projectId === action.payload.projectId ? { ...e, projectId: undefined } : e);
                break;
            case 'ADD_MONTHLY_FIXED_FEE':
                newState.monthlyFixedFees = [...prev.monthlyFixedFees, action.payload];
                break;
            case 'UPDATE_MONTHLY_FIXED_FEE':
                newState.monthlyFixedFees = prev.monthlyFixedFees.map(f => f.id === action.payload.id ? action.payload : f);
                break;
            case 'DELETE_MONTHLY_FIXED_FEE':
                newState.monthlyFixedFees = prev.monthlyFixedFees.filter(f => f.id !== action.payload);
                break;
            case 'ADD_SAVED_REPORT':
                newState.savedReports = [...prev.savedReports, action.payload];
                break;
            case 'DELETE_SAVED_REPORT':
                newState.savedReports = prev.savedReports.filter(r => r.id !== action.payload);
                break;
            case 'REORDER_CLIENTS':
                newState.clients = action.payload;
                break;
        }
        saveState(newState);

        // Sync to Supabase in background
        syncToSupabase(action.type, entryForSync || action.payload, newState);

        return newState;
    });
  };

  const themeColors = [
    { name: 'Peach Coral', value: '#fc9f97' },
    { name: 'Vibrant Orange', value: '#f97316' },
    { name: 'Gold', value: '#FFD700' },
    { name: 'Mint Green', value: '#4ade80' },
    { name: 'Emerald Green', value: '#10b981' },
    { name: 'Clean Azure', value: '#0ea5e9' },
    { name: 'Lavender', value: '#ca9fdb' },
    { name: 'Sunset', value: 'linear-gradient(135deg, #fc9f97 0%, #f685b3 100%)' },
    { name: 'JShine', value: 'linear-gradient(to right, #12c2e9, #c471ed, #f64f59)' },
    { name: 'Dark Ocean', value: 'linear-gradient(to right, #373b44, #4286f4)' },
    { name: 'Moonlit Asteroid', value: 'linear-gradient(to right, #0F2027, #203A43, #2C5364)' },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }
  if (!user) {
    return <LoginPage onSignIn={signIn} loading={authLoading} error={authError} />;
  }

  return (
    <ThemeProvider color={state.settings.themeColor}>
      <div className="min-h-screen bg-[#F8F9FA] flex text-slate-800 font-sans">
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 fixed h-full z-50">
           <div className="p-6 theme-bg mb-6 flex items-center justify-center gap-2"><Briefcase size={22} strokeWidth={2.5} className="contrast-text" /><h1 className="font-black text-2xl tracking-tighter contrast-text">Logmee</h1></div>
           <nav className="flex-1 px-4 space-y-2">
              <DesktopNavItem to="/" icon={<Clock />} label="タイマー" active={location.pathname === '/'} />
              <DesktopNavItem to="/logs" icon={<History />} label="稼働履歴" active={location.pathname === '/logs'} />
              <DesktopNavItem to="/reports" icon={<FileText />} label="報告書" active={location.pathname === '/reports'} />
              <DesktopNavItem to="/clients" icon={<Users />} label="クライアント管理" active={location.pathname === '/clients'} />
              <DesktopNavItem to="/projects" icon={<Briefcase />} label="案件管理" active={location.pathname === '/projects'} />
              <DesktopNavItem to="/analytics" icon={<BarChart2 />} label="データ分析" active={location.pathname === '/analytics'} />
              <DesktopNavItem to="/usage" icon={<HelpCircle />} label="使い方" active={location.pathname === '/usage'} />
           </nav>
           <div className="p-4 border-t border-slate-100">
             <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors font-bold"><Settings size={20} /><span>設定</span></button>
           </div>
        </aside>
        <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
            <header className="md:hidden theme-bg p-4 pt-safe flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-2"><div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-sm contrast-text"><Briefcase size={22} strokeWidth={2.5} fill="none" /></div><h1 className="font-black text-2xl tracking-tighter contrast-text">Logmee</h1></div>
                <div className="flex items-center gap-2">
                  {isSyncing ? <CloudOff size={18} className="contrast-text opacity-70 animate-pulse" /> : <Cloud size={18} className="contrast-text opacity-70" />}
                  <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors contrast-text"><Settings size={20} fill="none" strokeWidth={2} /></button>
                </div>
            </header>
            <div className="hidden md:block h-8"></div>
            <main className="p-4 md:p-8 max-w-6xl w-full mx-auto pb-24 md:pb-8">
                <Routes>
                    <Route path="/" element={<Dashboard state={state} onStartTimer={(clientId, description, rateType, projectId, category) => dispatch({type:'START_TIMER', payload:{clientId, description, rateType, projectId, category}})} onStopTimer={() => dispatch({type:'STOP_TIMER'})} onUpdateDescription={(id, description) => { const entry = state.entries.find(e => e.id === id); if (entry) dispatch({type:'UPDATE_ENTRY', payload:{...entry, description}}); }} onDeletePreset={(clientId, presetName) => dispatch({type: 'DELETE_CLIENT_PRESET', payload: {clientId, presetName}})} onReorderClients={(clients) => dispatch({type: 'REORDER_CLIENTS', payload: clients})} />} />
                    <Route path="/clients" element={<ManagementPage state={state} dispatch={dispatch} />} />
                    <Route path="/projects" element={<ProjectsPage state={state} dispatch={dispatch} />} />
                    <Route path="/logs" element={<LogsPage state={state} dispatch={dispatch} />} />
                    <Route path="/reports" element={<ReportPage state={state} dispatch={dispatch} />} />
                    <Route path="/analytics" element={<AnalyticsPage state={state} />} />
                    <Route path="/usage" element={<UsagePage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
            <nav className="md:hidden bg-white border-t border-slate-100 flex items-center px-4 pb-safe fixed bottom-0 z-50 h-16 w-full shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
                <MobileNavItem to="/" icon={<Clock />} label="タイマー" active={location.pathname === '/'} />
                <MobileNavItem to="/logs" icon={<History />} label="履歴" active={location.pathname === '/logs'} />
                <MobileNavItem to="/reports" icon={<FileText />} label="報告書" active={location.pathname === '/reports'} />
                <MobileNavItem to="/clients" icon={<Users />} label="管理" active={location.pathname === '/clients'} />
                <MobileNavItem to="/analytics" icon={<BarChart2 />} label="分析" active={location.pathname === '/analytics'} />
            </nav>
        </div>
        {state.activeEntryId && (<DraggableTimer activeClientName={activeClientName} onStop={() => dispatch({type:'STOP_TIMER'})} elapsedTime={formatTimeShort(floatingElapsed)} onTogglePiP={handleTogglePiP} isPiPActive={isPiPActive} />)}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
             <div className="bg-white w-full max-w-lg rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-y-auto mx-4">
                <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800 tracking-tight">設定</h3><button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 active:scale-90 transition-all"><X size={24} fill="none" strokeWidth={2.5} /></button></div>
                <div className="mb-4"><label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">ユーザー設定</label><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><label className="text-[8px] font-bold text-slate-400 mb-1 block">表示名 (報告書の発行者名)</label><Input value={state.settings.userName === 'Freelancer' ? (user?.user_metadata?.full_name || user?.user_metadata?.name || state.settings.userName) : state.settings.userName} onChange={e => dispatch({ type: 'UPDATE_GOALS', payload: { userName: e.target.value } })} className="!bg-white !p-2 !border-none !text-sm font-bold" /></div></div>
                <div className="mb-8"><label className="text-[10px] font-black text-slate-400 block mb-4 uppercase tracking-widest">目標設定</label><div className="grid grid-cols-2 gap-4"><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><label className="text-[8px] font-bold text-slate-400 mb-1 block">月間売上目標</label><Input type="number" value={state.settings.monthlyGoalRevenue} onChange={e => dispatch({ type: 'UPDATE_GOALS', payload: { monthlyGoalRevenue: Number(e.target.value) } })} className="!bg-white !p-0 !border-none !text-lg !font-black" /></div><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><label className="text-[8px] font-bold text-slate-400 mb-1 block">月間稼働目標(h)</label><Input type="number" value={state.settings.monthlyGoalHours} onChange={e => dispatch({ type: 'UPDATE_GOALS', payload: { monthlyGoalHours: Number(e.target.value) } })} className="!bg-white !p-0 !border-none !text-lg !font-black" /></div></div></div>
                <div className="mb-8"><label className="text-[10px] font-black text-slate-400 block mb-4 uppercase tracking-widest">通知設定</label><div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm"><BellRing size={20}/></div><div><div className="text-xs font-black text-slate-800">ブラウザ通知</div><div className="text-[9px] text-slate-400 font-bold">長時間稼働時にアラートを表示</div></div></div><button onClick={() => { if (!state.settings.enableNotifications) { Notification.requestPermission(); } dispatch({ type: 'UPDATE_GOALS', payload: { enableNotifications: !state.settings.enableNotifications } }) }} className={`w-12 h-7 rounded-full transition-colors relative ${state.settings.enableNotifications ? 'theme-bg' : 'bg-slate-200'}`}><div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${state.settings.enableNotifications ? 'left-6' : 'left-1'}`}></div></button></div></div>
                <div className="mb-8"><label className="text-[10px] font-black text-slate-400 block mb-4 uppercase tracking-widest">テーマ & スタイル</label><div className="flex flex-wrap gap-4">{themeColors.map(color => (<button key={color.value} onClick={() => dispatch({ type: 'UPDATE_THEME', payload: color.value })} className={`w-12 h-12 rounded-2xl border-[3px] transition-all relative group overflow-hidden ${state.settings.themeColor === color.value ? 'border-slate-800 scale-110 shadow-lg' : 'border-transparent opacity-80'}`} style={{ background: color.value }}>{state.settings.themeColor === color.value && <div className="absolute inset-0 flex items-center justify-center text-slate-800 mix-blend-overlay"><Check size={20} strokeWidth={4} /></div>}</button>))}</div></div>
                <div className="mb-8">
                     <button onClick={() => { setIsSettingsOpen(false); navigate('/usage'); }} className="w-full bg-slate-100 text-slate-700 font-bold h-14 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
                        <BookOpen size={18} /> 使い方ガイドを見る
                     </button>
                </div>

                <Button onClick={() => setIsSettingsOpen(false)} className="w-full theme-bg contrast-text border-none font-black h-16 rounded-[24px] text-lg mb-8">設定を完了</Button>

                {/* Account Section */}
                <div className="mb-4">
                  <label className="text-[10px] font-black text-slate-400 block mb-4 uppercase tracking-widest">アカウント</label>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                      {user?.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="avatar" className="w-12 h-12 rounded-full" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                          {(user?.email?.[0] || 'U').toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-800 truncate">{user?.user_metadata?.full_name || user?.user_metadata?.name || 'ユーザー'}</div>
                        <div className="text-xs text-slate-400 truncate">{user?.email}</div>
                      </div>
                      <div className="flex items-center gap-1 text-green-500">
                        <Cloud size={14} />
                        <span className="text-xs font-medium">同期中</span>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (confirm('ログアウトしますか？ローカルのデータは保持されます。')) {
                          await signOut();
                          setIsSettingsOpen(false);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-bold text-sm transition-colors"
                    >
                      <LogOut size={16} /> ログアウト
                    </button>
                  </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  return (<HashRouter><AppLayout /></HashRouter>);
};

export default App;
