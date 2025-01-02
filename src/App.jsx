import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import { Card } from "@/components/ui/card";
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
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { open, save } from "@tauri-apps/plugin-dialog";
import { FileIcon, Package2Icon, Save, SettingsIcon, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import FileExplorer from "@/components/plexus/FileExplorer.jsx";
import CodeEditor from "@/components/plexus/PlexusEditor.jsx";
import debounce from "lodash/debounce";

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

        // Performans için setState'i throttle ediyoruz
        debounce(() => {
            setTabs(prevTabs =>
                prevTabs.map(tab =>
                    tab.id === tabId
                        ? { ...tab, content: tabContentRef.current[tabId] }
                        : tab
                )
            );
        }, 100)();
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

// Dosya kaydetme işlemini optimize ediyoruz
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
                                        <MenubarItem onClick={() => saveFileToDisk(activeTab)}>
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
                                                <MenubarItem
                                                    onClick={() => createFrameworkProject('Next')}>Next</MenubarItem>
                                                <MenubarItem
                                                    onClick={() => createFrameworkProject('React')}>React</MenubarItem>
                                                <MenubarItem
                                                    onClick={() => createFrameworkProject('Angular')}>Angular</MenubarItem>
                                            </MenubarSubContent>
                                        </MenubarSub>
                                    </MenubarContent>
                                </MenubarMenu>

                                <MenubarMenu>
                                    <MenubarTrigger className="text-sm flex flex-row items-center justify-center gap-1">
                                        <SettingsIcon size={14}/> Settings</MenubarTrigger>
                                    <MenubarContent>
                                        <MenubarSub>
                                            <MenubarSubTrigger>Layout</MenubarSubTrigger>
                                            <MenubarSubContent>
                                                <MenubarItem onClick={() => setFolderSection(!folderSection)}>
                                                    Project Folder
                                                </MenubarItem>
                                            </MenubarSubContent>
                                        </MenubarSub>
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