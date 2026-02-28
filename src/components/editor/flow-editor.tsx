"use client";

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { ActionPalette } from "./action-palette";
import { ActionNode } from "./action-node";
import { StepConfigPanel } from "./step-config-panel";
import { saveFlowDefinition } from "@/app/(dashboard)/robots/actions";
import { Save } from "lucide-react";

const nodeTypes = {
  actionNode: ActionNode,
};

interface FlowEditorProps {
  robotId: string;
  initialNodes: Node[];
  initialEdges: Edge[];
}

export function FlowEditor({
  robotId,
  initialNodes,
  initialEdges,
}: FlowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const data = e.dataTransfer.getData("application/reactflow");
      if (!data || !reactFlowInstance) return;

      const parsed = JSON.parse(data);
      const position = reactFlowInstance.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: "actionNode",
        position,
        data: parsed,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onNodeDataUpdate = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data } : n))
      );
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, data } : prev
      );
    },
    [setNodes]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const flowNodes = nodes.map((n) => ({
        id: n.id,
        type: (n.data as { actionType: string }).actionType,
        position: n.position,
        data: n.data,
      }));
      const flowEdges = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label as string | undefined,
      }));
      await saveFlowDefinition(robotId, {
        nodes: flowNodes,
        edges: flowEdges,
      });
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, robotId]);

  return (
    <div className="flex h-full">
      <ActionPalette />

      <div className="relative flex-1" ref={reactFlowWrapper}>
        <div className="absolute right-3 top-3 z-10">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "保存中..." : "保存"}
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          className="bg-gray-50"
        >
          <Background />
          <Controls />
          <MiniMap
            nodeStrokeWidth={3}
            className="!bottom-3 !right-3"
          />
        </ReactFlow>
      </div>

      {selectedNode && (
        <StepConfigPanel
          node={selectedNode}
          onUpdate={onNodeDataUpdate}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
