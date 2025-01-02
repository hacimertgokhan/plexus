import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';
import debounce from "lodash/debounce";

const CodeEditor = React.memo(({ language, value, onChange }) => {
    const editorRef = useRef(null);
    const [localValue, setLocalValue] = useState(value);

    // Değişiklikleri ana bileşene iletmek için debounce kullanıyoruz
    const debouncedOnChange = useCallback(
        debounce((newValue) => {
            onChange(newValue);
        }, 100),
        [onChange]
    );

    // TextArea'daki değişiklikleri yönetiyoruz
    const handleChange = useCallback((e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        debouncedOnChange(newValue);
    }, [debouncedOnChange]);

    // Prism ile kod vurgulamayı yönetiyoruz
    const highlightedCode = useMemo(() => {
        try {
            return Prism.highlight(
                localValue || '',
                Prism.languages[language] || Prism.languages.javascript,
                language
            );
        } catch (error) {
            console.error('Highlighting error:', error);
            return localValue || '';
        }
    }, [localValue, language]);

    // Satır numaralarını hesaplıyoruz
    const lineNumbers = useMemo(() => {
        const lines = (localValue || '').split('\n').length;
        return Array.from({ length: lines }, (_, i) => i + 1);
    }, [localValue]);

    // Tab tuşunu yönetiyoruz
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const newValue = localValue.substring(0, start) + '    ' + localValue.substring(end);
            setLocalValue(newValue);
            debouncedOnChange(newValue);

            // Cursor pozisyonunu güncelliyoruz
            requestAnimationFrame(() => {
                e.target.selectionStart = e.target.selectionEnd = start + 4;
            });
        }
    }, [localValue, debouncedOnChange]);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    return (
        <div className="w-full h-full rounded-lg overflow-hidden border relative font-mono">
            <div className="w-full h-full flex">
                {/* Satır numaraları */}
                <div className="p-4 text-right text-gray-500 select-none bg-opacity-50 w-[50px]">
                    {lineNumbers.map((num) => (
                        <div key={num} className="leading-6">
                            {num}
                        </div>
                    ))}
                </div>

                {/* Editor container */}
                <div className="relative flex-grow overflow-auto">
                    {/* TextArea */}
                    <textarea
                        ref={editorRef}
                        value={localValue}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        className="absolute top-0 left-0 w-full h-full p-4 font-mono text-transparent caret-white bg-transparent resize-none outline-none z-10"
                        spellCheck="false"
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                    />

                    {/* Syntax highlighting */}
                    <pre className="w-full h-full p-4 m-0 overflow-hidden whitespace-pre-wrap break-words">
                        <code
                            className={`language-${language}`}
                            dangerouslySetInnerHTML={{ __html: highlightedCode }}
                        />
                    </pre>
                </div>
            </div>
        </div>
    );
});

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;