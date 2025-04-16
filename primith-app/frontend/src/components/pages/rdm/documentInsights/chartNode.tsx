// src/components/ChartNode.tsx
import { Node, mergeAttributes } from '@tiptap/react';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { renderChart } from './chartRenderer';

// Chart Node View Component
const ChartNodeView = ({ node, editor }: { node: any; editor: any }) => {
  const chartId = node.attrs.chartId;
  
  // Get chart data from editor storage
  const charts = editor.storage.chartNode?.charts || [];
  const chartData = charts.find((c: any) => c.id === chartId);

  return (
    <NodeViewWrapper>
      <div 
        className="chart-container my-4 border rounded-lg p-4" 
        style={{ height: '300px' }}
        data-chart-id={chartId}
      >
        {chartData ? (
          <div style={{ width: '100%', height: '100%' }}>
            {renderChart(chartData)}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Chart not found (ID: {chartId})
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

// Chart Node Extension
export const ChartNode = Node.create({
  name: 'chart',
  group: 'block',
  atom: true, // Makes the node a single unit

  addAttributes() {
    return {
      chartId: {
        default: null
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-chart-id]',
        getAttrs: (element) => {
          if (typeof element === 'string') return null;
          const node = element as HTMLElement;
          return {
            chartId: node.getAttribute('data-chart-id')
          };
        }
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-chart-id': HTMLAttributes.chartId }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartNodeView);
  },
});