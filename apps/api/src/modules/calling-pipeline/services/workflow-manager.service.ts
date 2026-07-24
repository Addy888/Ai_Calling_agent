import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallState, ConversationState, PipelineEvent } from '../enums/call-state.enum';

/**
 * Workflow Manager Service
 * Manages complex workflows and business logic orchestration
 */
@Injectable()
export class WorkflowManagerService {
  private readonly logger = new Logger(WorkflowManagerService.name);
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private activeWorkflows: Map<string, ActiveWorkflow> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.logger.log('Workflow Manager Service initialized');
    this.initializeDefaultWorkflows();
  }

  /**
   * Initialize default workflows
   */
  private initializeDefaultWorkflows(): void {
    // Sales Flow
    this.registerWorkflow({
      id: 'sales-flow',
      name: 'Sales Flow',
      type: 'sales',
      steps: [
        { id: 'greeting', name: 'Greeting', type: 'greeting' },
        { id: 'qualification', name: 'Qualification', type: 'question' },
        { id: 'pitch', name: 'Product Pitch', type: 'presentation' },
        { id: 'objection-handling', name: 'Handle Objections', type: 'conversation' },
        { id: 'closing', name: 'Close Sale', type: 'action' },
      ],
      transitions: {
        'greeting': ['qualification'],
        'qualification': ['pitch', 'closing'],
        'pitch': ['objection-handling', 'closing'],
        'objection-handling': ['pitch', 'closing'],
        'closing': [],
      },
    });

    // Support Flow
    this.registerWorkflow({
      id: 'support-flow',
      name: 'Support Flow',
      type: 'support',
      steps: [
        { id: 'greeting', name: 'Greeting', type: 'greeting' },
        { id: 'issue-identification', name: 'Identify Issue', type: 'question' },
        { id: 'troubleshooting', name: 'Troubleshooting', type: 'conversation' },
        { id: 'resolution', name: 'Provide Resolution', type: 'action' },
        { id: 'confirmation', name: 'Confirm Resolution', type: 'question' },
        { id: 'closing', name: 'Closing', type: 'closing' },
      ],
      transitions: {
        'greeting': ['issue-identification'],
        'issue-identification': ['troubleshooting'],
        'troubleshooting': ['resolution', 'issue-identification'],
        'resolution': ['confirmation'],
        'confirmation': ['closing', 'troubleshooting'],
        'closing': [],
      },
    });

    // Appointment Booking Flow
    this.registerWorkflow({
      id: 'appointment-flow',
      name: 'Appointment Booking Flow',
      type: 'appointment',
      steps: [
        { id: 'greeting', name: 'Greeting', type: 'greeting' },
        { id: 'check-availability', name: 'Check Availability', type: 'question' },
        { id: 'propose-times', name: 'Propose Times', type: 'presentation' },
        { id: 'confirm-booking', name: 'Confirm Booking', type: 'action' },
        { id: 'send-details', name: 'Send Details', type: 'action' },
        { id: 'closing', name: 'Closing', type: 'closing' },
      ],
      transitions: {
        'greeting': ['check-availability'],
        'check-availability': ['propose-times', 'closing'],
        'propose-times': ['confirm-booking', 'check-availability'],
        'confirm-booking': ['send-details'],
        'send-details': ['closing'],
        'closing': [],
      },
    });

    // Survey Flow
    this.registerWorkflow({
      id: 'survey-flow',
      name: 'Survey Flow',
      type: 'survey',
      steps: [
        { id: 'greeting', name: 'Greeting', type: 'greeting' },
        { id: 'consent', name: 'Get Consent', type: 'question' },
        { id: 'questions', name: 'Ask Questions', type: 'conversation' },
        { id: 'thank-you', name: 'Thank You', type: 'closing' },
      ],
      transitions: {
        'greeting': ['consent'],
        'consent': ['questions', 'thank-you'],
        'questions': ['thank-you'],
        'thank-you': [],
      },
    });

    this.logger.log('Default workflows initialized');
  }

  /**
   * Register a workflow
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    this.logger.log(`Workflow registered: ${workflow.id} - ${workflow.name}`);
  }

  /**
   * Start workflow for session
   */
  async startWorkflow(
    sessionId: string,
    workflowId: string,
    context?: Record<string, any>,
  ): Promise<void> {
    const workflow = this.workflows.get(workflowId);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    this.logger.log(`Starting workflow for session ${sessionId}: ${workflow.name}`);

    const activeWorkflow: ActiveWorkflow = {
      sessionId,
      workflowId,
      workflow,
      currentStepIndex: 0,
      currentStep: workflow.steps[0],
      completedSteps: [],
      context: context || {},
      startedAt: new Date(),
      updatedAt: new Date(),
    };

    this.activeWorkflows.set(sessionId, activeWorkflow);

    // Emit workflow started event
    this.eventEmitter.emit('workflow.started', {
      sessionId,
      workflowId,
      workflowName: workflow.name,
      timestamp: new Date(),
    });
  }

  /**
   * Transition to next step
   */
  async transitionToStep(
    sessionId: string,
    nextStepId: string,
    result?: any,
  ): Promise<WorkflowStep | null> {
    const activeWorkflow = this.activeWorkflows.get(sessionId);

    if (!activeWorkflow) {
      this.logger.warn(`No active workflow for session: ${sessionId}`);
      return null;
    }

    const { workflow, currentStep } = activeWorkflow;

    // Validate transition
    const allowedTransitions = workflow.transitions[currentStep.id];
    if (!allowedTransitions.includes(nextStepId)) {
      this.logger.warn(
        `Invalid workflow transition: ${currentStep.id} -> ${nextStepId}`
      );
      return null;
    }

    // Find next step
    const nextStep = workflow.steps.find(s => s.id === nextStepId);

    if (!nextStep) {
      this.logger.error(`Next step not found: ${nextStepId}`);
      return null;
    }

    // Mark current step as completed
    activeWorkflow.completedSteps.push({
      step: currentStep,
      completedAt: new Date(),
      result,
    });

    // Update current step
    activeWorkflow.currentStep = nextStep;
    activeWorkflow.currentStepIndex = workflow.steps.indexOf(nextStep);
    activeWorkflow.updatedAt = new Date();

    this.logger.log(
      `Workflow transition: ${sessionId} - ${currentStep.id} -> ${nextStep.id}`
    );

    // Emit transition event
    this.eventEmitter.emit('workflow.transitioned', {
      sessionId,
      fromStep: currentStep.id,
      toStep: nextStep.id,
      timestamp: new Date(),
    });

    // Check if workflow is complete
    if (allowedTransitions.length === 0) {
      await this.completeWorkflow(sessionId);
    }

    return nextStep;
  }

  /**
   * Get current step
   */
  getCurrentStep(sessionId: string): WorkflowStep | null {
    const activeWorkflow = this.activeWorkflows.get(sessionId);
    return activeWorkflow ? activeWorkflow.currentStep : null;
  }

  /**
   * Get workflow progress
   */
  getWorkflowProgress(sessionId: string): {
    totalSteps: number;
    completedSteps: number;
    currentStep: string;
    progressPercentage: number;
  } | null {
    const activeWorkflow = this.activeWorkflows.get(sessionId);

    if (!activeWorkflow) {
      return null;
    }

    const totalSteps = activeWorkflow.workflow.steps.length;
    const completedSteps = activeWorkflow.completedSteps.length;

    return {
      totalSteps,
      completedSteps,
      currentStep: activeWorkflow.currentStep.name,
      progressPercentage: (completedSteps / totalSteps) * 100,
    };
  }

  /**
   * Update workflow context
   */
  updateWorkflowContext(
    sessionId: string,
    key: string,
    value: any,
  ): void {
    const activeWorkflow = this.activeWorkflows.get(sessionId);

    if (!activeWorkflow) {
      return;
    }

    activeWorkflow.context[key] = value;
    activeWorkflow.updatedAt = new Date();
  }

  /**
   * Get workflow context
   */
  getWorkflowContext(sessionId: string): Record<string, any> | null {
    const activeWorkflow = this.activeWorkflows.get(sessionId);
    return activeWorkflow ? activeWorkflow.context : null;
  }

  /**
   * Complete workflow
   */
  private async completeWorkflow(sessionId: string): Promise<void> {
    const activeWorkflow = this.activeWorkflows.get(sessionId);

    if (!activeWorkflow) {
      return;
    }

    this.logger.log(`Workflow completed for session: ${sessionId}`);

    // Emit completion event
    this.eventEmitter.emit('workflow.completed', {
      sessionId,
      workflowId: activeWorkflow.workflowId,
      workflowName: activeWorkflow.workflow.name,
      duration: Date.now() - activeWorkflow.startedAt.getTime(),
      completedSteps: activeWorkflow.completedSteps.length,
      timestamp: new Date(),
    });

    // Clean up after some time
    setTimeout(() => {
      this.activeWorkflows.delete(sessionId);
    }, 60000); // 1 minute
  }

  /**
   * Get all available workflows
   */
  getAvailableWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): WorkflowDefinition | null {
    return this.workflows.get(workflowId) || null;
  }

  /**
   * Get active workflow
   */
  getActiveWorkflow(sessionId: string): ActiveWorkflow | null {
    return this.activeWorkflows.get(sessionId) || null;
  }

  /**
   * Handle workflow based on conversation state
   */
  async handleConversationStateChange(
    sessionId: string,
    state: ConversationState,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const activeWorkflow = this.activeWorkflows.get(sessionId);

    if (!activeWorkflow) {
      return;
    }

    // Automatic workflow progression based on conversation state
    switch (state) {
      case ConversationState.GREETING:
        // Already at greeting step, no action needed
        break;

      case ConversationState.LISTENING:
        // Customer is speaking, workflow stays at current step
        break;

      case ConversationState.THINKING:
        // Agent is processing, workflow stays at current step
        break;

      case ConversationState.RESPONDING:
        // Agent is responding, check if we should progress
        // This would be triggered by business logic in agent execution
        break;

      case ConversationState.CLOSING:
        // Move to closing step if available
        const closingSteps = activeWorkflow.workflow.steps.filter(
          s => s.type === 'closing'
        );
        if (closingSteps.length > 0) {
          await this.transitionToStep(sessionId, closingSteps[0].id);
        }
        break;

      case ConversationState.ENDED:
        await this.completeWorkflow(sessionId);
        break;
    }
  }

  /**
   * Cancel workflow
   */
  async cancelWorkflow(sessionId: string, reason?: string): Promise<void> {
    const activeWorkflow = this.activeWorkflows.get(sessionId);

    if (!activeWorkflow) {
      return;
    }

    this.logger.log(`Workflow cancelled for session: ${sessionId}, reason: ${reason}`);

    this.eventEmitter.emit('workflow.cancelled', {
      sessionId,
      workflowId: activeWorkflow.workflowId,
      reason,
      timestamp: new Date(),
    });

    this.activeWorkflows.delete(sessionId);
  }

  /**
   * Get workflow statistics
   */
  getStatistics(): {
    totalWorkflows: number;
    activeWorkflows: number;
    byType: Record<string, number>;
  } {
    const active = Array.from(this.activeWorkflows.values());

    const byType: Record<string, number> = {};

    active.forEach(workflow => {
      const type = workflow.workflow.type;
      byType[type] = (byType[type] || 0) + 1;
    });

    return {
      totalWorkflows: this.workflows.size,
      activeWorkflows: active.length,
      byType,
    };
  }
}

/**
 * Workflow Definition
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  type: 'sales' | 'support' | 'appointment' | 'survey' | 'custom';
  description?: string;
  steps: WorkflowStep[];
  transitions: Record<string, string[]>; // stepId -> allowed next stepIds
}

/**
 * Workflow Step
 */
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'greeting' | 'question' | 'presentation' | 'conversation' | 'action' | 'closing';
  description?: string;
  config?: Record<string, any>;
}

/**
 * Active Workflow
 */
interface ActiveWorkflow {
  sessionId: string;
  workflowId: string;
  workflow: WorkflowDefinition;
  currentStepIndex: number;
  currentStep: WorkflowStep;
  completedSteps: CompletedStep[];
  context: Record<string, any>;
  startedAt: Date;
  updatedAt: Date;
}

/**
 * Completed Step
 */
interface CompletedStep {
  step: WorkflowStep;
  completedAt: Date;
  result?: any;
}
