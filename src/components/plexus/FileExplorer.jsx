import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/components/ui/context-menu";
import {FolderIcon} from "lucide-react";
import React, { useState, useEffect, useCallback } from 'react';
import { writeTextFile, readTextFile, readDir, create, remove } from "@tauri-apps/plugin-fs";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import * as pathModule from "@tauri-apps/api/path";
import { normalize, appDataDir } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { Icon } from '@iconify/react';
const getFileIconName = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();

    // Yaygın dosya türleri için icon eşleştirmeleri
    const iconMappings = {
        // Programlama Dilleri
        js: 'logos:javascript',
        ts: 'logos:typescript-icon',
        jsx: 'logos:react',
        tsx: 'logos:react',
        py: 'logos:python',
        java: 'logos:java',
        cpp: 'logos:c-plusplus',
        cs: 'logos:c-sharp',
        go: 'logos:go',
        rs: 'logos:rust',

        // Web Teknolojileri
        html: 'logos:html-5',
        css: 'logos:css-3',
        scss: 'logos:sass',
        less: 'logos:less',

        // Veri & Konfigürasyon
        json: 'vscode-icons:file-type-json',
        yaml: 'vscode-icons:file-type-yaml',
        yml: 'vscode-icons:file-type-yaml',
        xml: 'vscode-icons:file-type-xml',
        sql: 'vscode-icons:file-type-sql',

        // Markdown & Dökümantasyon
        md: 'vscode-icons:file-type-markdown',
        pdf: 'vscode-icons:file-type-pdf',
        doc: 'vscode-icons:file-type-word',
        docx: 'vscode-icons:file-type-word',

        // Medya
        jpg: 'vscode-icons:file-type-image',
        jpeg: 'vscode-icons:file-type-image',
        png: 'vscode-icons:file-type-image',
        gif: 'vscode-icons:file-type-image',
        svg: 'vscode-icons:file-type-svg',

        // Diğer
        env: 'vscode-icons:file-type-env',
        zip: 'vscode-icons:file-type-zip',
        rar: 'vscode-icons:file-type-zip',
        txt: 'vscode-icons:file-type-text',
        log: 'vscode-icons:file-type-log'
    };

    return iconMappings[extension] || 'vscode-icons:default-file';
};
const fileTypeStyles = {
    // Programlama Dilleri
    js: { color: '#ffeb3b', hoverBg: 'rgba(255, 235, 59, 0.2)' },
    ts: { color: '#4fc3f7', hoverBg: 'rgba(79, 195, 247, 0.2)' },
    jsx: { color: '#80deea', hoverBg: 'rgba(128, 222, 234, 0.2)' },
    tsx: { color: '#4fc3f7', hoverBg: 'rgba(79, 195, 247, 0.2)' },
    py: { color: '#64b5f6', hoverBg: 'rgba(100, 181, 246, 0.2)' },
    java: { color: '#64b5f6', hoverBg: 'rgba(100, 181, 246, 0.2)' },
    cpp: { color: '#90caf9', hoverBg: 'rgba(144, 202, 249, 0.2)' },
    rs: { color: '#ffcc80', hoverBg: 'rgba(255, 204, 128, 0.2)' },
    go: { color: '#81d4fa', hoverBg: 'rgba(129, 212, 250, 0.2)' },

    // Web Teknolojileri
    html: { color: '#ef5350', hoverBg: 'rgba(239, 83, 80, 0.2)' },
    css: { color: '#42a5f5', hoverBg: 'rgba(66, 165, 245, 0.2)' },
    scss: { color: '#f06292', hoverBg: 'rgba(240, 98, 146, 0.2)' },
    less: { color: '#78909c', hoverBg: 'rgba(120, 144, 156, 0.2)' },

    // Veri & Konfigürasyon
    json: { color: '#cfd8dc', hoverBg: 'rgba(207, 216, 220, 0.2)' },
    yaml: { color: '#ff8a80', hoverBg: 'rgba(255, 138, 128, 0.2)' },
    xml: { color: '#80deea', hoverBg: 'rgba(128, 222, 234, 0.2)' },
    sql: { color: '#7986cb', hoverBg: 'rgba(121, 134, 203, 0.2)' },

    // Markdown & Dökümantasyon
    md: { color: '#2196f3', hoverBg: 'rgba(33, 150, 243, 0.2)' },
    pdf: { color: '#ff5252', hoverBg: 'rgba(255, 82, 82, 0.2)' },
    doc: { color: '#7986cb', hoverBg: 'rgba(121, 134, 203, 0.2)' },
    docx: { color: '#7986cb', hoverBg: 'rgba(121, 134, 203, 0.2)' },

    // Medya
    jpg: { color: '#7986cb', hoverBg: 'rgba(121, 134, 203, 0.2)' },
    jpeg: { color: '#7986cb', hoverBg: 'rgba(121, 134, 203, 0.2)' },
    png: { color: '#7986cb', hoverBg: 'rgba(121, 134, 203, 0.2)' },
    gif: { color: '#7986cb', hoverBg: 'rgba(121, 134, 203, 0.2)' },
    svg: { color: '#ffa726', hoverBg: 'rgba(255, 167, 38, 0.2)' },

    // Varsayılan
    default: { color: '#cfd8dc', hoverBg: 'rgba(207, 216, 220, 0.2)' }
};

const FileIcon = ({ filename }) => {
    const extension = filename.split('.').pop().toLowerCase();
    const style = fileTypeStyles[extension] || fileTypeStyles.default;

    return (
        <div className="flex items-center" style={{ color: style.color }}>
            <Icon color={style.color} icon={getFileIconName(filename)} width="16" height="16" />
        </div>
    );
};

const FileExplorer = ({ setFolderSection, onFileSelect, LoadTabs, currentFolder }) => {
    const [tree, setTree] = useState({ files: [], folders: [] });
    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const [currentPath, setCurrentPath] = useState('');
    const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
    const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [selectedPath, setSelectedPath] = useState('');
    const [folderContents, setFolderContents] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (currentFolder) {
            loadFolder(currentFolder, true);
        }
    }, [currentFolder]);

    const loadFolder = async (_path, updateTree = false) => {
        if (!_path || typeof _path !== 'string') {
            console.error("Invalid path:", _path);
            setError('Invalid path provided');
            return null;
        }

        if (updateTree) {
            setLoading(true);
            setError('');
        }

        try {
            // Path'i normalize et
            const normalizedPath = await normalize(_path);

            if (folderContents[normalizedPath] && !updateTree) {
                return folderContents[normalizedPath];
            }

            const entries = await readDir(normalizedPath);

            if (!Array.isArray(entries)) {
                throw new Error("Invalid directory content");
            }

            const data = await Promise.all(entries.map(async (entry) => {
                if (!entry || !entry.name) {
                    return null;
                }

                try {
                    const entryPath = await pathModule.join(normalizedPath, entry.name);
                    return {
                        path: entryPath,
                        name: entry.name,
                        language: entry.name.split('.').pop(),
                        type: entry.isDirectory ? 'folder' : 'file',
                        content: entry.isDirectory ? [] : null
                    };
                } catch (err) {
                    console.error("Error processing entry:", err);
                    return null;
                }
            }));

            const validData = data.filter(item => item !== null);

            const folders = validData.filter(entry => entry.type === 'folder');
            const files = validData.filter(entry => entry.type === 'file');
            const newContents = { files, folders };

            setFolderContents(prev => ({
                ...prev,
                [normalizedPath]: newContents
            }));

            if (updateTree || normalizedPath === currentFolder) {
                setTree(newContents);
                setCurrentPath(normalizedPath);
            }

            if (updateTree) {
                setLoading(false);
            }

            return newContents;
        } catch (error) {
            console.error("Failed to load folder:", error);
            const errorMessage = error?.message || 'Unknown error occurred';
            setError(`Failed to load folder: ${errorMessage}`);

            if (updateTree) {
                setLoading(false);
            }

            return { files: [], folders: [] };
        }
    };

    const deleteFile = async (path) => {
        try {
            const normalizedPath = await normalize(path);
            await remove(normalizedPath);
            await loadFolder(currentPath, true);
        } catch (error) {
            console.error("Failed to delete file:", error);
            setError('Failed to delete file');
        }
    };

    const deleteFolder = async (path) => {
        try {
            const normalizedPath = await normalize(path);
            await remove(normalizedPath, { recursive: true });
            await loadFolder(currentPath, true);
        } catch (error) {
            console.error("Failed to delete folder:", error);
            setError('Failed to delete folder');
        }
    };

    const createNewFile = async (parentPath) => {
        try {
            const normalizedPath = await normalize(parentPath);
            setSelectedPath(normalizedPath);
            setIsNewFileDialogOpen(true);
        } catch (error) {
            console.error("Failed to normalize path:", error);
            setError('Failed to create file: Invalid path');
        }
    };

    const createNewFolder = async (parentPath) => {
        try {
            const normalizedPath = await normalize(parentPath);
            setSelectedPath(normalizedPath);
            setIsNewFolderDialogOpen(true);
        } catch (error) {
            console.error("Failed to normalize path:", error);
            setError('Failed to create folder: Invalid path');
        }
    };

    const handleCreateFile = async () => {
        try {
            const newPath = await pathModule.join(selectedPath, newItemName);
            await writeTextFile(newPath, '');
            setIsNewFileDialogOpen(false);
            setNewItemName('');
            await loadFolder(currentPath, true);
        } catch (error) {
            console.error("Failed to create file:", error);
            setError('Failed to create file');
        }
    };

    const handleCreateFolder = async () => {
        try {
            const newPath = await pathModule.join(selectedPath, newItemName);
            await create(newPath);
            setIsNewFolderDialogOpen(false);
            setNewItemName('');
            await loadFolder(currentPath, true);
        } catch (error) {
            console.error("Failed to create folder:", error);
            setError('Failed to create folder');
        }
    };

    const renameFile = async (path) => {
        try {
            const normalizedPath = await normalize(path);
            setSelectedPath(normalizedPath);
            setNewItemName(normalizedPath.split('/').pop());
            setIsRenameDialogOpen(true);
        } catch (error) {
            console.error("Failed to normalize path:", error);
            setError('Failed to rename file: Invalid path');
        }
    };

    const handleRename = async () => {
        try {
            const newPath = await pathModule.join(selectedPath.substring(0, selectedPath.lastIndexOf('/')), newItemName);
            // Rename logic here
            setIsRenameDialogOpen(false);
            setNewItemName('');
            await loadFolder(currentPath, true);
        } catch (error) {
            console.error("Failed to rename file:", error);
            setError('Failed to rename file');
        }
    };

    const toggleFolder = async (path) => {
        if (!path) {
            console.error("Invalid path in toggleFolder");
            return;
        }

        try {
            setError('');
            const normalizedPath = await normalize(path);
            const isExpanded = expandedFolders.has(normalizedPath);

            if (!isExpanded) {
                const contents = await loadFolder(normalizedPath, false);
                if (!contents) {
                    throw new Error("Failed to load folder contents");
                }
            }

            setExpandedFolders(prev => {
                const next = new Set(prev);
                if (isExpanded) {
                    next.delete(normalizedPath);
                } else {
                    next.add(normalizedPath);
                }
                return next;
            });
        } catch (error) {
            console.error("Failed to toggle folder:", error);
            setError(`Failed to toggle folder: ${error.message}`);
        }
    };

    const renderTree = (items) => {
        if (!items || !items.folders || !items.files) {
            return null;
        }

        return (
            <div className="pl-4">
                {items.folders.map(folder => (
                    <div key={folder.path}>
                        <ContextMenu>
                            <ContextMenuTrigger>
                                <div
                                    className="flex items-center gap-2 p-1 rounded cursor-pointer transition-colors duration-200"
                                    style={{
                                        '--hover-bg': 'rgba(253, 224, 71, 0.1)'
                                    }}
                                    onClick={() => toggleFolder(folder.path)}
                                >
                                    <FolderIcon size={16} className="text-yellow-500" />
                                    <span className="text-yellow-700">{folder.name}</span>
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuItem onClick={() => createNewFile(folder.path)}>New File</ContextMenuItem>
                                <ContextMenuItem onClick={() => createNewFolder(folder.path)}>New Folder</ContextMenuItem>
                                <ContextMenuItem onClick={() => deleteFolder(folder.path)}>Delete</ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                        {expandedFolders.has(folder.path) && folderContents[folder.path] && (
                            renderTree(folderContents[folder.path])
                        )}
                    </div>
                ))}
                {items.files.map(file => {
                    const extension = file.name.split('.').pop().toLowerCase();
                    const style = fileTypeStyles[extension] || fileTypeStyles.default;

                    return (
                        <ContextMenu key={file.path}>
                            <ContextMenuTrigger>
                                <div
                                    className="flex items-center gap-2 p-1 rounded cursor-pointer pl-6 transition-colors duration-200"
                                    style={{
                                        '--hover-bg': style.hoverBg,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = style.hoverBg;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                    onClick={() => {
                                        onFileSelect(file.path, file.language)
                                        LoadTabs(file.name, file.content, file.path);
                                    }}
                                >
                                    <FileIcon filename={file.name} />
                                    <span style={{ color: style.color }}>{file.name}</span>
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuItem onClick={() => deleteFile(file.path)}>Delete</ContextMenuItem>
                                <ContextMenuItem onClick={() => renameFile(file.path)}>Rename</ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    );
                })}
            </div>
        );
    };

    const filteredTree = (tree, searchQuery) => {
        if (!tree || !tree.files || !tree.folders) {
            return { files: [], folders: [] };
        }

        const { files, folders } = tree;
        const filteredFolders = folders.filter(folder => folder.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const filteredFiles = files.filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return { files: filteredFiles, folders: filteredFolders };
    };

    return (
        <>
            <div className="flex flex-col w-full h-full">
                <div className="flex items-center p-2">
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                    />
                </div>
                <div className="w-full border-l border-border h-full overflow-y-auto">
                    {loading ? (
                        <div>Loading...</div>
                    ) : error ? (
                        <div className="text-red-500">{error}</div>
                    ) : (
                        renderTree(filteredTree(tree, searchQuery))
                    )}
                </div>
            </div>

            <Dialog open={isNewFileDialogOpen} onOpenChange={setIsNewFileDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New File</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Enter file name"
                    />
                    <DialogFooter>
                        <Button onClick={handleCreateFile}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Enter folder name"
                    />
                    <DialogFooter>
                        <Button onClick={handleCreateFolder}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename File</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Enter new name"
                    />
                    <DialogFooter>
                        <Button onClick={handleRename}>Rename</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default FileExplorer;