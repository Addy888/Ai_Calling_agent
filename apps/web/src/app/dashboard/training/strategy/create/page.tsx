'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import step components
import BasicInfoStep from './steps/BasicInfoStep';
import ObjectiveConfigStep from './steps/ObjectiveConfigStep';
import DatasetStrategyStep from './steps/DatasetStrategyStep';
import SamplingStrategyStep from './steps/SamplingStrategyStep';
import LossFunctionStep from './steps/LossFunctionStep';
import EvaluationStrategyStep from './steps/EvaluationStrategyStep';
import FailureStrategyStep from './steps/FailureStrategyStep';
import ReviewStep from './steps/ReviewStep';

const STEPS = [
  { id: 1, title: 'Basic Info', description: 'Strategy name and type' },
  { id: 2, title: 'Objectives', description: 'Training objectives' },
  { id: 3, title: 'Dataset', description: 'Dataset configuration' },
  { id: 4, title: 'Sampling', description: 'Sampling strategy' },
  { id: 5, title: 'Loss Function', description: 'Loss configuration' },
  { id: 6, title: 'Evaluation', description: 'Evaluation strategy' },
  { id: 7, title: 'Failure Handling', description: 'Failure recovery' },
  { id: 8, title: 'Review', description: 'Review and create' },
];

export default function CreateStrategyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    description: '',
    strategyType: 'SUPERVISED_FINE_TUNING',
    pipelineType: 'SINGLE_STAGE',
    fineTuningConfigId: '',
    hyperparameterConfigId: '',

    // Objectives
    primaryObjective: '',
    secondaryObjective: '',
    conversationObjective: '',
    instructionObjective: '',
    responseQualityObjective: '',
    knowledgeRetentionObjective: '',

    // Dataset Strategy
    primaryDatasetId: '',
    secondaryDatasetId: '',
    validationDatasetId: '',
    datasetMixingRatio: 0.5,
    shuffleDataset: true,

    // Sampling Strategy
    samplingStrategy: 'RANDOM',

    // Loss Function
    lossFunction: 'CROSS_ENTROPY',
    labelSmoothing: 0,
    weightedLoss: false,

    // Training Flow
    evaluationBetweenStages: true,
    checkpointBetweenStages: true,
    resumeSupport: true,

    // Evaluation Strategy
    evaluationInterval: 100,
    evaluationFrequency: 100,
    automaticBestModelSelection: true,
    earlyEvaluation: false,

    // Failure Strategy
    retryCount: 3,
    resumeFromCheckpoint: true,
    rollbackStrategy: 'LAST_CHECKPOINT',
    abortPolicy: 'MANUAL',
    failureNotificationEnabled: true,
  });

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/training/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create strategy');
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: 'Training strategy created successfully',
      });

      router.push(`/dashboard/training/strategy/${result.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create strategy',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoStep formData={formData} updateFormData={updateFormData} />;
      case 2:
        return <ObjectiveConfigStep formData={formData} updateFormData={updateFormData} />;
      case 3:
        return <DatasetStrategyStep formData={formData} updateFormData={updateFormData} />;
      case 4:
        return <SamplingStrategyStep formData={formData} updateFormData={updateFormData} />;
      case 5:
        return <LossFunctionStep formData={formData} updateFormData={updateFormData} />;
      case 6:
        return <EvaluationStrategyStep formData={formData} updateFormData={updateFormData} />;
      case 7:
        return <FailureStrategyStep formData={formData} updateFormData={updateFormData} />;
      case 8:
        return <ReviewStep formData={formData} />;
      default:
        return null;
    }
  };

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Training Strategy</h1>
          <p className="text-muted-foreground">Configure a new training strategy</p>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {STEPS[currentStep - 1].description}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">{Math.round(progress)}%</div>
            </div>
            <Progress value={progress} className="h-2" />

            {/* Step indicators */}
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center ${
                    step.id === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : step.id < currentStep
                        ? 'bg-green-50 border-green-200'
                        : 'bg-muted'
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      step.id === currentStep
                        ? 'bg-primary-foreground text-primary'
                        : step.id < currentStep
                          ? 'bg-green-500 text-white'
                          : 'bg-muted-foreground text-muted'
                    }`}
                  >
                    {step.id < currentStep ? <Check className="h-3 w-3" /> : step.id}
                  </div>
                  <span className="text-xs font-medium">{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">{renderStep()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1 || loading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/training/strategy')}
            disabled={loading}
          >
            Cancel
          </Button>

          {currentStep === STEPS.length ? (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Strategy
              <Check className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={loading}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
