import React, { useState, useMemo } from 'react';
import sankeyDataImport from '../data/sankey_data.json';
import nodeDescriptionsImport from '../node_descriptions.json';
import paperUrlsImport from '../data/paper_urls.json';

// Map of paper nickname (and full title) -> source URL, derived from URL_for_Sankey.csv
const PAPER_URLS: Record<string, string> = paperUrlsImport as Record<string, string>;

// Fallback Card components (reused from original)
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>;
const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>;
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>;
const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>;

// Renders a paper entry in the side panel. If the paper has a known URL it becomes
// a clickable link that opens the paper's webpage in a new tab; otherwise it renders
// as plain text. Used for both flow and node paper lists.
const PaperItem = ({ paper }: { paper: string }) => {
    const url = PAPER_URLS[paper];
    const baseClass = "block text-sm p-2 bg-slate-50 rounded border border-slate-100 transition-colors";
    if (url) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${paper} (${url})`}
                className={`${baseClass} text-blue-600 hover:text-blue-800 hover:border-blue-300 hover:bg-blue-50 underline cursor-pointer`}
            >
                {paper}
            </a>
        );
    }
    return (
        <div className={`${baseClass} text-slate-600 hover:border-blue-200`}>
            {paper}
        </div>
    );
};

interface Paper {
    name: string;
    type: string;
    method: string;
    function: string;
    evalType: string;
    llmRole: string;
}

type SankeyJSON = {
    papers: Paper[];
    orderedFunctions: string[];
    orderedMethods: string[];
    orderedTypes: string[];
    orderedRoles: string[];
};

const sankeyData = sankeyDataImport as unknown as SankeyJSON;

interface FlowData {
    papers: string[];
    count: number;
    source: string;
    target: string;
}

const NODE_DESCRIPTIONS: Record<string, string> = nodeDescriptionsImport as unknown as Record<string, string>;

// Map common display labels / abbreviations to canonical description keys.
// Add entries here as new display labels are introduced.
const DISPLAY_TO_CANONICAL: Record<string, string> = {
    'RL': 'Reinforcement Learning',
    'RAG & ICL': 'Retrieval Augmented Generation',
    'Pre-training & SFT': 'Continued Pre-training',
    'Task Structuring': 'Planning & Decomposition',
    'Bug Analysis': 'Bug Summarisation and Analysis',
    'EDA Scripting': 'EDA Script Generation',
    'Eval. Suite': 'Benchmarking/Evaluation',
    'Feedback Looped': 'Iterative Feedback Loop',
    'DSE': 'Design Space Exploration',
    'Multi-Agency': 'MA System',
};

const getCanonicalNodeId = (displayName: string) => {
    if (!displayName) return displayName;
    // If the displayName exactly matches a canonical key, return it
    if (NODE_DESCRIPTIONS[displayName]) return displayName;
    // If there's an alias mapping, use it
    if (DISPLAY_TO_CANONICAL[displayName]) return DISPLAY_TO_CANONICAL[displayName];
    // Case-insensitive match against canonical keys
    const foundKey = Object.keys(NODE_DESCRIPTIONS).find(k => k.toLowerCase() === displayName.toLowerCase());
    if (foundKey) return foundKey;
    // Fallback to original displayName
    return displayName;
};

const parsePrefixedId = (prefixed: string) => {
    const idx = prefixed.indexOf('-');
    if (idx === -1) return { prefix: prefixed, name: '' };
    return { prefix: prefixed.slice(0, idx), name: prefixed.slice(idx + 1) };
};

// Per-role fill colours for bottom-tier nodes
const ROLE_COLORS: Record<string, string> = {
    'Generator': '#ef4444',
    'Agent': '#ef4444',
    'Orchestrator': '#ef4444',
};
const ROLE_DEFAULT_COLOR = '#ef4444';

const SankeyDiagramVertical = () => {
    const [hoveredFlow, setHoveredFlow] = useState<string | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

    const handleNodeClick = (nodeId: string) => {
        if (selectedTarget === nodeId) {
            setSelectedTarget(null);
        } else {
            setSelectedTarget(nodeId);
        }
    };

    const handleFlowClick = (flowKey: string) => {
        if (selectedTarget === flowKey) {
            setSelectedTarget(null);
        } else {
            setSelectedTarget(flowKey);
        }
    };

    // ===== CENTRALIZED LAYOUT CONFIGURATION =====
    const LAYOUT_CONFIG = {
        // Global parameters
        global: {
            canvasWidth: 2000,
            canvasHeight: 1050,
            verticalLayerSpacing: 360,
            flowOpacity: 0.65,
            minFlowWidth: 3,
            flowWidthMultiplier: 1.5, // Width per paper for flows
            labelFontSize: 14,
            headingFontSize: 25,
            legendFontSize: 14,
            opacity: {
                selected: 1.0,
                dimmed: 0.1,
                default: 1.0,
                flowDefault: 0.65,
                flowSelected: 0.9,
                nodeDimmed: 0.3
            }
        },
        // Function layer (top)
        functions: {
            height: 120,
            minWidth: 120,
            widthPerPaper: 23, // Pixels added per paper count
            spacing: 'auto', // Auto-calculated based on available space
            fontSize: 18, // Main node label font size (px)
            countFontSize: 12 // Count text font size (px)
        },
        // Method layer (middle)
        methods: {
            height: 120,
            minWidth: 62,
            widthPerPaper: 13,
            spacing: 'auto',
            fontSize: 20, // Main node label font size (px)
            countFontSize: 12 // Count text font size (px)
        },
        // Category layer (bottom) — config kept intact; fill colour overridden per-role in render
        categories: {
            height: 120,
            minWidth: 150,
            widthPerPaper: 30,
            spacing: 'auto',
            bgColor: '#ef4444', // Kept for compatibility; not used for role node fill
            borderColor: '#b91c1c',
            textColor: '#ffffff',
            headerHeight: 40,
            fontSize: 20,
            descriptionFontSize: 12,
            countFontSize: 16
        }
    };

    // Colors
    const HEADING_COLORS = {
        function: '#16a34a', // Green (Top)
        method: '#2563eb',   // Blue (Middle)
        type: '#e42323'      // Purple (Bottom – LLM Role)
    };

    // Generate method color palette
    const generateMethodColorPalette = (methods: string[]) => {
        const palette = [
            '#8b5cf6', // Purple
            '#ec4899', // Pink
            '#f59e0b', // Amber
            '#10b981', // Emerald
            '#06b6d4', // Cyan
            '#3b82f6', // Blue
            '#f97316', // Orange
            '#6366f1', // Indigo
            '#14b8a6', // Teal
            '#84cc16'  // Lime
        ];
        const methodToColor: Record<string, string> = {};
        methods.forEach((method, index) => {
            methodToColor[method] = palette[index % palette.length];
        });
        return methodToColor;
    };

    // Use JSON-produced data instead of hardcoded array
    const papers: Paper[] = sankeyData.papers;


    // 1. Calculate Counts and Groupings
    const { funcToMethod, methodToRole, nodeCounts, methodColorMap } = useMemo(() => {
        const funcToMethod: Record<string, FlowData> = {};
        const methodToRole: Record<string, FlowData> = {};
        const nodeCounts = {
            functions: {} as Record<string, Set<string>>,
            methods: {} as Record<string, Set<string>>,
            roles: {} as Record<string, Set<string>>
        };
        const uniqueByMethod: Record<string, boolean> = {};

        // First pass: extract all unique methods to create color palette
        const allMethods = new Set<string>();
        papers.forEach(paper => {
            allMethods.add(paper.method);
        });

        // Generate color map before processing flows
        const methodColorMap = generateMethodColorPalette(Array.from(allMethods));

        papers.forEach(paper => {
            // Count unique papers per method
            const methodCountKey = `${paper.method}`;
            if (!uniqueByMethod[methodCountKey]) {
                uniqueByMethod[methodCountKey] = true;
            }

            // Flow Keys (Top -> Middle -> Bottom)
            // Function -> Method (no evalType)
            const key1 = `${paper.function}|||${paper.method}`;
            // Method -> Role (no evalType)
            const key2 = `${paper.method}|||${paper.llmRole}`;

            // Function -> Method Flow
            if (!funcToMethod[key1]) {
                funcToMethod[key1] = { papers: [], count: 0, source: paper.function, target: paper.method };
            }
            if (!funcToMethod[key1].papers.includes(paper.name)) {
                funcToMethod[key1].papers.push(paper.name);
                funcToMethod[key1].count++;
            }

            // Method -> Role Flow
            if (!methodToRole[key2]) {
                methodToRole[key2] = { papers: [], count: 0, source: paper.method, target: paper.llmRole };
            }
            if (!methodToRole[key2].papers.includes(paper.name)) {
                methodToRole[key2].papers.push(paper.name);
                methodToRole[key2].count++;
            }

            // Node Counts (Unique papers per node)
            if (!nodeCounts.functions[paper.function]) nodeCounts.functions[paper.function] = new Set();
            nodeCounts.functions[paper.function].add(paper.name);

            if (!nodeCounts.methods[paper.method]) nodeCounts.methods[paper.method] = new Set();
            nodeCounts.methods[paper.method].add(paper.name);

            if (!nodeCounts.roles[paper.llmRole]) nodeCounts.roles[paper.llmRole] = new Set();
            nodeCounts.roles[paper.llmRole].add(paper.name);
        });

        return {
            funcToMethod,
            methodToRole,
            nodeCounts: {
                functions: Object.fromEntries(Object.entries(nodeCounts.functions).map(([k, v]) => [k, Array.from(v)])),
                methods: Object.fromEntries(Object.entries(nodeCounts.methods).map(([k, v]) => [k, Array.from(v)])),
                roles: Object.fromEntries(Object.entries(nodeCounts.roles).map(([k, v]) => [k, Array.from(v)]))
            },
            methodColorMap
        };
    }, [papers]);

    // 3. Group flows by connection and calculate per-node flow counts
    const groupedFuncFlows = useMemo(() => {
        const groups: Record<string, FlowData[]> = {};
        Object.values(funcToMethod).forEach(flow => {
            const key = `${flow.source}|||${flow.target}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(flow);
        });
        return groups;
    }, [funcToMethod]);

    const groupedMethodFlows = useMemo(() => {
        const groups: Record<string, FlowData[]> = {};
        Object.values(methodToRole).forEach(flow => {
            const key = `${flow.source}|||${flow.target}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(flow);
        });
        return groups;
    }, [methodToRole]);

    // Calculate total distinct flows connecting to/from each node
    const funcNodeFlowCounts = useMemo(() => {
        const outgoing: Record<string, number> = {};
        const incoming: Record<string, number> = {};

        Object.values(groupedFuncFlows).forEach(group => {
            if (group.length > 0) {
                const flow = group[0];
                outgoing[flow.source] = (outgoing[flow.source] || 0) + 1;
                incoming[flow.target] = (incoming[flow.target] || 0) + 1;
            }
        });

        return { outgoing, incoming };
    }, [groupedFuncFlows]);

    const methodNodeFlowCounts = useMemo(() => {
        const outgoing: Record<string, number> = {};
        const incoming: Record<string, number> = {};

        Object.values(groupedMethodFlows).forEach(group => {
            if (group.length > 0) {
                const flow = group[0];
                outgoing[flow.source] = (outgoing[flow.source] || 0) + 1;
                incoming[flow.target] = (incoming[flow.target] || 0) + 1;
            }
        });

        return { outgoing, incoming };
    }, [groupedMethodFlows]);

    // 2. Layout Calculation with Flow-Based Node Ordering
    const { orderedFunctions, orderedMethods, orderedRoles, functionScores, methodScores, roleScores } = useMemo(() => {
        // Calculate flow volume scores for each node
        const functionScores: Record<string, number> = {};
        Object.values(funcToMethod).forEach(flow => {
            functionScores[flow.source] = (functionScores[flow.source] || 0) + flow.count;
        });

        const methodScores: Record<string, number> = {};
        Object.values(funcToMethod).forEach(flow => {
            methodScores[flow.target] = (methodScores[flow.target] || 0) + flow.count;
        });
        Object.values(methodToRole).forEach(flow => {
            methodScores[flow.source] = (methodScores[flow.source] || 0) + flow.count;
        });

        const roleScores: Record<string, number> = {};
        Object.values(methodToRole).forEach(flow => {
            roleScores[flow.target] = (roleScores[flow.target] || 0) + flow.count;
        });

        // Sort the generated ordered lists by computed scores (descending)
        const sortedFunctions = [...sankeyData.orderedFunctions].sort((a, b) => {
            const scoreA = functionScores[a] || 0;
            const scoreB = functionScores[b] || 0;
            return scoreB - scoreA;
        });

        const sortedMethods = [...sankeyData.orderedMethods].sort((a, b) => {
            const scoreA = methodScores[a] || 0;
            const scoreB = methodScores[b] || 0;
            return scoreB - scoreA;
        });

        const sortedRoles = [...(sankeyData.orderedRoles || [])].sort((a, b) => {
            const scoreA = roleScores[a] || 0;
            const scoreB = roleScores[b] || 0;
            return scoreB - scoreA;
        });

        return {
            orderedFunctions: sortedFunctions,
            orderedMethods: sortedMethods,
            orderedRoles: sortedRoles,
            functionScores,
            methodScores,
            roleScores
        };
    }, [funcToMethod, methodToRole]);

    // Layout Dimensions
    const width = LAYOUT_CONFIG.global.canvasWidth;
    const height = LAYOUT_CONFIG.global.canvasHeight;
    const margin = { top: 60, right: 350, bottom: 60, left: 100 };
    const contentWidth = width - margin.left - margin.right;

    // Calculate Node Positions (X, Y)
    const layerY = {
        function: margin.top,
        method: margin.top + LAYOUT_CONFIG.global.verticalLayerSpacing,
        type: margin.top + LAYOUT_CONFIG.global.verticalLayerSpacing * 2
    };

    const getNodeLayout = (items: string[], layerKey: 'functions' | 'methods' | 'categories', y: number) => {
        const layout: any[] = [];
        const layerConfig = LAYOUT_CONFIG[layerKey];
        // Map 'categories' to 'roles' for nodeCounts lookup
        const nodeCountsKey = layerKey === 'categories' ? 'roles' : layerKey;

        // Calculate total width required
        let totalWidth = 0;
        items.forEach(item => {
            // @ts-ignore
            const papers = nodeCounts[nodeCountsKey as keyof typeof nodeCounts][item] || [];
            const count = papers.length;
            const w = Math.max(layerConfig.minWidth, count * layerConfig.widthPerPaper);
            totalWidth += w;
        });

        // Add spacing
        const spacing = (contentWidth - totalWidth) / (items.length + 1);
        let currentX = margin.left + spacing;

        items.forEach(item => {
            // @ts-ignore
            const papers = nodeCounts[nodeCountsKey as keyof typeof nodeCounts][item] || [];
            const count = papers.length;
            const w = Math.max(layerConfig.minWidth, count * layerConfig.widthPerPaper);

            layout.push({
                name: item,
                x: currentX,
                y: y,
                width: w,
                height: layerConfig.height,
                centerX: currentX + w / 2,
                count: count
            });

            currentX += w + spacing;
        });

        return layout;
    };

    const functionLayout = getNodeLayout(orderedFunctions, 'functions', layerY.function);
    const methodLayout = getNodeLayout(orderedMethods, 'methods', layerY.method);
    const roleLayout = getNodeLayout(orderedRoles, 'categories', layerY.type);

    // Helper to find node
    const findNode = (layout: any[], name: string) => layout.find(n => n.name === name);

    // Helper to find connected nodes for pathway isolation
    const connectedNodes = useMemo(() => {
        const connected = new Set<string>();
        if (!selectedTarget || selectedTarget.includes('|||')) return connected;

        const [type, ...nameParts] = selectedTarget.split('-');
        const name = nameParts.join('-');

        if (type === 'func') {
            // Find methods connected to this function
            Object.values(funcToMethod).forEach(flow => {
                if (flow.source === name) {
                    connected.add(`meth-${flow.target}`);
                }
            });
        } else if (type === 'meth') {
            // Find functions connected to this method
            Object.values(funcToMethod).forEach(flow => {
                if (flow.target === name) {
                    connected.add(`func-${flow.source}`);
                }
            });
            // Find roles connected to this method
            Object.values(methodToRole).forEach(flow => {
                if (flow.source === name) {
                    connected.add(`role-${flow.target}`);
                }
            });
        } else if (type === 'role') {
            // Find methods connected to this role
            Object.values(methodToRole).forEach(flow => {
                if (flow.target === name) {
                    connected.add(`meth-${flow.source}`);
                }
            });
        }

        return connected;
    }, [selectedTarget, funcToMethod, methodToRole]);

    // Helper to determine item opacity based on selection state
    const getItemOpacity = (type: 'node' | 'flow', id: string, relatedIds?: string[]) => {
        const { opacity } = LAYOUT_CONFIG.global;

        // Scenario C: Nothing Selected (Default)
        if (!selectedTarget) {
            return type === 'node' ? opacity.default : opacity.flowDefault;
        }

        // Check if selection is a Node or Flow
        const isNodeSelected = !selectedTarget.includes('|||'); // Flow keys contain '|||'

        if (isNodeSelected) {
            // Scenario A: A NODE is Selected
            if (id === selectedTarget) return opacity.selected;

            if (type === 'node') {
                // If connected, keep visible (default opacity), else dim completely
                return connectedNodes.has(id) ? opacity.default : opacity.dimmed;
            } else {
                // Flow
                // relatedIds for flow should be [source, target]
                if (!relatedIds) return opacity.dimmed;

                const selectedName = selectedTarget.split('-').slice(1).join('-');
                const flowPrefix = id.split('-')[0]; // 'fm' or 'mr'
                const selectedPrefix = selectedTarget.split('-')[0]; // 'func', 'meth', 'role'

                if (selectedPrefix === 'func') {
                    // Only 'fm' flows starting with selectedName
                    if (flowPrefix === 'fm' && relatedIds[0] === selectedName) return opacity.flowSelected;
                } else if (selectedPrefix === 'meth') {
                    // 'fm' flows ending with selectedName OR 'mr' flows starting with selectedName
                    if (flowPrefix === 'fm' && relatedIds[1] === selectedName) return opacity.flowSelected;
                    if (flowPrefix === 'mr' && relatedIds[0] === selectedName) return opacity.flowSelected;
                } else if (selectedPrefix === 'role') {
                    // Only 'mr' flows ending with selectedName
                    if (flowPrefix === 'mr' && relatedIds[1] === selectedName) return opacity.flowSelected;
                }

                return opacity.dimmed;
            }
        } else {
            // Scenario B: A FLOW is Selected
            if (id === selectedTarget) return opacity.flowSelected;

            if (type === 'flow') {
                return opacity.dimmed;
            } else {
                // Node
                // Check if it is the source or target of the selected flow
                const cleanSelected = selectedTarget.substring(selectedTarget.indexOf('-') + 1); // Remove prefix (fm- or mr-)
                const [source, target] = cleanSelected.split('|||');

                const name = id.split('-').slice(1).join('-');

                if (name === source || name === target) {
                    return opacity.selected;
                }
                return opacity.dimmed; // Dim unrelated nodes for flow selection too
            }
        }
    };

    // Render Flow Path (Vertical Cubic Bezier) with Distributed Anchor Points
    const renderFlowGroup = (flows: FlowData[], startLayout: any[], endLayout: any[], prefix: string, isMethodTarget: boolean, startNodeFlowCounts: Record<string, number>, endNodeFlowCounts: Record<string, number>, allFlowsInGroup: FlowData[], startNodeScores: Record<string, number>, endNodeScores: Record<string, number>) => {
        // Build ordering maps for outgoing and incoming flows across the entire layer.
        const outgoingOrderMap: Record<string, FlowData[]> = {};
        const incomingOrderMap: Record<string, FlowData[]> = {};

        allFlowsInGroup.forEach(f => {
            if (!outgoingOrderMap[f.source]) outgoingOrderMap[f.source] = [];
            outgoingOrderMap[f.source].push(f);

            if (!incomingOrderMap[f.target]) incomingOrderMap[f.target] = [];
            incomingOrderMap[f.target].push(f);
        });

        // Sort outgoing flows for each source by the heuristic score of their target (desc)
        Object.keys(outgoingOrderMap).forEach(src => {
            outgoingOrderMap[src].sort((a, b) => {
                const scoreA = endNodeScores[a.target] || 0;
                const scoreB = endNodeScores[b.target] || 0;
                if (scoreB !== scoreA) return scoreB - scoreA;
                if (b.count !== a.count) return b.count - a.count;
                return a.target.localeCompare(b.target);
            });
        });

        // Sort incoming flows for each target by the heuristic score of their source (desc)
        Object.keys(incomingOrderMap).forEach(tgt => {
            incomingOrderMap[tgt].sort((a, b) => {
                const scoreA = startNodeScores[a.source] || 0;
                const scoreB = startNodeScores[b.source] || 0;
                if (scoreB !== scoreA) return scoreB - scoreA;
                if (b.count !== a.count) return b.count - a.count;
                return a.source.localeCompare(b.source);
            });
        });

        return flows.map((flow, index) => {
            const startNode = findNode(startLayout, flow.source);
            const endNode = findNode(endLayout, flow.target);
            if (!startNode || !endNode) return null;

            // Determine which method to use for color
            const flowMethodName = isMethodTarget ? flow.target : flow.source;
            const flowColor = methodColorMap[flowMethodName] || '#999999';

            const flowKey = `${prefix}-${flow.source}|||${flow.target}`;

            // Get the total number of distinct flows connecting to/from this node
            const totalOutgoingFlows = startNodeFlowCounts[flow.source] || 1;
            const totalIncomingFlows = endNodeFlowCounts[flow.target] || 1;

            // Determine index based on heuristic ordering maps we prepared above
            const outgoingList = outgoingOrderMap[flow.source] || [flow];
            const outgoingFlowIndex = outgoingList.findIndex(f => f.source === flow.source && f.target === flow.target);

            const incomingList = incomingOrderMap[flow.target] || [flow];
            const incomingFlowIndex = incomingList.findIndex(f => f.source === flow.source && f.target === flow.target);

            // Distribute anchors evenly along the node width; ordering is determined above only
            const startAnchorSpacing = totalOutgoingFlows > 1 ? startNode.width / (totalOutgoingFlows + 1) : startNode.width / 2;
            const startAnchorOffset = (Math.max(0, outgoingFlowIndex) + 1) * startAnchorSpacing;

            const endAnchorSpacing = totalIncomingFlows > 1 ? endNode.width / (totalIncomingFlows + 1) : endNode.width / 2;
            const endAnchorOffset = (Math.max(0, incomingFlowIndex) + 1) * endAnchorSpacing;

            // Outgoing link attached to bottom edge of source node, distributed horizontally
            const startX = startNode.x + startAnchorOffset;
            const startY = startNode.y + startNode.height;

            // Incoming link attached to top edge of target node, distributed horizontally
            const endX = endNode.x + endAnchorOffset;
            const endY = endNode.y;

            // Calculate vertical distance to determine curvature
            const verticalDistance = endY - startY;
            const midY = (startY + endY) / 2;

            // Subtle curvature variation: longer flows get slightly higher curvature
            const baseCurveStrength = 0.4; // Base control point offset factor
            const longFlowThreshold = 350; // Distance threshold for "long" flows
            const curveStrength = verticalDistance > longFlowThreshold
                ? baseCurveStrength * 1.1
                : baseCurveStrength;
            const controlOffsetY = verticalDistance * curveStrength;

            // Vertical Bezier with distributed anchor points and adaptive curvature
            const path = `M ${startX} ${startY} C ${startX} ${startY + controlOffsetY}, ${endX} ${endY - controlOffsetY}, ${endX} ${endY}`;
            const thickness = Math.max(LAYOUT_CONFIG.global.minFlowWidth, flow.count * LAYOUT_CONFIG.global.flowWidthMultiplier);

            return (
                <g key={flowKey}>
                    <path
                        d={path}
                        fill="none"
                        stroke={flowColor}
                        strokeWidth={thickness}
                        opacity={getItemOpacity('flow', flowKey, [flow.source, flow.target])}
                        onMouseEnter={() => setHoveredFlow(flowKey)}
                        onMouseLeave={() => setHoveredFlow(null)}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleFlowClick(flowKey);
                        }}
                        style={{
                            transition: 'all 0.3s',
                            cursor: 'pointer',
                            filter: hoveredFlow === flowKey || selectedTarget === flowKey ? 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' : 'none'
                        }}
                    />
                </g>
            );
        });
    };

    // Get details for the side panel
    const getFlowDetails = () => {
        const target = selectedTarget?.includes('|||') ? selectedTarget : hoveredFlow;
        if (!target) return null;

        const isFuncToMethod = target.startsWith('fm-');
        const key = target.substring(3);
        return isFuncToMethod ? funcToMethod[key] : methodToRole[key];
    };

    const flowDetails = getFlowDetails();

    return (
        <div className="w-full min-h-screen bg-slate-50 p-8 flex gap-6 font-sans" style={{ zoom: 0.8 } as React.CSSProperties}>
            {/* Diagram Area */}
            <div className="flex-1 bg-white rounded-xl shadow-xl border border-slate-200 p-8 overflow-auto relative">
                <div className="absolute top-4 left-8">
                    <h2 className="text-3xl font-bold text-slate-800">LLMs in Digital EDA - Literature Taxonomy</h2>
                    <p className="text-slate-500 mt-1">Vertical Flow: Function → Methods → LLM Role</p>
                </div>

                <svg width={width} height={height} className="mx-auto mt-12">
                    <defs>
                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.2" />
                        </filter>
                    </defs>

                    {/* Vertical Layer Headings (Rotated) */}
                    <g transform={`translate(${margin.left - 60}, ${layerY.function + LAYOUT_CONFIG.functions.height / 2}) rotate(-90)`}>
                        <text textAnchor="middle" className="font-bold" fill={HEADING_COLORS.function} style={{ fontSize: LAYOUT_CONFIG.global.headingFontSize }}>Function</text>
                    </g>
                    <g transform={`translate(${margin.left - 60}, ${layerY.method + LAYOUT_CONFIG.methods.height / 2}) rotate(-90)`}>
                        <text textAnchor="middle" className="font-bold" fill={HEADING_COLORS.method} style={{ fontSize: LAYOUT_CONFIG.global.headingFontSize }}>Methods</text>
                    </g>
                    <g transform={`translate(${margin.left - 60}, ${layerY.type + LAYOUT_CONFIG.categories.height / 2}) rotate(-90)`}>
                        <text textAnchor="middle" className="font-bold" fill={HEADING_COLORS.type} style={{ fontSize: LAYOUT_CONFIG.global.headingFontSize }}>LLM Role</text>
                    </g>

                    {/* Flows: Function -> Method */}
                    {Object.values(groupedFuncFlows).map(group => {
                        const allFlows = Object.values(groupedFuncFlows).flat();
                        return renderFlowGroup(group, functionLayout, methodLayout, 'fm', true, funcNodeFlowCounts.outgoing, funcNodeFlowCounts.incoming, allFlows, functionScores, methodScores);
                    })}

                    {/* Flows: Method -> Role */}
                    {Object.values(groupedMethodFlows).map(group => {
                        const allFlows = Object.values(groupedMethodFlows).flat();
                        return renderFlowGroup(group, methodLayout, roleLayout, 'mr', false, methodNodeFlowCounts.outgoing, methodNodeFlowCounts.incoming, allFlows, methodScores, roleScores);
                    })}

                    {/* Nodes: Function */}
                    {functionLayout.map((node, i) => (
                        <g
                            key={`f-${i}`}
                            transform={`translate(${node.x}, ${node.y})`}
                            onMouseEnter={() => setHoveredNode(`func-${node.name}`)}
                            onMouseLeave={() => setHoveredNode(null)}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNodeClick(`func-${node.name}`);
                            }}
                            style={{ cursor: 'pointer', opacity: getItemOpacity('node', `func-${node.name}`) }}
                        >
                            <rect
                                width={node.width}
                                height={node.height}
                                fill={HEADING_COLORS.function}
                                rx={6}
                                filter="url(#shadow)"
                                className="transition-all duration-300 hover:brightness-110"
                                stroke={selectedTarget === `func-${node.name}` ? '#000' : 'none'}
                                strokeWidth={selectedTarget === `func-${node.name}` ? 3 : 0}
                            />
                            <foreignObject x={0} y={0} width={node.width} height={node.height}>
                                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                    <span className="text-white font-bold leading-tight break-words w-full" style={{ fontSize: LAYOUT_CONFIG.functions.fontSize }}>
                                        {node.name}
                                    </span>
                                </div>
                            </foreignObject>
                        </g>
                    ))}

                    {/* Nodes: Method */}
                    {methodLayout.map((node, i) => (
                        <g
                            key={`m-${i}`}
                            transform={`translate(${node.x}, ${node.y})`}
                            onMouseEnter={() => setHoveredNode(`meth-${node.name}`)}
                            onMouseLeave={() => setHoveredNode(null)}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNodeClick(`meth-${node.name}`);
                            }}
                            style={{ cursor: 'pointer', opacity: getItemOpacity('node', `meth-${node.name}`) }}
                        >
                            <rect
                                width={node.width}
                                height={node.height}
                                fill={methodColorMap[node.name] || HEADING_COLORS.method}
                                rx={6}
                                filter="url(#shadow)"
                                className="transition-all duration-300 hover:brightness-110"
                                stroke={selectedTarget === `meth-${node.name}` ? '#000' : 'none'}
                                strokeWidth={selectedTarget === `meth-${node.name}` ? 3 : 0}
                            />
                            <foreignObject x={0} y={0} width={node.width} height={node.height}>
                                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                    <span className="text-white font-bold leading-tight break-words w-full" style={{ fontSize: LAYOUT_CONFIG.methods.fontSize }}>
                                        {node.name}
                                    </span>
                                </div>
                            </foreignObject>
                        </g>
                    ))}

                    {/* Nodes: Role (LLM Architectural Role) */}
                    {roleLayout.map((node, i) => (
                        <g
                            key={`r-${i}`}
                            transform={`translate(${node.x}, ${node.y})`}
                            onMouseEnter={() => setHoveredNode(`role-${node.name}`)}
                            onMouseLeave={() => setHoveredNode(null)}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNodeClick(`role-${node.name}`);
                            }}
                            style={{ cursor: 'pointer', opacity: getItemOpacity('node', `role-${node.name}`) }}
                        >
                            <rect
                                width={node.width}
                                height={LAYOUT_CONFIG.categories.height}
                                fill={ROLE_COLORS[node.name] || ROLE_DEFAULT_COLOR}
                                rx={6}
                                filter="url(#shadow)"
                                className="transition-all duration-300 hover:brightness-110"
                                stroke={selectedTarget === `role-${node.name}` ? '#000' : 'none'}
                                strokeWidth={selectedTarget === `role-${node.name}` ? 3 : 0}
                            />
                            <foreignObject x={0} y={0} width={node.width} height={LAYOUT_CONFIG.categories.height}>
                                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                    <span className="text-white font-bold leading-tight break-words w-full" style={{ fontSize: LAYOUT_CONFIG.categories.fontSize }}>
                                        {node.name}
                                    </span>
                                </div>
                            </foreignObject>
                        </g>
                    ))}
                </svg>

                {/* Legend removed - evaluation-based distinctions eliminated */}
            </div>

            {/* Side Panel */}
            <div className="w-80 flex-shrink-0 flex flex-col gap-4">
                <Card className="sticky top-8 shadow-lg border-t-4 border-slate-600">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                        <CardTitle className="text-lg font-bold text-slate-800">
                            {flowDetails ? 'Flow Details' : (selectedTarget && !selectedTarget.includes('|||')) || hoveredNode ? 'Node Details' : 'Interaction'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {flowDetails ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Connection</div>
                                    <div className="flex flex-col gap-1">
                                        <div className="font-semibold text-slate-700 p-2 bg-slate-100 rounded text-sm">{flowDetails.source}</div>
                                        <div className="text-center text-slate-400">↓</div>
                                        <div className="font-semibold text-slate-700 p-2 bg-slate-100 rounded text-sm">{flowDetails.target}</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Papers ({flowDetails.count})</div>
                                    <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                                        {flowDetails.papers.map((paper, idx) => (
                                            <PaperItem key={idx} paper={paper} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : ((selectedTarget && !selectedTarget.includes('|||')) || hoveredNode) ? (
                            (() => {
                                const activeNode = (selectedTarget && !selectedTarget.includes('|||')) ? selectedTarget : hoveredNode;
                                if (!activeNode) return null; // Should be unreachable due to condition
                                const parsed = parsePrefixedId(activeNode);
                                const nodeName = parsed.name;
                                const nodeType = parsed.prefix;
                                return (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                                        <div className="p-4 bg-slate-50 rounded border border-slate-100 text-center">
                                            <div className="text-2xl font-bold text-slate-800">
                                                {nodeName}
                                            </div>
                                            <div className="text-sm text-slate-500 mt-1 capitalize">
                                                {nodeType === 'func' ? 'Function / Application' :
                                                    nodeType === 'meth' ? 'Method / Technique' : 'LLM Architectural Role'}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="text-sm text-slate-600 italic border-l-4 border-slate-300 pl-3 py-1">
                                            {NODE_DESCRIPTIONS[getCanonicalNodeId(nodeName)] || "No description available."}
                                        </div>

                                        {/* Paper List */}
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                Associated Papers ({(() => {
                                                    const key = nodeType === 'func' ? 'functions' : nodeType === 'meth' ? 'methods' : 'roles';
                                                    // @ts-ignore
                                                    return nodeCounts[key][nodeName]?.length || 0;
                                                })()})
                                            </div>
                                            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                                                {(() => {
                                                    const key = nodeType === 'func' ? 'functions' : nodeType === 'meth' ? 'methods' : 'roles';
                                                    // @ts-ignore
                                                    const papers = nodeCounts[key][nodeName] || [];
                                                    return papers.map((paper: string, idx: number) => (
                                                        <PaperItem key={idx} paper={paper} />
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="text-slate-500 text-sm italic text-center py-8">
                                Hover over a flow connection or a node to view detailed metadata, paper lists, and counts.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SankeyDiagramVertical;
