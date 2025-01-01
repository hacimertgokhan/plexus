import React, { useState, useEffect, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import 'xterm/css/xterm.css';
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
import Editor from '@monaco-editor/react';
import {writeTextFile} from "@tauri-apps/plugin-fs";
import {open, save} from "@tauri-apps/plugin-dialog";
import {Save, X} from "lucide-react";

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
    const [showTerminal, setShowTerminal] = useState(false);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

    const saveFileToDisk = useCallback(async (tabId) => {
        const tab = tabs.find(tab => tab.id === tabId);
        if (!tab) return;
        try {
            let filePath;
            if (tab.filePath) {
                filePath = tab.filePath;
            } else {
                filePath = await save({
                    title: "Save File",
                    filters: [{ name: tab.language, extensions: [languageExtensions[tab.language]] }]
                });
            }
            if (filePath) {
                await writeTextFile(filePath, tab.content);
                setTabs(tabs.map(t =>
                    t.id === tabId
                        ? { ...t, filePath, saved: true, name: `${filePath.split('/').pop()}` }
                        : t
                ));
                console.log(`File saved at: ${filePath}`);
            }
        } catch (error) {
            console.error("Failed to save file:", error);
        }
    }, [tabs]);


    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.metaKey || e.ctrlKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        saveFileToDisk(activeTab);
                        break;
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, saveFileToDisk]);

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

    const closeTab = (tabId, e) => {
        e.stopPropagation();
        if (tabs.length === 1) return;

        const newTabs = tabs.filter(tab => tab.id !== tabId);
        setTabs(newTabs);
        setActiveTab(newTabs[newTabs.length - 1].id);
    };

    const updateTabContent = (content) => {
        setTabs(tabs.map(tab =>
            tab.id === activeTab ? { ...tab, content } : tab
        ));
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

    return (
        <div className="w-screen h-screen">
            <Card className="bg-background w-full h-full border-none">
                <div className="flex flex-col h-full">
                    <div className="flex items-center border-none justify-between p-2">
                        <div className="flex items-center space-x-2">
                            <p className="font-bold">Plexus</p>
                            <Menubar className="shadow-none border-none">
                                <MenubarMenu>
                                    <MenubarTrigger className="text-sm">File</MenubarTrigger>
                                    <MenubarContent>
                                        <MenubarSub>
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
                                        <MenubarItem onClick={() => saveFileToDisk(activeTab)}>
                                            Save <MenubarShortcut>⌘S</MenubarShortcut>
                                        </MenubarItem>
                                        <MenubarItem onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}>
                                            {autoSaveEnabled ? 'Disable' : 'Enable'} Auto-save
                                        </MenubarItem>
                                    </MenubarContent>
                                </MenubarMenu>
                            </Menubar>
                        </div>
                        <div className="flex items-center space-x-2">
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
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => saveFileToDisk(activeTab)}
                                className="text-foreground hover:bg-background"
                            >
                                <Save className="w-4 h-4"/>
                            </Button>
                        </div>
                    </div>

                    <div className="flex border-b">
                        {tabs.map(tab => (
                            <div
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`p-2 cursor-pointer ${activeTab === tab.id ? 'bg-accent' : ''}`}
                            >
                                {tab.name}
                                <Button
                                    onClick={(e) => closeTab(tab.id, e)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-foreground hover:bg-background ml-2"
                                >
                                    <X className="w-3 h-3"/>
                                </Button>
                            </div>
                        ))}
                    </div>

                    <Editor
                        language={tabs.find(tab => tab.id === activeTab)?.language}
                        value={tabs.find(tab => tab.id === activeTab)?.content}
                        onChange={updateTabContent}
                        options={{
                            automaticLayout: true,
                            wordWrap: 'on',
                            suggestOnTriggerCharacters: true,
                            snippetSuggestions: 'top',
                        }}
                    />
                </div>
            </Card>

        </div>
    );
};

export default IDE;
