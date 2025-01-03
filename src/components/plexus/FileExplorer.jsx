import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/components/ui/context-menu";
import {FileIcon, FolderIcon} from "lucide-react";
import React, { useState, useEffect, useCallback } from 'react';
import { writeTextFile, readTextFile, readDir, create, remove } from "@tauri-apps/plugin-fs";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import * as pathModule from "@tauri-apps/api/path";
import { normalize, appDataDir } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';

const FileExplorer = ({ onFileSelect, LoadTabs, currentFolder }) => {
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

    const openFolder = useCallback(async () => {
        try {
            const folderPath = await open({
                directory: true,
                multiple: false,
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
                const entries = await readDir(folderPath);
                setCurrentFolder(folderPath);
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
    }, [currentFolder]);

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
                                    className="flex items-center gap-2 hover:bg-accent p-1 rounded cursor-pointer"
                                    onClick={() => toggleFolder(folder.path)}
                                >
                                    <FolderIcon size={16} />
                                    <span>{folder.name}</span>
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
                {items.files.map(file => (
                    <ContextMenu key={file.path}>
                        <ContextMenuTrigger>
                            <div
                                className="flex items-center gap-2 hover:bg-accent p-1 rounded cursor-pointer pl-6"
                                onClick={() => {
                                    onFileSelect(file.path, file.language)
                                    LoadTabs(file.name, file.content, file.path);
                                }}
                            >
                                <FileIcon size={16} />
                                <span>{file.name}</span>
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuItem onClick={() => deleteFile(file.path)}>Delete</ContextMenuItem>
                            <ContextMenuItem onClick={() => renameFile(file.path)}>Rename</ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                ))}
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