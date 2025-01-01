import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/components/ui/context-menu";
import {FileIcon, FolderIcon} from "lucide-react";
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

    useEffect(() => {
        if (currentFolder) {
            loadFolder(currentFolder);
        }
    }, [currentFolder]);

    const deleteFile = async (path) => {
        try {
            await remove(path);
            await loadFolder(currentPath); // Refresh the file list
        } catch (error) {
            console.error("Failed to delete file:", error);
        }
    };

    const deleteFolder = async (path) => {
        try {
            await remove(path, { recursive: true });
            await loadFolder(currentPath);
        } catch (error) {
            console.error("Failed to delete folder:", error);
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
            const newPath = `${selectedPath}/${newItemName}`;
            await writeTextFile(newPath, '');
            setIsNewFileDialogOpen(false);
            setNewItemName('');
            await loadFolder(currentPath);
        } catch (error) {
            console.error("Failed to create file:", error);
        }
    };

    const handleCreateFolder = async () => {
        try {
            const newPath = `${selectedPath}/${newItemName}`;
            await create(newPath);
            setIsNewFolderDialogOpen(false);
            setNewItemName('');
            await loadFolder(currentPath);
        } catch (error) {
            console.error("Failed to create folder:", error);
        }
    };

    const renameFile = async (path) => {
        setSelectedPath(path);
        setNewItemName(path.split('/').pop());
        setIsRenameDialogOpen(true);
    };

    const handleRename = async () => {
        try {
            const newPath = `${selectedPath.substring(0, selectedPath.lastIndexOf('/'))}/${newItemName}`;
            setIsRenameDialogOpen(false);
            setNewItemName('');
            await loadFolder(currentPath);
        } catch (error) {
            console.error("Failed to rename file:", error);
        }
    };

    const loadFolder = async (_path) => {
        try {
            const entries = await readDir(_path); // readDir fonksiyonu burada dosya ve klasörleri alacak
            const data = await Promise.all(entries.map(async (entry) => {
                const entryPath = pathModule.join(_path, entry.name); // Dosyanın tam yolu
                const resolvedPath = await entryPath; // Eğer entryPath bir Promise döndürüyorsa burada çözülmesini sağlıyoruz

                const entryData = {
                    path: resolvedPath, // Dosyanın tam yolu
                    name: entry.name, // Dosyanın adı
                    language: entry.name.split('.').pop() // Dosya uzantısı (language) alınıyor
                };

                if (entry.isDirectory) { // isDirectory fonksiyonu olmalı
                    // Klasörse, content olarak alt klasörler ve dosyalar ekle
                    entryData.type = 'folder'; // Klasör türü
                    entryData.content = []; // Klasörün içeriği başlangıçta boş
                } else {
                    // Dosya ise, content olarak dosyanın içeriğini (şu anda boş bırakıyoruz)
                    entryData.type = 'file'; // Dosya türü
                    entryData.content = null; // İçeriği şu anda yok
                }

                return entryData;
            }));

            // Klasör ve dosyaları ayırabilirsin
            const folders = data.filter(entry => entry.type === 'folder');
            const files = data.filter(entry => entry.type === 'file');

            // Klasörler ve dosyalarla güncelle
            setTree({ files, folders });
            setCurrentPath(_path);
            console.log(files, folders); // Debug için dosya ve klasörleri kontrol et
        } catch (error) {
            console.error("Failed to load folder:", error);
        }
    };



    const handleContextMenu = async (e, type, path) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const toggleFolder = (path) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const renderTree = (items) => (
        <div className="pl-1">
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
                    {expandedFolders.has(folder.path) && (
                        loadFolder(folder.path).then(subEntries => renderTree(subEntries))
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
                        <ContextMenuItem onClick={() => deleteFile(file.path)}>{JSON.stringify(file)}</ContextMenuItem>
                        <ContextMenuItem onClick={() => renameFile(file.path)}>Rename</ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            ))}
        </div>
    );

    return (
        <>
            <div className="w-full border-l border-border h-full overflow-y-auto">
                {renderTree(tree)}
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