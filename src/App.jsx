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
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { open, save } from "@tauri-apps/plugin-dialog";
import { FileIcon, Package2Icon, Code2Icon, SettingsIcon, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import FileExplorer from "@/components/plexus/FileExplorer.jsx";
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

const CodeEditor = React.memo(({ language, value, onChange, onSave }) => {
    const editorRef = useRef(null);
    const [localValue, setLocalValue] = useState(value);

    const handleChange = useCallback((e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onChange(newValue);
    }, [onChange]);

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

    const lineNumbers = useMemo(() => {
        const lines = (localValue || '').split('\n').length;
        return Array.from({ length: lines }, (_, i) => i + 1);
    }, [localValue]);

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
            if (onSave) onSave();
        }
    }, [localValue, onChange, onSave]);

    useEffect(() => {
        if (value !== localValue) {
            setLocalValue(value);
        }
    }, [value, localValue]);

    const wordCount = useMemo(() => {
        return (localValue.match(/\b\w+\b/g) || []).length;
    }, [localValue]);

    const charCount = useMemo(() => {
        return localValue.length;
    }, [localValue]);

    const fileSize = useMemo(() => {
        return new Blob([localValue]).size;
    }, [localValue]);

    return (
        <div className="w-full h-full rounded-lg overflow-hidden border relative font-mono">
            <div className="p-2 text-sm flex items-center gap-2 w-full border-b">
                <span className={"ml-2"}>{wordCount}<sup>Words</sup></span> | <span>{charCount}<sup>Characters</sup></span> | <span>{fileSize}<sup>bytes</sup></span>
            </div>
            <div className="w-full h-full flex">
                <div className="p-4 text-right text-gray-500 select-none bg-opacity-50 w-[50px]">
                    {lineNumbers.map((num) => (
                        <div key={num} className="leading-6">
                            {num}
                        </div>
                    ))}
                </div>

                <div className="relative flex-grow overflow-auto">
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
};

const IDE = () => {
    const [tabs, setTabs] = useState([
        { id: 1, name: 'untitled-1.js', content: '// Welcome to Plexus IDE\n', language: 'javascript', filePath: null }
    ]);
    const [activeTab, setActiveTab] = useState(1);
    const [nextTabId, setNextTabId] = useState(2);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [folderSection, setFolderSection] = useState(true);

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
                    ? { ...tab, content: tabContentRef.current[tabId] }
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

    const openFolder = useCallback(async () => {
        try {
            const folderPath = await open({
                directory: true
            });
            if (folderPath) {
                setCurrentFolder(folderPath);
            }
        } catch (error) {
            console.error("Failed to open folder:", error);
        }
    }, []);

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
            <Card className="bg-background w-full h-full border-none">
                <div className="flex flex-col h-full">
                    <div className="flex border-[1px] items-center justify-between px-4 py-2">
                        <div className="flex items-center -ml-3 h-[30px] flex-row justify-start">
                            <Menubar className="shadow-none border-none">
                                <MenubarMenu>
                                    <MenubarTrigger className="text-sm flex flex-row items-center justify-center gap-1"><FileIcon
                                        size={14}/> File</MenubarTrigger>
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
                                    <MenubarTrigger className="text-sm flex flex-row items-center justify-center gap-1"><Package2Icon
                                        size={14}/> Projects</MenubarTrigger>
                                    <MenubarContent>
                                        <MenubarSub>
                                            <MenubarSubTrigger>New Web Project</MenubarSubTrigger>
                                            <MenubarSubContent>
                                                <MenubarItem onClick={() => createFrameworkProject('HTML')}>HTML</MenubarItem>
                                                <MenubarItem onClick={() => createFrameworkProject('Next')}>Next</MenubarItem>
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
                                                <MenubarItem onClick={() => createFrameworkProject('ReactNative')}>React Native</MenubarItem>
                                                <MenubarItem onClick={() => createFrameworkProject('Expo')}>Expo</MenubarItem>
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
                                        <MenubarItem>
                                            Layout
                                        </MenubarItem>
                                        <MenubarItem>
                                            Optimization
                                        </MenubarItem>
                                    </MenubarContent>
                                </MenubarMenu>

                                <MenubarMenu>
                                    <MenubarTrigger className="text-sm flex flex-row items-center justify-center gap-1">
                                        <Code2Icon size={14}/> Plexus</MenubarTrigger>
                                    <MenubarContent>
                                        <MenubarItem>
                                            Repository
                                        </MenubarItem>
                                        <MenubarItem>
                                            Developers
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
                        </div>
                    </div>

                    <div className="flex w-full flex-row gap-2">
                        {folderSection && (
                            <div className="w-[15%] h-screen p-2 overflow-auto">
                                <FileExplorer
                                    LoadTabs={createNewTabWithSpecifiedFile}
                                    currentFolder={currentFolder}
                                    onFileSelect={handleFileSelect}
                                    setActiveTab={setActiveTab}
                                />
                            </div>
                        )}

                        <CodeEditor
                            key={activeTab} // Add key prop for better performance
                            language={activeTabData?.language || "javascript"}
                            value={activeTabData?.content || ""}
                            onChange={updateTabContent}
                            onSave={handleSave}
                        />
                    </div>

                    <div
                        className="flex flex-row fixed bottom-0 p-1 bg-background w-full h-fit items-start overflow-x-auto">
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
        </div>
    );
};
const Tab = React.memo(({ tab, isActive, onActivate, onClose }) => (
    <div
        onClick={onActivate}
        className={`px-1 text-sm bg-transparent border-[1px] rounded-md cursor-pointer items-center justify-center flex flex-row ${isActive ? 'bg-accent' : ''}`}
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