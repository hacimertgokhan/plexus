import React, { useState } from 'react';
import { Card } from '@/components/ui/card';

const parseMarkdown = (text) => {
    let parsed = text;
    parsed = parsed.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    parsed = parsed.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    parsed = parsed.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    parsed = parsed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-500 hover:underline">$1</a>');
    parsed = parsed.replace(/^\- (.*$)/gm, '<li>$1</li>');
    parsed = parsed.replace(/^([^<].*$)/gm, '<p>$1</p>');

    return parsed;
};

const MarkdownPreview = ({code}) => {
    const [markdown, setMarkdown] = useState(code);

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                    <h2 className="text-lg font-semibold mb-2">Markdown Editör</h2>
                    <textarea
                        value={markdown}
                        onChange={(e) => setMarkdown(e.target.value)}
                        className="w-full h-64 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Markdown metninizi buraya yazın..."
                    />
                </Card>

                <Card className="p-4">
                    <h2 className="text-lg font-semibold mb-2">Önizleme</h2>
                    <div
                        className="prose w-full h-64 overflow-y-auto p-2 border rounded-md"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(markdown) }}
                    />
                </Card>
            </div>
        </div>
    );
};

export default MarkdownPreview;