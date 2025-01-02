import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/components/ui/context-menu";
import {FileIcon, FolderIcon} from "lucide-react";
import React, { useState, useEffect } from 'react';
import { writeTextFile, readTextFile, readDir, create, remove } from "@tauri-apps/plugin-fs";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import * as pathModule from "@tauri-apps/api/path";

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

    useEffect(() => {
        if (currentFolder) {
            loadFolder(currentFolder);
        }
    }, [currentFolder]);

    const deleteFile = async (path) => {
        try {
            await remove(path);
            await loadFolder(currentPath);
        } catch (error) {
            console.error("Failed to delete file:", error);
            setError('Failed to delete file');
        }
    };

    const deleteFolder = async (path) => {
        try {
            await remove(path, { recursive: true });
            await loadFolder(currentPath);
        } catch (error) {
            console.error("Failed to delete folder:", error);
            setError('Failed to delete folder');
        }
    };

    const createNewFile = async (parentPath) => {
        setSelectedPath(parentPath);
        setIsNewFileDialogOpen(true);
    };

    const createNewFolder = async (parentPath) => {
        setSelectedPath(parentPath);
        setIsNewFolderDialogOpen(true);
    };

    const handleCreateFile = async () => {
        try {
            const newPath = await pathModule.join(selectedPath, newItemName);
            await writeTextFile(newPath, '');
            setIsNewFileDialogOpen(false);
            setNewItemName('');
            await loadFolder(currentPath);
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
            await loadFolder(currentPath);
        } catch (error) {
            console.error("Failed to create folder:", error);
            setError('Failed to create folder');
        }
    };

    const renameFile = async (path) => {
        setSelectedPath(path);
        setNewItemName(path.split('/').pop());
        setIsRenameDialogOpen(true);
    };

    const handleRename = async () => {
        try {
            const newPath = await pathModule.join(selectedPath.substring(0, selectedPath.lastIndexOf('/')), newItemName);
            // Rename logic here
            setIsRenameDialogOpen(false);
            setNewItemName('');
            await loadFolder(currentPath);
        } catch (error) {
            console.error("Failed to rename file:", error);
            setError('Failed to rename file');
        }
    };

    const loadFolder = async (_path) => {
        setLoading(true);
        try {
            const entries = await readDir(_path);
            const data = await Promise.all(entries.map(async (entry) => {
                const entryPath = await pathModule.join(_path, entry.name);

                const entryData = {
                    path: entryPath,
                    name: entry.name,
                    language: entry.name.split('.').pop()
                };

                if (entry.isDirectory) {
                    entryData.type = 'folder';
                    entryData.content = [];
                } else {
                    entryData.type = 'file';
                    entryData.content = null;
                }

                return entryData;
            }));

            const folders = data.filter(entry => entry.type === 'folder');
            const files = data.filter(entry => entry.type === 'file');

            setFolderContents(prev => ({
                ...prev,
                [_path]: { files, folders }
            }));

            if (_path === currentFolder) {
                setTree({ files, folders });
            }

            setCurrentPath(_path);
            setLoading(false);
            return { files, folders };
        } catch (error) {
            console.error("Failed to load folder:", error);
            setError(`Failed to load folder: ${_path}`);
            setLoading(false);
            return { files: [], folders: [] };
        }
    };

    const toggleFolder = async (path) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
                loadFolder(path);
            }
            return next;
        });
    };

    const renderTree = (items) => (
        <div className="pl-1">
            {items?.folders?.map(folder => (
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
            {items?.files?.map(file => (
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

    const filteredTree = (tree, searchQuery) => {
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