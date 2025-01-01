import React, { useState, useEffect } from 'react';
import Prism from 'prismjs';
// Sadece temel diller
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

const CodeEditor = () => {
    const [code, setCode] = useState('// Write your code here...');
    const [language, setLanguage] = useState('javascript');
    const [lineNumbers, setLineNumbers] = useState(['1']);
    const [highlightedCode, setHighlightedCode] = useState('');

    // Sadece temel diller
    const languages = [
        { value: 'javascript', label: 'JavaScript' },
        { value: 'python', label: 'Python' }
    ];

    useEffect(() => {
        try {
            // Highlight işlemini güvenli bir şekilde yap
            const highlighted = Prism.highlight(
                code,
                Prism.languages[language] || Prism.languages.javascript,
                language
            );
            setHighlightedCode(highlighted);

            const lines = code.split('\n');
            const newLineNumbers = lines.map((_, i) => (i + 1).toString());
            setLineNumbers(newLineNumbers);
        } catch (error) {
            console.error('Highlighting error:', error);
            setHighlightedCode(code);
        }
    }, [code, language]);

    const handleCodeChange = (e) => {
        setCode(e.target.value);
    };

    const handleLanguageChange = (e) => {
        setLanguage(e.target.value);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code);
    };

    return (
        <div className="w-full max-w-4xl rounded-lg overflow-hidden border border-gray-200 bg-gray-800">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-700">
                <select
                    value={language}
                    onChange={handleLanguageChange}
                    className="px-2 py-1 rounded bg-gray-600 text-white text-sm"
                >
                    {languages.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                            {lang.label}
                        </option>
                    ))}
                </select>
                <button
                    onClick={copyToClipboard}
                    className="px-3 py-1 text-sm rounded bg-gray-600 hover:bg-gray-500 text-white"
                >
                    Copy
                </button>
            </div>

            {/* Editor Area */}
            <div className="relative flex">
                {/* Line Numbers */}
                <div className="p-4 text-right bg-gray-900 text-gray-500 select-none">
                    {lineNumbers.map((num) => (
                        <div key={num} className="leading-6">
                            {num}
                        </div>
                    ))}
                </div>

                {/* Code Input */}
                <div className="relative flex-grow">
          <textarea
              value={code}
              onChange={handleCodeChange}
              className="w-full h-full p-4 bg-transparent text-transparent font-mono leading-6 focus:outline-none resize-none absolute z-10 caret-white"
              spellCheck="false"
              rows={10}
          />
                    <pre className="w-full h-full p-4 m-0 font-mono leading-6 pointer-events-none">
            <code
                className={`language-${language}`}
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </pre>
                </div>
            </div>

            {/* Status Bar */}
            <div className="px-4 py-2 bg-gray-700 text-gray-300 text-sm flex justify-between items-center">
                <div>
                    <span>Lines: {lineNumbers.length}</span>
                    <span className="mx-4">|</span>
                    <span>Characters: {code.length}</span>
                </div>
                <div>
                    <span className="text-blue-300">{language.toUpperCase()}</span>
                </div>
            </div>
        </div>
    );
};

export default CodeEditor;