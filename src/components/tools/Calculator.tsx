import React, { useState } from 'react';

export default function Calculator() {
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');

    const handleNumber = (num: string) => {
        if (display === '0' || display === 'Error') {
            setDisplay(num);
        } else {
            setDisplay(display + num);
        }
    };

    const handleOperator = (op: string) => {
        // Prevent multiple consecutive operators
        if (equation && !display && (op === '+' || op === '-' || op === '*' || op === '/')) {
            setEquation(equation.slice(0, -3) + ' ' + op + ' ');
            return;
        }
        setEquation(equation + display + ' ' + op + ' ');
        setDisplay('0');
    };

    const calculate = () => {
        if (!equation && !display) return;
        try {
            // Replace 'x' with '*' if exists, although we use '*' in UI
            const calcString = equation + display;
            // Safe eval using Function
            const result = new Function('return ' + calcString)();
            if (Number.isNaN(result) || !Number.isFinite(result)) {
                setDisplay('Error');
            } else {
                setDisplay(String(result));
            }
            setEquation('');
        } catch (e) {
            setDisplay('Error');
            setEquation('');
        }
    };

    const clear = () => {
        setDisplay('0');
        setEquation('');
    };
    
    const del = () => {
       if (display.length > 1) {
          setDisplay(display.slice(0, -1));
       } else {
          setDisplay('0');
       }
    };

    return (
        <div className="flex flex-col bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden mt-4 shadow-xl select-none">
            <div className="p-4 bg-gray-50 dark:bg-zinc-800 text-right flex-col flex justify-end h-32 w-full">
                <div className="text-gray-500 text-sm h-6 break-all">{equation}</div>
                <div className="text-4xl font-semibold text-gray-900 dark:text-gray-100 truncate w-full">{display}</div>
            </div>
            <div className="grid grid-cols-4 gap-[1px] bg-gray-200 dark:bg-zinc-700 p-[1px]">
                {['C', 'DEL', '%', '/'].map(btn => (
                    <button key={btn} onClick={() => btn === 'C' ? clear() : btn === 'DEL' ? del() : btn === '/' ? handleOperator('/') : btn === '%' ? handleOperator('%') : handleNumber(btn)} className="bg-white dark:bg-zinc-900 py-5 font-medium hover:bg-gray-100 dark:hover:bg-zinc-800 text-blue-500 active:bg-gray-200 dark:active:bg-zinc-700 transition">{btn}</button>
                ))}
                {['7', '8', '9', '*'].map(btn => (
                    <button key={btn} onClick={() => btn === '*' ? handleOperator('*') : handleNumber(btn)} className={`bg-white dark:bg-zinc-900 py-5 font-medium hover:bg-gray-100 dark:hover:bg-zinc-800 active:bg-gray-200 dark:active:bg-zinc-700 transition ${btn === '*' ? 'text-blue-500 text-xl' : ''}`}>{btn === '*' ? 'x' : btn}</button>
                ))}
                {['4', '5', '6', '-'].map(btn => (
                    <button key={btn} onClick={() => btn === '-' ? handleOperator('-') : handleNumber(btn)} className={`bg-white dark:bg-zinc-900 py-5 font-medium hover:bg-gray-100 dark:hover:bg-zinc-800 active:bg-gray-200 dark:active:bg-zinc-700 transition ${btn === '-' ? 'text-blue-500 text-xl' : ''}`}>{btn}</button>
                ))}
                {['1', '2', '3', '+'].map(btn => (
                    <button key={btn} onClick={() => btn === '+' ? handleOperator('+') : handleNumber(btn)} className={`bg-white dark:bg-zinc-900 py-5 font-medium hover:bg-gray-100 dark:hover:bg-zinc-800 active:bg-gray-200 dark:active:bg-zinc-700 transition ${btn === '+' ? 'text-blue-500 text-xl' : ''}`}>{btn}</button>
                ))}
                {['00', '0', '.', '='].map(btn => (
                    <button key={btn} onClick={() => btn === '=' ? calculate() : handleNumber(btn)} className={`bg-white dark:bg-zinc-900 py-5 font-medium hover:bg-gray-100 dark:hover:bg-zinc-800 active:bg-gray-200 dark:active:bg-zinc-700 transition ${btn === '=' ? 'bg-blue-600 text-white hover:bg-blue-700 font-bold active:bg-blue-800' : ''}`}>{btn}</button>
                ))}
            </div>
        </div>
    );
}
