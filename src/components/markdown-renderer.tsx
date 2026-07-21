import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-body font-sans text-[14.5px] leading-relaxed text-[#d4d4d8]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node, ...props }) => <p className="mb-4 last:mb-0 whitespace-pre-wrap" {...props} />,
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-white mb-3 mt-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-white mb-2 mt-4" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-base font-semibold text-white mb-2 mt-3" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold text-white tracking-wide" style={{ textShadow: '0 0 10px rgba(255,255,255,0.2)' }} {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-[#a1a1aa]" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-[#a1a1aa]" {...props} />,
          li: ({ node, ...props }) => <li className="" {...props} />,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full text-left border-collapse border border-white/10 rounded-lg overflow-hidden" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-white/5 border-b border-white/10 text-white" {...props} />,
          th: ({ node, ...props }) => <th className="px-4 py-2 font-medium" {...props} />,
          td: ({ node, ...props }) => <td className="px-4 py-2 border-t border-white/5" {...props} />,
          hr: ({ node, ...props }) => <hr className="my-5 border-white/10" {...props} />,
          a: ({ node, ...props }) => <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2" {...props} />,
          code: ({ node, inline, ...props }: any) => 
            inline ? (
              <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm text-[#e4e4e7]" {...props} />
            ) : (
              <pre className="bg-black/40 border border-white/10 p-3 rounded-lg overflow-x-auto my-4 text-sm text-[#e4e4e7]">
                <code {...props} />
              </pre>
            ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
