import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateScriptVersionDto,
  CreateScriptNodeDto,
  CreateScriptBranchDto,
  CreateScriptVariableDto,
  ExecuteScriptDto,
  ValidateScriptDto,
  PublishScriptDto,
  PreviewScriptDto,
  NodeType,
  VariableType,
} from './dto/script-engine.dto';

@Injectable()
export class ScriptEngineService {
  private readonly logger = new Logger(ScriptEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createVersion(dto: CreateScriptVersionDto, userId: string) {
    const script = await this.prisma.script.findUnique({
      where: { id: dto.scriptId },
    });

    if (!script) {
      throw new NotFoundException('Script not found');
    }

    const existingVersion = await this.prisma.scriptVersion.findUnique({
      where: {
        scriptId_version: {
          scriptId: dto.scriptId,
          version: dto.version,
        },
      },
    });

    if (existingVersion) {
      throw new BadRequestException('Version already exists');
    }

    return this.prisma.scriptVersion.create({
      data: {
        scriptId: dto.scriptId,
        version: dto.version,
        description: dto.description,
        metadata: dto.metadata || {},
        status: 'DRAFT',
        createdBy: userId,
      },
      include: {
        script: true,
        nodes: true,
        branches: true,
        variables: true,
      },
    });
  }

  async getVersion(id: string) {
    const version = await this.prisma.scriptVersion.findUnique({
      where: { id },
      include: {
        script: true,
        nodes: {
          orderBy: { order: 'asc' },
        },
        branches: {
          orderBy: { order: 'asc' },
          include: {
            fromNode: true,
            toNode: true,
          },
        },
        variables: true,
      },
    });

    if (!version) {
      throw new NotFoundException('Script version not found');
    }

    return version;
  }

  async updateVersion(id: string, data: Partial<CreateScriptVersionDto>, userId: string) {
    const version = await this.prisma.scriptVersion.findUnique({
      where: { id },
    });

    if (!version) {
      throw new NotFoundException('Script version not found');
    }

    if (version.status === 'PUBLISHED') {
      throw new BadRequestException('Cannot update published version');
    }

    return this.prisma.scriptVersion.update({
      where: { id },
      data: {
        description: data.description,
        metadata: data.metadata,
        updatedAt: new Date(),
      },
      include: {
        script: true,
        nodes: true,
        branches: true,
        variables: true,
      },
    });
  }

  async publishVersion(dto: PublishScriptDto, userId: string) {
    const version = await this.getVersion(dto.versionId);

    if (version.status === 'PUBLISHED') {
      throw new BadRequestException('Version already published');
    }

    const validation = await this.validateScript({ versionId: dto.versionId });
    if (!validation.isValid) {
      throw new BadRequestException(`Script validation failed: ${validation.errors.join(', ')}`);
    }

    return this.prisma.scriptVersion.update({
      where: { id: dto.versionId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedBy: userId,
      },
      include: {
        script: true,
        nodes: true,
        branches: true,
        variables: true,
      },
    });
  }

  async archiveVersion(id: string) {
    const version = await this.prisma.scriptVersion.findUnique({
      where: { id },
    });

    if (!version) {
      throw new NotFoundException('Script version not found');
    }

    return this.prisma.scriptVersion.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
      },
    });
  }

  async createNode(dto: CreateScriptNodeDto, userId: string) {
    const version = await this.prisma.scriptVersion.findUnique({
      where: { id: dto.versionId },
    });

    if (!version) {
      throw new NotFoundException('Script version not found');
    }

    if (version.status === 'PUBLISHED') {
      throw new BadRequestException('Cannot modify published version');
    }

    const existingNode = await this.prisma.scriptNode.findUnique({
      where: {
        versionId_nodeId: {
          versionId: dto.versionId,
          nodeId: dto.nodeId,
        },
      },
    });

    if (existingNode) {
      throw new BadRequestException('Node with this ID already exists');
    }

    return this.prisma.scriptNode.create({
      data: {
        versionId: dto.versionId,
        nodeId: dto.nodeId,
        type: dto.type,
        name: dto.name,
        content: dto.content,
        position: dto.position || {},
        config: dto.config || {},
        order: dto.order || 0,
        isEntryPoint: dto.isEntryPoint || false,
        isExitPoint: dto.isExitPoint || false,
        metadata: dto.metadata || {},
      },
    });
  }

  async getNode(id: string) {
    const node = await this.prisma.scriptNode.findUnique({
      where: { id },
      include: {
        version: true,
        branchesFrom: true,
        branchesTo: true,
      },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    return node;
  }

  async updateNode(id: string, data: Partial<CreateScriptNodeDto>, userId: string) {
    const node = await this.prisma.scriptNode.findUnique({
      where: { id },
      include: { version: true },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    if (node.version.status === 'PUBLISHED') {
      throw new BadRequestException('Cannot modify published version');
    }

    return this.prisma.scriptNode.update({
      where: { id },
      data: {
        name: data.name,
        content: data.content,
        position: data.position,
        config: data.config,
        order: data.order,
        isEntryPoint: data.isEntryPoint,
        isExitPoint: data.isExitPoint,
        metadata: data.metadata,
        updatedAt: new Date(),
      },
    });
  }

  async deleteNode(id: string) {
    const node = await this.prisma.scriptNode.findUnique({
      where: { id },
      include: { version: true },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    if (node.version.status === 'PUBLISHED') {
      throw new BadRequestException('Cannot modify published version');
    }

    await this.prisma.scriptBranch.deleteMany({
      where: {
        OR: [{ fromNodeId: id }, { toNodeId: id }],
      },
    });

    return this.prisma.scriptNode.delete({
      where: { id },
    });
  }

  async createBranch(dto: CreateScriptBranchDto, userId: string) {
    const version = await this.prisma.scriptVersion.findUnique({
      where: { id: dto.versionId },
    });

    if (!version) {
      throw new NotFoundException('Script version not found');
    }

    if (version.status === 'PUBLISHED') {
      throw new BadRequestException('Cannot modify published version');
    }

    const fromNode = await this.prisma.scriptNode.findFirst({
      where: { id: dto.fromNodeId, versionId: dto.versionId },
    });

    const toNode = await this.prisma.scriptNode.findFirst({
      where: { id: dto.toNodeId, versionId: dto.versionId },
    });

    if (!fromNode || !toNode) {
      throw new NotFoundException('From or To node not found');
    }

    return this.prisma.scriptBranch.create({
      data: {
        versionId: dto.versionId,
        fromNodeId: dto.fromNodeId,
        toNodeId: dto.toNodeId,
        condition: dto.condition || {},
        label: dto.label,
        order: dto.order || 0,
        metadata: dto.metadata || {},
      },
      include: {
        fromNode: true,
        toNode: true,
      },
    });
  }

  async getBranch(id: string) {
    const branch = await this.prisma.scriptBranch.findUnique({
      where: { id },
      include: {
        version: true,
        fromNode: true,
        toNode: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async updateBranch(id: string, data: Partial<CreateScriptBranchDto>, userId: string) {
    const branch = await this.prisma.scriptBranch.findUnique({
      where: { id },
      include: { version: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    if (branch.version.status === 'PUBLISHED') {
      throw new BadRequestException('Cannot modify published version');
    }

    return this.prisma.scriptBranch.update({
      where: { id },
      data: {
        condition: data.condition,
        label: data.label,
        order: data.order,
        metadata: data.metadata,
        updatedAt: new Date(),
      },
      include: {
        fromNode: true,
        toNode: true,
      },
    });
  }

  async deleteBranch(id: string) {
    const branch = await this.prisma.scriptBranch.findUnique({
      where: { id },
      include: { version: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    if (branch.version.status === 'PUBLISHED') {
      throw new BadRequestException('Cannot modify published version');
    }

    return this.prisma.scriptBranch.delete({
      where: { id },
    });
  }

  async createVariable(dto: CreateScriptVariableDto, userId: string) {
    const version = await this.prisma.scriptVersion.findUnique({
      where: { id: dto.versionId },
    });

    if (!version) {
      throw new NotFoundException('Script version not found');
    }

    if (version.status === 'PUBLISHED') {
      throw new BadRequestException('Cannot modify published version');
    }

    const existingVariable = await this.prisma.scriptVariable.findUnique({
      where: {
        versionId_name: {
          versionId: dto.versionId,
          name: dto.name,
        },
      },
    });

    if (existingVariable) {
      throw new BadRequestException('Variable with this name already exists');
    }

    return this.prisma.scriptVariable.create({
      data: {
        versionId: dto.versionId,
        name: dto.name,
        type: dto.type,
        defaultValue: dto.defaultValue,
        description: dto.description,
        isRequired: dto.isRequired || false,
        metadata: dto.metadata || {},
      },
    });
  }

  async getVariable(id: string) {
    const variable = await this.prisma.scriptVariable.findUnique({
      where: { id },
      include: { version: true },
    });

    if (!variable) {
      throw new NotFoundException('Variable not found');
    }

    return variable;
  }

  async updateVariable(id: string, data: Partial<CreateScriptVariableDto>, userId: string) {
    const variable = await this.prisma.scriptVariable.findUnique({
      where: { id },
      include: { version: true },
    });

    if (!variable) {
      throw new NotFoundException('Variable not found');
    }

    if (variable.version.status === 'PUBLISHED') {
      throw new BadRequestException('Cannot modify published version');
    }

    return this.prisma.scriptVariable.update({
      where: { id },
      data: {
        defaultValue: data.defaultValue,
        description: data.description,
        isRequired: data.isRequired,
        metadata: data.metadata,
        updatedAt: new Date(),
      },
    });
  }

  async deleteVariable(id: string) {
    const variable = await this.prisma.scriptVariable.findUnique({
      where: { id },
      include: { version: true },
    });

    if (!variable) {
      throw new NotFoundException('Variable not found');
    }

    if (variable.version.status === 'PUBLISHED') {
      throw new BadRequestException('Cannot modify published version');
    }

    return this.prisma.scriptVariable.delete({
      where: { id },
    });
  }

  async validateScript(dto: ValidateScriptDto) {
    const version = await this.getVersion(dto.versionId);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!version.nodes || version.nodes.length === 0) {
      errors.push('Script has no nodes');
      return { isValid: false, errors, warnings };
    }

    const entryPoints = version.nodes.filter((n) => n.isEntryPoint);
    if (entryPoints.length === 0) {
      errors.push('Script has no entry point');
    } else if (entryPoints.length > 1) {
      warnings.push('Script has multiple entry points');
    }

    const exitPoints = version.nodes.filter((n) => n.isExitPoint);
    if (exitPoints.length === 0) {
      warnings.push('Script has no exit point');
    }

    const nodeIds = new Set(version.nodes.map((n) => n.id));
    const nodeIdMap = new Map(version.nodes.map((n) => [n.id, n]));

    for (const branch of version.branches || []) {
      if (!nodeIds.has(branch.fromNodeId)) {
        errors.push(`Branch references non-existent from node: ${branch.fromNodeId}`);
      }
      if (!nodeIds.has(branch.toNodeId)) {
        errors.push(`Branch references non-existent to node: ${branch.toNodeId}`);
      }
    }

    const visited = new Set<string>();
    const queue: string[] = entryPoints.map((n) => n.id);

    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (!nodeId || visited.has(nodeId)) continue;
      visited.add(nodeId);

      const outgoingBranches = version.branches?.filter((b) => b.fromNodeId === nodeId) || [];
      for (const branch of outgoingBranches) {
        if (!visited.has(branch.toNodeId)) {
          queue.push(branch.toNodeId);
        }
      }
    }

    const unreachableNodes = version.nodes.filter((n) => !visited.has(n.id) && !n.isEntryPoint);
    if (unreachableNodes.length > 0) {
      warnings.push(`${unreachableNodes.length} unreachable node(s) found`);
    }

    for (const node of version.nodes) {
      if (node.type === NodeType.MESSAGE || node.type === NodeType.QUESTION) {
        if (!node.content || node.content.trim() === '') {
          errors.push(`Node ${node.name} has no content`);
        }
      }
    }

    const requiredVariables = version.variables?.filter((v) => v.isRequired) || [];
    for (const variable of requiredVariables) {
      if (!variable.defaultValue) {
        warnings.push(`Required variable ${variable.name} has no default value`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalNodes: version.nodes.length,
        totalBranches: version.branches?.length || 0,
        totalVariables: version.variables?.length || 0,
        entryPoints: entryPoints.length,
        exitPoints: exitPoints.length,
        reachableNodes: visited.size,
        unreachableNodes: unreachableNodes.length,
      },
    };
  }

  async executeScript(dto: ExecuteScriptDto) {
    const version = await this.getVersion(dto.versionId);

    if (version.status !== 'PUBLISHED') {
      throw new BadRequestException('Can only execute published versions');
    }

    let execution;
    if (dto.executionId) {
      execution = await this.prisma.scriptExecution.findUnique({
        where: { id: dto.executionId },
      });
      if (!execution) {
        throw new NotFoundException('Execution not found');
      }
    } else {
      const entryPoint = version.nodes.find((n) => n.isEntryPoint);
      if (!entryPoint) {
        throw new BadRequestException('No entry point found');
      }

      const initialVariables = { ...dto.variables };
      for (const variable of version.variables || []) {
        if (!(variable.name in initialVariables)) {
          initialVariables[variable.name] = variable.defaultValue;
        }
      }

      execution = await this.prisma.scriptExecution.create({
        data: {
          versionId: dto.versionId,
          contactId: dto.contactId,
          currentNodeId: entryPoint.nodeId,
          state: { step: 0 },
          variables: initialVariables,
          history: [],
          status: 'RUNNING',
        },
      });
    }

    const currentNode = version.nodes.find((n) => n.nodeId === (dto.currentNodeId || execution.currentNodeId));
    if (!currentNode) {
      throw new NotFoundException('Current node not found');
    }

    const result = await this.processNode(currentNode, execution, dto.userInput, version);

    await this.prisma.scriptExecution.update({
      where: { id: execution.id },
      data: {
        currentNodeId: result.nextNodeId,
        state: result.state,
        variables: result.variables,
        history: result.history,
        status: result.status,
        completedAt: result.status === 'COMPLETED' ? new Date() : null,
      },
    });

    return {
      executionId: execution.id,
      currentNode: result.currentNode,
      nextNode: result.nextNode,
      response: result.response,
      variables: result.variables,
      status: result.status,
      isComplete: result.status === 'COMPLETED',
    };
  }

  private async processNode(node: any, execution: any, userInput: string | undefined, version: any) {
    const state = execution.state || { step: 0 };
    const variables = execution.variables || {};
    const history = execution.history || [];

    history.push({
      nodeId: node.nodeId,
      nodeName: node.name,
      input: userInput,
      timestamp: new Date().toISOString(),
    });

    let nextNodeId = null;
    let response = '';
    let status = 'RUNNING';

    switch (node.type) {
      case NodeType.START:
        response = 'Script started';
        nextNodeId = this.getNextNode(node, variables, version);
        break;

      case NodeType.MESSAGE:
        response = this.replaceVariables(node.content || '', variables);
        nextNodeId = this.getNextNode(node, variables, version);
        break;

      case NodeType.QUESTION:
        response = this.replaceVariables(node.content || '', variables);
        if (userInput) {
          const variableName = node.config?.variableName;
          if (variableName) {
            variables[variableName] = userInput;
          }
          nextNodeId = this.getNextNode(node, variables, version);
        }
        break;

      case NodeType.CONDITION:
        const condition = node.config?.condition;
        const conditionResult = this.evaluateCondition(condition, variables);
        variables[`${node.nodeId}_result`] = conditionResult;
        nextNodeId = this.getNextNode(node, variables, version);
        response = `Condition evaluated: ${conditionResult}`;
        break;

      case NodeType.VARIABLE:
        const varName = node.config?.variableName;
        const varValue = node.config?.variableValue;
        if (varName) {
          variables[varName] = this.replaceVariables(varValue || '', variables);
        }
        nextNodeId = this.getNextNode(node, variables, version);
        response = `Variable ${varName} set`;
        break;

      case NodeType.END:
        response = this.replaceVariables(node.content || 'Script completed', variables);
        status = 'COMPLETED';
        break;

      default:
        response = 'Unknown node type';
        nextNodeId = this.getNextNode(node, variables, version);
    }

    state.step += 1;

    const nextNode = nextNodeId ? version.nodes.find((n: any) => n.nodeId === nextNodeId) : null;

    return {
      currentNode: node,
      nextNode,
      nextNodeId,
      response,
      variables,
      state,
      history,
      status,
    };
  }

  private getNextNode(currentNode: any, variables: any, version: any): string | null {
    const branches = version.branches?.filter((b: any) => b.fromNodeId === currentNode.id) || [];

    if (branches.length === 0) {
      return null;
    }

    for (const branch of branches) {
      if (!branch.condition || Object.keys(branch.condition).length === 0) {
        return version.nodes.find((n: any) => n.id === branch.toNodeId)?.nodeId || null;
      }

      if (this.evaluateCondition(branch.condition, variables)) {
        return version.nodes.find((n: any) => n.id === branch.toNodeId)?.nodeId || null;
      }
    }

    const defaultBranch = branches[0];
    return version.nodes.find((n: any) => n.id === defaultBranch.toNodeId)?.nodeId || null;
  }

  private evaluateCondition(condition: any, variables: any): boolean {
    if (!condition) return true;

    const { operator, field, value } = condition;

    const fieldValue = variables[field];

    switch (operator) {
      case 'equals':
        return fieldValue == value;
      case 'notEquals':
        return fieldValue != value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'greaterThan':
        return Number(fieldValue) > Number(value);
      case 'lessThan':
        return Number(fieldValue) < Number(value);
      case 'isEmpty':
        return !fieldValue || fieldValue === '';
      case 'isNotEmpty':
        return !!fieldValue && fieldValue !== '';
      default:
        return true;
    }
  }

  private replaceVariables(content: string, variables: any): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result;
  }

  async previewScript(dto: PreviewScriptDto) {
    const version = await this.getVersion(dto.versionId);

    const results = [];
    for (const input of dto.inputs) {
      const node = version.nodes.find((n) => n.nodeId === input.nodeId);
      if (!node) {
        results.push({
          nodeId: input.nodeId,
          error: 'Node not found',
        });
        continue;
      }

      const mockExecution = {
        variables: {},
        state: {},
        history: [],
      };

      const result = await this.processNode(node, mockExecution, input.input, version);
      results.push({
        nodeId: input.nodeId,
        nodeName: node.name,
        input: input.input,
        response: result.response,
        nextNode: result.nextNode?.name,
        variables: result.variables,
      });
    }

    return {
      versionId: dto.versionId,
      results,
    };
  }

  async cloneVersion(id: string, newVersion: string, userId: string) {
    const original = await this.getVersion(id);

    const cloned = await this.prisma.scriptVersion.create({
      data: {
        scriptId: original.scriptId,
        version: newVersion,
        description: `Cloned from ${original.version}`,
        status: 'DRAFT',
        metadata: original.metadata,
        createdBy: userId,
      },
    });

    const nodeIdMap = new Map<string, string>();

    for (const node of original.nodes) {
      const newNode = await this.prisma.scriptNode.create({
        data: {
          versionId: cloned.id,
          nodeId: node.nodeId,
          type: node.type,
          name: node.name,
          content: node.content,
          position: node.position,
          config: node.config,
          order: node.order,
          isEntryPoint: node.isEntryPoint,
          isExitPoint: node.isExitPoint,
          metadata: node.metadata,
        },
      });
      nodeIdMap.set(node.id, newNode.id);
    }

    for (const branch of original.branches || []) {
      const newFromNodeId = nodeIdMap.get(branch.fromNodeId);
      const newToNodeId = nodeIdMap.get(branch.toNodeId);
      if (newFromNodeId && newToNodeId) {
        await this.prisma.scriptBranch.create({
          data: {
            versionId: cloned.id,
            fromNodeId: newFromNodeId,
            toNodeId: newToNodeId,
            condition: branch.condition,
            label: branch.label,
            order: branch.order,
            metadata: branch.metadata,
          },
        });
      }
    }

    for (const variable of original.variables || []) {
      await this.prisma.scriptVariable.create({
        data: {
          versionId: cloned.id,
          name: variable.name,
          type: variable.type,
          defaultValue: variable.defaultValue,
          description: variable.description,
          isRequired: variable.isRequired,
          metadata: variable.metadata,
        },
      });
    }

    return this.getVersion(cloned.id);
  }
}
