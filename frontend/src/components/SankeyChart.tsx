import { useEffect, useRef, useMemo } from 'react';
import type { SankeyData } from '@/types';

interface SankeyChartProps {
  data: SankeyData;
  onNodeClick?: (nodeId: string | null) => void;
  selectedNode?: string | null;
}

export default function SankeyChart({ data, onNodeClick, selectedNode }: SankeyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotlyRef = useRef<any>(null);

  const sankeyConfig = useMemo(() => {
    // Use the color from each node if available, otherwise use a default
    const nodeColors = data.nodes.map(node => {
      return node.color || '#6B7280';
    });

    const linkColors = data.links.map(link => {
      return link.color || 'rgba(107, 114, 128, 0.3)';
    });

    return {
      data: [{
        type: 'sankey',
        orientation: 'h',
        node: {
          pad: 15,
          thickness: 20,
          line: { color: '#404040', width: 0.5 },
          label: data.nodes.map(n => n.name),
          color: nodeColors,
          hoverlabel: {
            bgcolor: '#2d2d2d',
            font: { color: '#fafaf9', size: 14 }
          }
        },
        link: {
          source: data.links.map(l => l.source),
          target: data.links.map(l => l.target),
          value: data.links.map(l => l.value),
          color: linkColors,
          hovertemplate: '$%{value:,.2f}<extra></extra>'
        },
        arrangement: 'freeform'
      }],
      layout: {
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: '#a8a29e', family: 'Inter, sans-serif' },
        margin: { l: 20, r: 20, t: 20, b: 20 },
        height: 500
      },
      config: {
        displayModeBar: false,
        responsive: true
      }
    };
  }, [data, selectedNode]);

  useEffect(() => {
    let isMounted = true;

    const initPlotly = async () => {
      if (!containerRef.current || !isMounted) return;
      
      try {
        const Plotly = await import('plotly.js-dist-min');
        if (!isMounted) return;

        const { data: plotData, layout, config } = sankeyConfig;
        
        const castedData = plotData as any[]; await Plotly.newPlot(containerRef.current, castedData, layout, config);
        plotlyRef.current = Plotly;

        if (onNodeClick) {
          const el = containerRef.current as any; el.on('plotly_click', (event: any) => {
            const point = event.points?.[0];
            if (point && point.pointNumber !== undefined) {
              const nodeName = data.nodes[point.pointNumber]?.name;
              onNodeClick(selectedNode === nodeName ? null : nodeName);
            }
          });
        }
      } catch (error) {
        console.error('Failed to load Plotly:', error);
      }
    };

    initPlotly();

    return () => {
      isMounted = false;
      if (containerRef.current && plotlyRef.current) {
        try {
          plotlyRef.current.purge(containerRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [sankeyConfig, onNodeClick, data, selectedNode]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && plotlyRef.current) {
        plotlyRef.current.Plots.resize(containerRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full"
      style={{ minHeight: '500px' }}
    />
  );
}
