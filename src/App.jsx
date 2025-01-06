import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarSeparator, MenubarShortcut,
    MenubarSub,
    MenubarSubContent,
    MenubarSubTrigger,
    MenubarTrigger,
} from "@/components/ui/menubar";
import {writeTextFile,create, exists, readTextFile, readDir} from "@tauri-apps/plugin-fs";
import { open, save } from "@tauri-apps/plugin-dialog";
import {appDataDir, documentDir} from '@tauri-apps/api/path';
import {
    FileIcon,
    Package2Icon,
    Code2Icon,
    SettingsIcon,
    X,
    CopyIcon,
    FolderOpen,
    FolderClosed,
    TerminalIcon
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import FileExplorer from "@/components/plexus/FileExplorer.jsx";
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';
import {SUGGESTIONS} from "@/lib/suggestions.js";
import {BRACKETS_MAP} from "@/lib/brackets.js";
import {Toaster} from "@/components/ui/sonner";
import {toast} from "sonner";
import ReactMarkdown from 'react-markdown';
import SpotifyPlayer from "@/components/plexus/features/Spotify.jsx";

const CodeEditor = React.memo(({ language, value, onChange, onSave }) => {
    const editorRef = useRef(null);
    const [localValue, setLocalValue] = useState(value);
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleChange = useCallback((e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onChange(newValue);

        const lines = newValue.split('\n');
        const cursorPosition = e.target.selectionStart;
        let currentLineIndex = 0;
        let charCount = 0;

        while (charCount + lines[currentLineIndex]?.length + 1 <= cursorPosition && currentLineIndex < lines.length) {
            charCount += lines[currentLineIndex].length + 1;
            currentLineIndex++;
        }

        const currentLine = lines[currentLineIndex] || '';
        const words = currentLine.trim().split(/\s+/);
        const lastWord = words.pop() || ''; // Son kelimeyi alıyoruz

        const suggestionsForLanguage = SUGGESTIONS[language?.toLowerCase()] || {};
        let matchingSuggestions = [];

        if (lastWord) {
            matchingSuggestions = Object.keys(suggestionsForLanguage).filter(key =>
                key.startsWith(lastWord)
            ).reduce((acc, key) => {
                acc.push(...suggestionsForLanguage[key]);
                return acc
            }, []);
        }

        if (matchingSuggestions.length > 0) {
            const rect = editorRef.current?.getBoundingClientRect();
            const lineHeight = 24;

            setSuggestionPosition({
                top: (currentLineIndex + 1) * lineHeight,
                left: currentLine.length * 8,
            });
            setSuggestions(matchingSuggestions);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
            setSuggestions([]);
        }
    }, [onChange, language]);

    const handleKeyPress = useCallback((e) => {
        const openingBracket = e.key;
        if (BRACKETS_MAP[openingBracket]) {
            e.preventDefault();

            const cursorPos = editorRef.current.selectionStart;
            const selectionEnd = editorRef.current.selectionEnd;
            const hasSelection = cursorPos !== selectionEnd;

            let newValue;
            if (hasSelection) {
                const selectedText = localValue.substring(cursorPos, selectionEnd);
                newValue =
                    localValue.substring(0, cursorPos) +
                    openingBracket +
                    selectedText +
                    BRACKETS_MAP[openingBracket] +
                    localValue.substring(selectionEnd);
            } else {
                newValue =
                    localValue.substring(0, cursorPos) +
                    openingBracket +
                    BRACKETS_MAP[openingBracket] +
                    localValue.substring(cursorPos);
            }

            setLocalValue(newValue);
            onChange(newValue);

            requestAnimationFrame(() => {
                editorRef.current.selectionStart = editorRef.current.selectionEnd = cursorPos + (hasSelection ? 2 : 1);
            });
        }
    }, [localValue, onChange]);

    const handleSuggestionSelect = useCallback((suggestion) => {
        const lines = localValue.split('\n');
        const cursorPosition = editorRef.current.selectionStart;
        let currentLineIndex = 0;
        let charCount = 0;

        while (charCount + lines[currentLineIndex]?.length + 1 <= cursorPosition) {
            charCount += lines[currentLineIndex].length + 1;
            currentLineIndex++;
        }

        const currentLine = lines[currentLineIndex];
        const lastWord = currentLine.trim().split(/\s+/).pop();

        // Son kelimeyi sadece seçilen öneri ile değiştirme
        lines[currentLineIndex] = currentLine.replace(lastWord, suggestion);

        const newValue = lines.join('\n');
        setLocalValue(newValue);
        onChange(newValue);
        setShowSuggestions(false);
    }, [localValue, onChange]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const newValue = localValue.substring(0, start) + '    ' + localValue.substring(end);
            setLocalValue(newValue);
            onChange(newValue);

            requestAnimationFrame(() => {
                e.target.selectionStart = e.target.selectionEnd = start + 4;
            });
        } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onSave?.();
        } else if (showSuggestions && e.key === 'Enter') {
            e.preventDefault();
            suggestions[0] && handleSuggestionSelect(suggestions[0]);
        } else if (showSuggestions && e.key === 'Escape') {
            setShowSuggestions(false);
        } else if (e.ctrlKey && e.key === ' ') { // CTRL + Space tuş kombinasyonu
            e.preventDefault();
            // Kütüphanedeki tüm önerileri göstermek
            const suggestionsForLanguage = SUGGESTIONS[language?.toLowerCase()] || {};
            let allSuggestions = [];
            Object.keys(suggestionsForLanguage).forEach(key => {
                allSuggestions.push(...suggestionsForLanguage[key]);
            });
            setSuggestions(allSuggestions);
            setShowSuggestions(true);
        }
    }, [localValue, onChange, onSave, showSuggestions, suggestions, handleSuggestionSelect, language]);

    useEffect(() => {
        if (value !== localValue) {
            setLocalValue(value);
        }
    }, [value]);

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

    const lineNumbers = useMemo(() => Array.from({ length: (localValue || '').split('\n').length }, (_, i) => i + 1), [localValue]);

    const wordCount = useMemo(() => (localValue.match(/\b\w+\b/g) || []).length, [localValue]);

    const charCount = useMemo(() => localValue.length, [localValue]);

    const fileSize = useMemo(() => new Blob([localValue]).size, [localValue]);

    const isMarkdown = language === 'markdown';

    const MarkdownPreview = ({ content }) => {
        return (
            <div className="w-1/2 h-full dark:bg-gray-800 overflow-auto">
                <div className="p-8">
                    <article className="prose dark:prose-invert prose-headings:mt-4 prose-headings:mb-4 max-w-none">
                        <ReactMarkdown
                            components={{
                                h1: ({ node, ...props }) => <h1 className="text-4xl font-bold mb-4" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-3xl font-bold mb-3" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-2xl font-bold mb-3" {...props} />,
                                h4: ({ node, ...props }) => <h4 className="text-xl font-bold mb-2" {...props} />,
                                h5: ({ node, ...props }) => <h5 className="text-lg font-bold mb-2" {...props} />,
                                h6: ({ node, ...props }) => <h6 className="text-base font-bold mb-2" {...props} />,
                                p: ({ node, ...props }) => <p className="mb-4" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4" {...props} />,
                                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                blockquote: ({ node, ...props }) => (
                                    <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-4" {...props} />
                                ),
                                code: ({ node, inline, ...props }) =>
                                    inline ? (
                                        <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded" {...props} />
                                    ) : (
                                        <code className="block bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4" {...props} />
                                    ),
                                pre: ({ node, ...props }) => (
                                    <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4 overflow-x-auto" {...props} />
                                ),
                                a: ({ node, ...props }) => (
                                    <a className="text-blue-500 hover:text-blue-600 underline" {...props} />
                                ),
                                strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                                em: ({ node, ...props }) => <em className="italic" {...props} />,
                                hr: () => <hr className="my-8 border-gray-300 dark:border-gray-600" />,
                                img: ({ node, ...props }) => (
                                    <img className="max-w-full h-auto rounded my-4" {...props} alt={props.alt || ''} />
                                ),
                                table: ({ node, ...props }) => (
                                    <table className="min-w-full border border-gray-300 my-4" {...props} />
                                ),
                                th: ({ node, ...props }) => (
                                    <th className="border border-gray-300 px-4 py-2 bg-gray-100" {...props} />
                                ),
                                td: ({ node, ...props }) => (
                                    <td className="border border-gray-300 px-4 py-2" {...props} />
                                ),
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </article>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full h-full rounded-lg overflow-hidden border relative font-mono">
            <div className="p-2 text-sm flex items-center gap-2 w-full border-b">
                <span className="ml-2">{wordCount}<sup>words</sup></span> |
                <span>{charCount}<sup>chars</sup></span> |
                <span>{fileSize}<sup>bytes</sup></span> |
                <span>{lineNumbers.length}<sup>line</sup></span>
            </div>
            <div className="w-full h-[1000px] flex">
                {/* Editor bölümü */}
                <div className={`relative ${isMarkdown ? 'w-1/2 border-r' : 'w-full'} overflow-auto`}>
                    <textarea
                        ref={editorRef}
                        value={localValue}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onKeyPress={handleKeyPress}
                        onScroll={(e) => {
                            const scrollTop = e.target.scrollTop;
                            const scrollLeft = e.target.scrollLeft;
                            document.querySelector('.code-preview').scrollTop = scrollTop;
                            document.querySelector('.code-preview').scrollLeft = scrollLeft;
                        }}
                        className="absolute top-0 left-0 w-full h-full p-4 font-mono text-transparent caret-white bg-transparent resize-none outline-none z-10"
                        spellCheck="false"
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                    />

                    <pre
                        className="code-preview absolute top-0 left-0 w-full h-full p-4 m-0 overflow-hidden whitespace-pre-wrap break-words pointer-events-none"
                        style={{
                            fontFamily: 'monospace',
                            fontSize: 'inherit',
                            lineHeight: 'inherit',
                        }}
                    >
                        <code
                            className={`language-${language}`}
                            dangerouslySetInnerHTML={{__html: highlightedCode}}
                        />
                    </pre>
                </div>

                {isMarkdown && <MarkdownPreview content={localValue} />}

                {showSuggestions && (
                    <div
                        className="absolute z-20 translate-y-7 bg-[#101010] border rounded-[6px] shadow-lg"
                        style={{
                            top: suggestionPosition.top,
                            left: suggestionPosition.left - 10,
                        }}
                    >
                        {suggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                className="px-4 py-2 transition-all hover:text-orange-200 hover:bg-[#202020] cursor-pointer"
                                onClick={() => handleSuggestionSelect(suggestion)}
                            >
                                {suggestion}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>);
});

CodeEditor.displayName = 'CodeEditor';

const languageExtensions = {
    'javascript': 'js',
    'python': 'py',
    'java': 'java',
    'cpp': 'cpp',
    'typescript': 'ts',
    'html': 'html',
    'css': 'css',
    'rust': 'rs',
    'go': 'go',
    'markdown': 'md',
};

const IDE = () => {
    const [tabs, setTabs] = useState([
        {id: 1, name: 'untitled-1.js', content: '// Welcome to Plexus IDE\n', language: 'javascript', filePath: null}
    ]);
    const [activeTab, setActiveTab] = useState(1);
    const [nextTabId, setNextTabId] = useState(2);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [folderSection, setFolderSection] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const activeTabData = useMemo(() =>
            tabs.find(tab => tab.id === activeTab),
        [tabs, activeTab]
    );

    const tabContentRef = useRef({});

    const updateTabContent = useCallback((content) => {
        const tabId = activeTab;
        tabContentRef.current[tabId] = content;

        setTabs(prevTabs =>
            prevTabs.map(tab =>
                tab.id === tabId
                    ? {...tab, content: tabContentRef.current[tabId]}
                    : tab
            )
        );
    }, [activeTab]);

    const closeTab = useCallback((tabId, e) => {
        e.stopPropagation();
        if (tabs.length === 1) return;

        setTabs(prevTabs => {
            const newTabs = prevTabs.filter(tab => tab.id !== tabId);
            setActiveTab(newTabs[newTabs.length - 1].id);
            return newTabs;
        });
    }, [tabs.length]);


    const languageOptions = useMemo(() =>
            Object.keys(languageExtensions).map(lang => ({
                value: lang,
                label: lang.charAt(0).toUpperCase() + lang.slice(1)
            })),
        []
    );

    const saveFileToDisk = useCallback(async (tabId) => {
        const tab = tabs.find(tab => tab.id === tabId);
        if (!tab) return;

        try {
            const content = tabContentRef.current[tabId] || tab.content;
            let filePath = tab.filePath;

            if (!filePath) {
                filePath = await save({
                    title: "Save File",
                    filters: [{
                        name: tab.language,
                        extensions: [languageExtensions[tab.language]]
                    }]
                });
            }

            if (filePath) {
                await writeTextFile(filePath, content);
                setTabs(prevTabs =>
                    prevTabs.map(t =>
                        t.id === tabId
                            ? { ...t, filePath, saved: true, name: filePath.split('/').pop() }
                            : t
                    )
                );
            }
        } catch (error) {
            console.error("Failed to save file:", error);
        }
    }, [tabs]);
    const createFolder = useCallback(async (folderName) => {
        try {
            if (!folderName) return;
            const baseDirectory = await appDataDir(); // appDataDir() kullanabilirsiniz
            const folderPath = `${baseDirectory}/${folderName}`;
            const folderExists = await exists(folderPath);
            if (folderExists) {
                console.log(`Folder "${folderName}" created successfully at ${folderPath}`);
                toast.error("Folder already exists.");
                return;
            }
            await create(folderPath);
            toast.success("Folder created.");
            await openSpecifiedFolder(folderPath);
            console.log(`Folder "${folderName}" created successfully at ${folderPath}`);
        } catch (error) {
            toast.error("Folder cannot be created.");
            console.error("Failed to create folder:", error);
        }
    }, [tabs]);



    useEffect(() => {
        if (!autoSaveEnabled) return;

        const autoSaveInterval = setInterval(() => {
            const currentTab = tabs.find(tab => tab.id === activeTab);
            if (currentTab?.filePath) {
                saveFileToDisk(activeTab);
            }
        }, 30000); // 30 saniyede bir auto-save

        return () => clearInterval(autoSaveInterval);
    }, [autoSaveEnabled, activeTab, tabs, saveFileToDisk]);

    const openFile = useCallback(async () => {
        try {
            const filePath = await open({
                filters: [{ name: 'All Files', extensions: ['*'] }]
            });
            if (filePath) {
                const fileContent = await readTextFile(filePath);
                const ext = filePath.split('.').pop();
                const language = Object.keys(languageExtensions).find(lang => languageExtensions[lang] === ext) || 'javascript';
                const newTab = {
                    id: nextTabId,
                    name: `${filePath.split('/').pop()}`,
                    content: fileContent,
                    language,
                    filePath
                };
                setTabs([...tabs, newTab]);
                setActiveTab(nextTabId);
                setNextTabId(nextTabId + 1);
            }
        } catch (error) {
            console.error("Failed to open file:", error);
        }
    }, [tabs, nextTabId]);

    const createNewTab = (language = 'javascript') => {
        const ext = languageExtensions[language];
        const newTab = {
            id: nextTabId,
            name: `untitled-${nextTabId}.${ext}`,
            content: `// New ${language} file\n`,
            language,
            filePath: null
        };
        setTabs([...tabs, newTab]);
        setActiveTab(nextTabId);
        setNextTabId(nextTabId + 1);
    };

    const createNewTabWithSpecifiedFile = async (name, content, path, language = 'javascript') => {
        const fileContent = await readTextFile(path);
        const newTab = {
            id: nextTabId,
            name: name,
            content: fileContent,
            language,
            filePath: path,
        };
        setTabs([...tabs, newTab]);
        setActiveTab(nextTabId);
        setNextTabId(nextTabId + 1);
    };

    const updateTabLanguage = (language) => {
        setTabs(tabs.map(tab => {
            if (tab.id === activeTab) {
                const ext = languageExtensions[language];
                const baseName = tab.name.split('.')[0];
                return {
                    ...tab,
                    name: `${baseName}.${ext}`,
                    language
                };
            }
            return tab;
        }));
    };

    const createFrameworkProject = useCallback(async (framework) => {
        try {
            const result = await invoke("create_project_command", { framework });
        } catch (error) {
            console.error("Failed to create project:", error);
        }
    }, []);

    const openSpecifiedFolder = useCallback(async (folderPath) => {
        try {
            if (!folderPath || typeof folderPath !== 'string' || !folderPath.trim()) {
                throw new Error("Invalid or empty folder path.");
            }

            // Klasörü açıyoruz
            setLoading(true);
            try {
                // `readDir` ile klasörün erişilebilir olup olmadığını kontrol ediyoruz
                await readDir(folderPath);
                setCurrentFolder(folderPath);  // Klasörü currentFolder olarak ayarlıyoruz
                setError(''); // Hata varsa temizliyoruz
                console.log(`Folder opened: ${folderPath}`);
            } catch (err) {
                throw new Error(`Selected folder is not accessible: ${err.message}`);
            } finally {
                setLoading(false);
            }
        } catch (error) {
            console.error("Failed to open folder:", error);
            setError(`Failed to open folder: ${error.message}`);
            setLoading(false);
        }
    }, []);

    const openFolder = useCallback(async () => {
        try {
            const folderPath = await open({
                directory: true,
                multiple: false,
                recursive: true,
                defaultPath: currentFolder || undefined
            });
            if (!folderPath) {
                console.log("Folder selection cancelled");
                return;
            }
            if (typeof folderPath !== 'string') {
                throw new Error("Invalid folder path type");
            }
            if (!folderPath.trim()) {
                throw new Error("Empty folder path");
            }
            setLoading(true);
            try {
                await readDir(folderPath);
                setCurrentFolder(folderPath);
                setFolderSection(true)
                console.log(folderPath)
                setError('');
            } catch (err) {
                throw new Error(`Selected folder is not accessible: ${err.message}`);
            } finally {
                setLoading(false);
            }

        } catch (error) {
            console.error("Failed to open folder:", error);
            setError(`Failed to open folder: ${error.message}`);
            setLoading(false);
        }
    }, [currentFolder]); // currentFolder dependency'si ekledik

    const handleFileSelect = async (filePath, lang) => {
        try {
            const fileContent = await readTextFile(filePath);
            const newTab = {
                id: nextTabId,
                name: filePath.split('/').pop(),
                content: fileContent,
                language: lang,
                filePath
            };

            setTabs([...tabs, newTab]);
            setActiveTab(nextTabId);
            setNextTabId(nextTabId + 1);
        } catch (error) {
            console.error("Failed to open file:", error);
        }
    };

    const handleSave = useCallback(() => {
        const currentTab = tabs.find(tab => tab.id === activeTab);
        if (currentTab) {
            if (currentTab.filePath) {
                saveFileToDisk(activeTab);
            } else {
                saveFileToDisk(activeTab);
            }
        }
    }, [activeTab, tabs, saveFileToDisk]);

    return (
        <div className="w-screen h-screen">
            <Toaster/>
            <Card className="bg-background w-full h-full border-none">
                <div className="w-full h-full flex flex-col">
                    <div className="flex border-[1px] items-center sticky w-full justify-between px-4 py-2">
                        <div className="flex items-center -ml-3 h-[20px] flex-row justify-start">
                            <Menubar className="shadow-none border-none">
                                <MenubarMenu>
                                    <MenubarTrigger className="text-sm flex flex-row items-center justify-center gap-1"><FileIcon size={14}/> File</MenubarTrigger>
                                    <MenubarContent>
                                        <MenubarSub>
                                            <MenubarItem onClick={openFile}>
                                                Open File <MenubarShortcut>⌘+Alt+A</MenubarShortcut>
                                            </MenubarItem>
                                            <MenubarItem onClick={openFolder}>
                                                Open Folder <MenubarShortcut>⌘+K</MenubarShortcut>
                                            </MenubarItem>
                                            <MenubarSubTrigger>New File</MenubarSubTrigger>
                                            <MenubarSubContent>
                                                {Object.keys(languageExtensions).map(lang => (
                                                    <MenubarItem key={lang} onClick={() => createNewTab(lang)}>
                                                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                                                    </MenubarItem>
                                                ))}
                                            </MenubarSubContent>
                                            <MenubarItem onClick={() => {createFolder("plexus")}}>
                                                Create Folder <MenubarShortcut>⌘+ALT+C</MenubarShortcut>
                                            </MenubarItem>
                                        </MenubarSub>
                                        <MenubarSeparator/>
                                        <MenubarItem onClick={() => handleSave()}>
                                            Save <MenubarShortcut>⌘S</MenubarShortcut>
                                        </MenubarItem>
                                        <MenubarItem onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}>
                                            {autoSaveEnabled ? 'Disable' : 'Enable'} Auto-save
                                        </MenubarItem>
                                    </MenubarContent>
                                </MenubarMenu>
                                <MenubarMenu>
                                    <MenubarTrigger
                                        className="text-sm flex flex-row items-center justify-center gap-1"><Package2Icon
                                        size={14}/> Projects</MenubarTrigger>
                                    <MenubarContent>
                                        <MenubarSub>
                                            <MenubarSubTrigger>New Web Project</MenubarSubTrigger>
                                            <MenubarSubContent>
                                                <MenubarItem
                                                    onClick={() => createFrameworkProject('HTML')}>HTML</MenubarItem>
                                                <MenubarItem
                                                    onClick={() => createFrameworkProject('Next')}>Next</MenubarItem>
                                                <MenubarItem
                                                    onClick={() => createFrameworkProject('React')}>React</MenubarItem>
                                                <MenubarItem
                                                    onClick={() => createFrameworkProject('Angular')}>Angular</MenubarItem>
                                            </MenubarSubContent>
                                        </MenubarSub>
                                        <MenubarSub>
                                            <MenubarSubTrigger>New App Project</MenubarSubTrigger>
                                            <MenubarSubContent>
                                                <MenubarItem
                                                    onClick={() => createFrameworkProject('Tauri')}>Tauri</MenubarItem>
                                                <MenubarItem
                                                    onClick={() => createFrameworkProject('Electron')}>Electron</MenubarItem>
                                                <MenubarItem onClick={() => createFrameworkProject('ReactNative')}>React
                                                    Native</MenubarItem>
                                                <MenubarItem
                                                    onClick={() => createFrameworkProject('Expo')}>Expo</MenubarItem>
                                            </MenubarSubContent>
                                        </MenubarSub>
                                    </MenubarContent>
                                </MenubarMenu>

                                <MenubarMenu>
                                    <MenubarTrigger className="text-sm flex flex-row items-center justify-center gap-1">
                                        <SettingsIcon size={14}/> Settings</MenubarTrigger>
                                    <MenubarContent>
                                        <MenubarItem>
                                            Window
                                        </MenubarItem>
                                        <MenubarSub>
                                            <MenubarSubTrigger>Layout</MenubarSubTrigger>
                                            <MenubarSubContent>
                                                <MenubarItem onClick={() => {
                                                    setFolderSection(!folderSection)
                                                    toast(`Folder section ${folderSection === true ? "disabled" : "enabled"}.`, {
                                                        description: `${new Date().toLocaleTimeString().toLocaleString()}`,
                                                    })
                                                }} className={"flex flex-row items-center justify-center gap-1"}>{folderSection === true ? <FolderOpen size={14}/> : <FolderClosed size={14}/>} Folder Section</MenubarItem>
                                            </MenubarSubContent>
                                        </MenubarSub>
                                        <MenubarItem>
                                            Optimization
                                        </MenubarItem>
                                    </MenubarContent>
                                </MenubarMenu>

                                <MenubarMenu>
                                    <MenubarTrigger className="text-sm flex flex-row items-center justify-center gap-1">
                                        <Code2Icon size={14}/> Plexus
                                    </MenubarTrigger>
                                    <MenubarContent>
                                        <MenubarItem>
                                            <a
                                                href="https://github.com/hacimertgokhan/plexus"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full h-full"
                                            >
                                                Repository
                                            </a>
                                        </MenubarItem>
                                        <MenubarItem>
                                            <a
                                                href="https://github.com/hacimertgokhan/plexus/graphs/contributors"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full h-full"
                                            >
                                                Developers
                                            </a>
                                        </MenubarItem>
                                    </MenubarContent>
                                </MenubarMenu>
                            </Menubar>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select
                                value={tabs.find(tab => tab.id === activeTab)?.language}
                                onValueChange={updateTabLanguage}
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(languageExtensions).map(lang => (
                                        <SelectItem key={lang} value={lang}>
                                            {lang.charAt(0).toUpperCase() + lang.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                                <button
                                    className="flex items-center justify-center p-2 rounded-md hover:bg-accent transition-colors"
                                    title="Copy Code"
                                    onClick={() => {
                                        navigator.clipboard.writeText(activeTabData?.content || "")
                                        toast(`${activeTabData.name} content copied.`, {
                                            description: `${new Date().toLocaleTimeString().toLocaleString()}`,
                                        })
                                    }}
                                >
                                    <CopyIcon size={16} />
                                </button>
                                <button
                                    className="flex items-center justify-center p-2 rounded-md hover:bg-accent transition-colors"
                                    title="Open Terminal"
                                    onClick={() => {
                                        const handleButtonClick = async () => {
                                            try {
                                                await invoke('open_terminal');
                                            } catch (error) {
                                                console.error('Terminal açılırken hata oluştu:', error);
                                            }
                                        };

                                        handleButtonClick()
                                    }}
                                >
                                    <TerminalIcon size={16} />
                                </button>
                        </div>
                    </div>
                    <div className="flex w-full h-full flex-row">
                        {folderSection && (
                            <div className="w-[15%] h-screen p-2 overflow-auto">
                                {
                                    !loading && (
                                        <FileExplorer
                                            LoadTabs={createNewTabWithSpecifiedFile}
                                            currentFolder={currentFolder}
                                            onFileSelect={handleFileSelect}
                                            setActiveTab={setActiveTab}
                                            setFolderSection={setFolderSection}
                                        />
                                    )
                                }
                            </div>
                        )}

                        <div className={`${folderSection === true ? "w-[85%]" : "w-[100%]"} flex h-full flex-col`}>
                            <CodeEditor
                                key={activeTab}
                                language={activeTabData?.language || "javascript"}
                                value={activeTabData?.content || ""}
                                onChange={updateTabContent}
                                onSave={handleSave}
                            />
                        </div>
                    </div>

                    <div
                        className="flex flex-row fixed bottom-0 z-[100] p-1 bg-background w-full h-fit items-start overflow-x-auto">
                        {tabs.map(tab => (
                            <Tab
                                key={tab.id}
                                tab={tab}
                                isActive={activeTab === tab.id}
                                onActivate={() => setActiveTab(tab.id)}
                                onClose={closeTab}
                            />
                        ))}

                    </div>


                </div>
            </Card>
            <div className={"fixed bottom-0 right-0 z-[500]"}>
                <SpotifyPlayer/>
            </div>
        </div>
    );
};
const Tab = React.memo(({tab, isActive, onActivate, onClose}) => (
    <div
        onClick={onActivate}
        className={`px-1 text-sm bg-background border-[1px] rounded-md cursor-pointer items-center z-[100] justify-center flex flex-row ${isActive ? 'text-green-500' : ''}`}
    >
        <p className="overflow-hidden text-ellipsis w-[100px]">{tab.name}</p>
        <button
            onClick={(e) => onClose(tab.id, e)}
            className="text-foreground p-2 rounded-xl hover:bg-background ml-2"
        >
            <X className="w-3 h-3"/>
        </button>
    </div>
));

export default React.memo(IDE);