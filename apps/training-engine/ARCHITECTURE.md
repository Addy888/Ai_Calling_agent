# Training Engine Architecture

Detailed architecture documentation for the AI Training Engine.

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     AI Training Engine                         │
│                     (Python FastAPI)                           │
└────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐         ┌──────▼──────┐      ┌──────▼──────┐
   │   API   │         │    Core     │      │   Health    │
   │  Layer  │         │   Engine    │      │   Checks    │
   └────┬────┘         └──────┬──────┘      └─────────────┘
        │                     │
        │              ┌──────▼──────┐
        │              │ Job Runner  │
        │              └──────┬──────┘
        │                     │
        │         ┌───────────┼───────────┐
        │         │           │           │
        │    ┌────▼────┐ ┌───▼────┐ ┌────▼────┐
        │    │  Queue  │ │Session │ │ Process │
        │    │ Manager │ │Manager │ │ Manager │
        │    └────┬────┘ └───┬────┘ └────┬────┘
        │         │           │           │
        │         └───────────┼───────────┘
        │                     │
        │              ┌──────▼──────┐
        │              │Worker Pool  │
        │              └──────┬──────┘
        │                     │
        │         ┌───────────┼───────────┐
        │         │           │           │
        │    ┌────▼────┐ ┌───▼────┐ ┌────▼────┐
        │    │Worker 1 │ │Worker 2│ │Worker N │
        │    └─────────┘ └────────┘ └─────────┘
        │
        └──────────────────┐
                     ┌─────▼─────┐
                     │Event Bus  │
                     └───────────┘
```

## 📦 Component Architecture

### 1. API Layer (`app/api/`)

**Responsibility:** HTTP request handling and routing

```python
FastAPI Application
    │
    ├── Middleware Stack
    │   ├── Logging Middleware
    │   ├── Error Handling Middleware
    │   └── Authentication Middleware
    │
    └── Routes
        ├── /training/session (POST)
        ├── /training/start (POST)
        ├── /training/pause (POST)
        ├── /training/resume (POST)
        ├── /training/cancel (POST)
        ├── /training/session/{id} (GET)
        ├── /training/status/{id} (GET)
        ├── /training/jobs (GET)
        └── /training/health (GET)
```

### 2. Core Engine (`app/core/`)

**Responsibility:** Application initialization and lifecycle

```python
TrainingEngineCore
    ├── queue_manager: QueueManager
    ├── session_manager: TrainingSessionManager
    ├── process_manager: TrainingProcessManager
    └── job_runner: TrainingJobRunner
```

### 3. Job Runner (`app/jobs/`)

**Responsibility:** Orchestrate training job execution

```python
TrainingJobRunner
    │
    ├── queue_manager: QueueManager
    ├── session_manager: TrainingSessionManager
    ├── process_manager: TrainingProcessManager
    └── worker_pool: WorkerPool
    │
    ├── Methods
    │   ├── start() - Start job processing loop
    │   ├── stop() - Stop job runner
    │   ├── submit_job() - Submit new job
    │   ├── pause_job() - Pause running job
    │   ├── resume_job() - Resume paused job
    │   └── cancel_job() - Cancel job
    │
    └── Internal
        ├── _run_loop() - Main processing loop
        └── _execute_job() - Execute single job
```

### 4. Queue Manager (`app/queue/`)

**Responsibility:** Job queue management

```python
QueueManager
    │
    ├── Interface: QueueInterface
    │
    ├── Implementations
    │   ├── MemoryQueue (Current)
    │   └── RedisQueue (Future)
    │
    └── Methods
        ├── add_job()
        ├── get_next_job()
        ├── get_job()
        ├── update_job_status()
        ├── cancel_job()
        └── get_queue_size()
```

### 5. Session Manager (`app/sessions/`)

**Responsibility:** Training session lifecycle management

```python
TrainingSessionManager
    │
    ├── Sessions Store: Dict[str, TrainingSession]
    │
    └── Methods
        ├── create_session()
        ├── get_session()
        ├── update_session_status()
        ├── update_progress()
        ├── pause_session()
        ├── resume_session()
        ├── cancel_session()
        ├── complete_session()
        ├── fail_session()
        └── assign_worker()
```

### 6. Worker Pool (`app/workers/`)

**Responsibility:** Manage training workers

```python
WorkerPool
    │
    ├── Workers: Dict[str, TrainingWorker]
    ├── Available Workers: List[str]
    │
    └── Methods
        ├── initialize()
        ├── get_available_worker()
        ├── release_worker()
        ├── get_worker()
        └── shutdown()

TrainingWorker
    │
    ├── worker_id: str
    ├── status: WorkerStatus
    ├── current_session: TrainingSession
    │
    └── Methods
        ├── start()
        ├── stop()
        ├── execute_training()
        ├── pause()
        ├── resume()
        └── get_resource_usage()
```

### 7. Process Manager (`app/process/`)

**Responsibility:** Process monitoring and resource management

```python
TrainingProcessManager
    │
    ├── Processes: Dict[int, ProcessInfo]
    │
    └── Methods
        ├── start_monitoring()
        ├── stop_monitoring()
        ├── register_process()
        ├── unregister_process()
        ├── get_process()
        ├── stop_process()
        ├── kill_process()
        └── check_system_resources()

ProcessInfo
    │
    ├── pid: int
    ├── _process: psutil.Process
    │
    └── Methods
        ├── is_running()
        ├── get_resource_usage()
        ├── terminate()
        └── kill()
```

### 8. Event Bus (`app/events/`)

**Responsibility:** Event-driven communication

```python
EventBus
    │
    ├── Subscribers: Dict[EventType, List[Callable]]
    ├── Event History: List[Event]
    │
    └── Methods
        ├── subscribe()
        ├── unsubscribe()
        ├── emit()
        ├── get_events()
        └── clear_history()

Event Types:
    ├── TRAINING_CREATED
    ├── TRAINING_QUEUED
    ├── TRAINING_STARTED
    ├── TRAINING_PAUSED
    ├── TRAINING_RESUMED
    ├── TRAINING_COMPLETED
    ├── TRAINING_CANCELLED
    ├── TRAINING_FAILED
    ├── PROGRESS_UPDATED
    ├── EPOCH_STARTED
    ├── EPOCH_COMPLETED
    ├── CHECKPOINT_SAVED
    ├── WORKER_STARTED
    ├── WORKER_STOPPED
    ├── WORKER_ERROR
    ├── WORKER_HEARTBEAT
    ├── JOB_QUEUED
    ├── JOB_ASSIGNED
    ├── JOB_COMPLETED
    ├── JOB_FAILED
    ├── RESOURCE_WARNING
    └── RESOURCE_CRITICAL
```

## 🔄 Data Flow

### Job Submission Flow

```
1. NestJS Backend
   │
   └─> POST /api/v1/training/session
       │
2. API Layer (FastAPI)
   ├─> Validate Request (Middleware)
   ├─> Authenticate (API Key)
   │
3. Job Runner
   ├─> Create TrainingJob
   ├─> Validate Configuration
   │
4. Queue Manager
   ├─> Add to Queue
   ├─> Set Status: QUEUED
   │
5. Event Bus
   └─> Emit: JOB_QUEUED
```

### Job Execution Flow

```
1. Job Runner Loop
   ├─> Check for available worker
   ├─> Get next job from queue
   │
2. Session Manager
   ├─> Create TrainingSession
   ├─> Set Status: PENDING
   │
3. Worker Assignment
   ├─> Assign worker to session
   ├─> Update Status: RUNNING
   │
4. Worker Execution
   ├─> Initialize environment
   ├─> Execute training loop
   ├─> Emit progress events
   │
5. Progress Updates
   ├─> Update metrics
   ├─> Update resource usage
   ├─> Emit: PROGRESS_UPDATED
   │
6. Completion
   ├─> Update Status: COMPLETED
   ├─> Release worker
   └─> Emit: TRAINING_COMPLETED
```

### Event Flow

```
Component          Event Bus          Subscribers
   │                  │                    │
   ├─> emit() ───────>│                    │
   │                  ├─> notify ─────────>│
   │                  │                    ├─> handle()
   │                  │                    │
   │                  ├─> log event        │
   │                  └─> store history    │
```

## 🗄️ Data Models

### Core Models

```python
TrainingStatus (Enum)
    ├── PENDING
    ├── QUEUED
    ├── RUNNING
    ├── PAUSED
    ├── COMPLETED
    ├── FAILED
    └── CANCELLED

TrainingType (Enum)
    ├── VOICE_CLONING
    ├── FINE_TUNING
    ├── LORA
    ├── QLORA
    └── CUSTOM

WorkerStatus (Enum)
    ├── IDLE
    ├── INITIALIZING
    ├── RUNNING
    ├── PAUSED
    ├── STOPPING
    ├── STOPPED
    └── ERROR
```

### Domain Models

```python
TrainingConfig
    ├── training_type: TrainingType
    ├── dataset_id: str
    ├── model_name: str
    ├── hyperparameters: dict
    ├── training_args: dict
    ├── batch_size: int
    ├── num_epochs: int
    ├── learning_rate: float
    └── ... (advanced config)

TrainingSession
    ├── session_id: str
    ├── job_id: str
    ├── status: TrainingStatus
    ├── config: TrainingConfig
    ├── progress: float
    ├── current_epoch: int
    ├── current_step: int
    ├── total_steps: int
    ├── metrics: TrainingMetrics
    ├── resource_usage: ResourceUsage
    ├── timestamps: ...
    ├── worker_id: str
    └── error_message: str

TrainingJob
    ├── job_id: str
    ├── user_id: str
    ├── project_id: str
    ├── training_config: TrainingConfig
    ├── status: TrainingStatus
    ├── priority: int
    ├── session_id: str
    ├── worker_id: str
    └── timestamps: ...

Worker
    ├── worker_id: str
    ├── status: WorkerStatus
    ├── current_session_id: str
    ├── current_job_id: str
    ├── process_id: int
    ├── resource_usage: ResourceUsage
    └── metadata: dict
```

## 🔐 Security Architecture

```
Request Flow:
    │
    ├─> 1. HTTPS (Production)
    │
    ├─> 2. API Key Authentication
    │      ├─> Header: X-API-Key
    │      └─> Validate against INTERNAL_API_KEY
    │
    ├─> 3. Input Validation
    │      └─> Pydantic Schemas
    │
    ├─> 4. Authorization
    │      └─> Service-to-Service (Future)
    │
    └─> 5. Rate Limiting (Future)
```

## 📊 Monitoring Architecture

```
Logging Stack:
    │
    ├─> Loguru
    │   ├─> Console Handler (Development)
    │   ├─> File Handler (JSON)
    │   └─> Error Handler (Errors only)
    │
    ├─> Specialized Loggers
    │   ├─> TrainingLogger
    │   ├─> SessionLogger
    │   ├─> WorkerLogger
    │   └─> APILogger
    │
    └─> Future Integrations
        ├─> ELK Stack
        ├─> CloudWatch
        └─> DataDog
```

## 🚀 Scalability Architecture

### Horizontal Scaling (Future)

```
Load Balancer
    │
    ├─> Training Engine Instance 1
    │   └─> Worker Pool (2 workers)
    │
    ├─> Training Engine Instance 2
    │   └─> Worker Pool (2 workers)
    │
    └─> Training Engine Instance N
        └─> Worker Pool (2 workers)

Shared State:
    ├─> Redis Queue
    ├─> Shared File System
    └─> Database (via NestJS)
```

### Vertical Scaling (Current)

```
Single Instance
    │
    ├─> Worker Pool
    │   ├─> Worker 1 (1 CPU core, 2GB RAM)
    │   └─> Worker 2 (1 CPU core, 2GB RAM)
    │
    └─> Resource Limits
        ├─> MAX_CPU_PERCENT: 80%
        ├─> MAX_MEMORY_PERCENT: 85%
        └─> MIN_DISK_SPACE_GB: 10
```

## 🔮 Future Architecture Extensions

### Phase 4.4.4.2 - Dataset Integration

```
Dataset Layer
    │
    ├─> Dataset Loader
    ├─> Preprocessor
    ├─> Audio Processor
    └─> Tokenizer
```

### Phase 4.4.4.3 - Model Training

```
Training Layer
    │
    ├─> PyTorch Integration
    ├─> Model Loader
    ├─> Trainer
    ├─> Validation Loop
    └─> Checkpoint Manager
```

### Phase 4.4.4.4 - GPU Training

```
GPU Layer
    │
    ├─> CUDA Device Manager
    ├─> Multi-GPU Coordinator
    ├─> Mixed Precision Handler
    └─> Memory Optimizer
```

### Phase 4.4.4.5 - LoRA/QLoRA

```
PEFT Layer
    │
    ├─> LoRA Adapter
    ├─> QLoRA Quantizer
    ├─> Adapter Merger
    └─> Fine-tuning Manager
```

## 📐 Design Patterns

### Used Patterns

1. **Factory Pattern** - Worker creation
2. **Observer Pattern** - Event Bus
3. **Strategy Pattern** - Queue implementations
4. **Singleton Pattern** - Core components
5. **Command Pattern** - Job execution
6. **State Pattern** - Training status
7. **Repository Pattern** - Session/Queue storage

### Architectural Principles

1. **Separation of Concerns** - Clear module boundaries
2. **Dependency Injection** - Loose coupling
3. **Interface-based Design** - Extensibility
4. **Event-Driven Architecture** - Decoupled communication
5. **SOLID Principles** - Maintainable code
6. **DRY (Don't Repeat Yourself)** - Code reuse
7. **KISS (Keep It Simple)** - Simple solutions

---

**Architecture Status:** ✅ **PRODUCTION READY**

This architecture provides a solid foundation for enterprise AI training operations with room for future enhancements.
