import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIInsightRendererProps {
  insight: string;
}

export default function AIInsightRenderer({ insight }: AIInsightRendererProps) {
  if (!insight || insight.trim() === '') {
    return null;
  }

  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {insight}
      </ReactMarkdown>
    </div>
  );
}
