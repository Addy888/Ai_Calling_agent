# Enterprise Distributed Training Engine

## Overview

The Enterprise Distributed Training Engine provides production-ready distributed training capabilities for AI models, scaling from single-GPU to multi-node enterprise clusters.

## Features

- **Multiple Strategies**: Accelerate, DDP, FSDP, DeepSpeed
- **Hardware Detection**: Auto-detect GPUs, CPUs, memory
- **Mixed Precision**: FP16, BF16 support
- **Fault Tolerance**: Worker recovery, health monitoring
- **Communication Primitives**: Broadcast, All-Reduce, Gather, Scatter
- **Cluster Management**: Multi-node coordination
- **Runtime Metrics**: GPU utilization, throughput, communication overhead
- **REST APIs**: Full API for distributed training management

## Architecture

```
distributed/
├── distributed_manager.py      # Core orchestration
├── device_manager.py           # Hardware detection
├── accelerate_integration.py   # HuggingFace Accelerate
├── ddp_integration.py          # PyTorch DDP
├── fsdp_integration.py         # PyTorch FSDP
├── deepspeed_integration.py    # DeepSpeed integration
├── cluster/                    # Multi-node management
├── launcher/                   # Process spawning
├── communication/              # Collective operations
├── health/                     # Monitoring & fault tolerance
├── runtime/                    # Metrics & execution tracking
├── services/                   # High-level services
└── api.py                      # REST endpoints
```

## Quick Start

### Single-GPU Training

```python
from app.distributed import distributed_service
from app.distributed.schemas import DistributedConfig, DistributedStrategy

# Configure
config = DistributedConfig(
    strategy=DistributedStrategy.NONE,
    num_processes=1,
)

# Initialize
status = distributed_service.initialize(config)

# Prepare model and data
model, optimizer, train_dataloader, _, _ = distributed_service.prepare_for_training(
    model=model,
    optimizer=optimizer,
    train_dataloader=train_dataloader,
)

# Training loop
for batch in train_dataloader:
    outputs = model(**batch)
    loss = outputs.loss
    
    distributed_service.backward(loss)
    optimizer.step()
    optimizer.zero_grad()
```

### Multi-GPU Training (Accelerate)

```python
from app.distributed import distributed_service
from app.distributed.schemas import DistributedConfig, DistributedStrategy, MixedPrecision

# Configure for multi-GPU
config = DistributedConfig(
    strategy=DistributedStrategy.ACCELERATE,
    num_processes=4,  # 4 GPUs
    mixed_precision=MixedPrecision.FP16,
)

# Initialize
status = distributed_service.initialize(config, project_dir="./output")

# Prepare for distributed training
model, optimizer, train_dataloader, eval_dataloader, lr_scheduler = \
    distributed_service.prepare_for_training(
        model=model,
        optimizer=optimizer,
        train_dataloader=train_dataloader,
        eval_dataloader=eval_dataloader,
        lr_scheduler=lr_scheduler,
        config=config,
    )

# Training loop
for batch in train_dataloader:
    outputs = model(**batch)
    loss = outputs.loss
    
    distributed_service.backward(loss)
    optimizer.step()
    lr_scheduler.step()
    optimizer.zero_grad()
    
    # Save checkpoint (only main process)
    if distributed_service.is_main_process():
        distributed_service.save_checkpoint(
            output_dir="./checkpoints",
            model=model,
            optimizer=optimizer,
        )
```

### Multi-Node Training

```python
# Node 0 (master)
config = DistributedConfig(
    strategy=DistributedStrategy.ACCELERATE,
    num_processes=8,  # 8 GPUs per node
    num_machines=4,   # 4 nodes
    machine_rank=0,   # This is node 0
    main_process_ip="192.168.1.100",
    main_process_port=29500,
)

# Node 1, 2, 3 (workers)
config = DistributedConfig(
    strategy=DistributedStrategy.ACCELERATE,
    num_processes=8,
    num_machines=4,
    machine_rank=1,  # Change for each node
    main_process_ip="192.168.1.100",
    main_process_port=29500,
)
```

### FSDP for Large Models

```python
config = DistributedConfig(
    strategy=DistributedStrategy.FSDP,
    num_processes=8,
    fsdp_sharding_strategy="full_shard",
    fsdp_offload=True,  # Offload to CPU
    fsdp_auto_wrap=True,
    mixed_precision=MixedPrecision.BF16,
)
```

### DeepSpeed ZeRO

```python
config = DistributedConfig(
    strategy=DistributedStrategy.DEEPSPEED,
    num_processes=8,
    deepspeed_config={
        "train_batch_size": 128,
        "train_micro_batch_size_per_gpu": 16,
        "gradient_accumulation_steps": 1,
        "zero_optimization": {
            "stage": 3,
            "offload_optimizer": {
                "device": "cpu",
                "pin_memory": True
            },
        },
        "fp16": {
            "enabled": True,
        },
    },
)
```

## REST API Usage

### Start Distributed Training

```bash
POST /distributed/start
Content-Type: application/json
Authorization: Bearer <token>

{
  "job_id": "training_job_001",
  "config": {
    "strategy": "accelerate",
    "num_processes": 4,
    "mixed_precision": "fp16"
  },
  "model_config": {...},
  "training_config": {...}
}
```

### Get Status

```bash
GET /distributed/status
Authorization: Bearer <token>
```

Response:
```json
{
  "is_distributed": true,
  "strategy": "accelerate",
  "num_processes": 4,
  "world_size": 4,
  "rank": 0,
  "is_main_process": true,
  "devices": [
    {
      "device_type": "cuda",
      "device_id": 0,
      "device_name": "NVIDIA A100",
      "total_memory_gb": 40.0,
      "supports_bf16": true
    }
  ]
}
```

### Get Health

```bash
GET /distributed/health
Authorization: Bearer <token>
```

### Stop Training

```bash
POST /distributed/stop
Content-Type: application/json
Authorization: Bearer <token>

{
  "job_id": "training_job_001",
  "graceful": true
}
```

## Device Detection

```python
from app.distributed import device_manager

# Detect all devices
devices = device_manager.detect_devices()

# Get device count
count = device_manager.get_device_count()

# Get recommendations
backend = device_manager.get_recommended_backend()
precision = device_manager.get_recommended_precision()

# Check capabilities
is_distributed_available = device_manager.is_distributed_available()
```

## Communication Primitives

```python
from app.distributed.communication import collective_ops

# Broadcast
collective_ops.broadcast(tensor, src=0)

# All-Reduce
collective_ops.all_reduce(tensor, op="mean")

# Gather
tensors = collective_ops.all_gather(tensor)

# Barrier
collective_ops.barrier(timeout_seconds=300)
```

## Health Monitoring

```python
from app.distributed.health import health_monitor

# Register workers
health_monitor.register_worker(rank=0)

# Update heartbeat
health_monitor.update_heartbeat(rank=0)

# Check health
is_healthy = health_monitor.check_worker_health(rank=0)

# Get cluster health
summary = health_monitor.get_cluster_health_summary()
```

## Fault Tolerance

```python
from app.distributed.health import fault_tolerance

# Register recovery hooks
def recovery_hook(worker_rank, error, context):
    print(f"Recovering worker {worker_rank}")

fault_tolerance.register_recovery_hook("custom_recovery", recovery_hook)

# Handle failures
fault_tolerance.handle_worker_failure(
    worker_rank=1,
    error=exception,
    context={"job_id": "job_001"},
)

# Check if can continue
can_continue = fault_tolerance.can_continue_training(
    failed_workers=[1],
    total_workers=8,
    min_workers_threshold=0.75,
)
```

## Runtime Metrics

```python
from app.distributed.runtime import metrics_collector

# Start collection
metrics_collector.start_collection("job_001")

# Collect metrics
metrics = metrics_collector.collect_metrics(
    job_id="job_001",
    global_step=100,
    rank=0,
    local_rank=0,
    loss=0.5,
    learning_rate=1e-4,
    batch_size=32,
    gradient_sync_time_ms=10.5,
    communication_time_ms=5.2,
)

# Get averages
avg_metrics = metrics_collector.get_average_metrics(last_n_steps=100)

# Export metrics
metrics_collector.export_metrics("metrics.json")
```

## Cluster Management

```python
from app.distributed.cluster import cluster_manager

# Initialize cluster
cluster_manager.initialize_cluster(
    num_nodes=4,
    node_rank=0,
    master_addr="192.168.1.100",
    master_port=29500,
)

# Get cluster health
health = cluster_manager.get_cluster_health()

# Broadcast data
data = cluster_manager.broadcast_to_cluster("config_data", src_rank=0)
```

## Configuration Reference

### DistributedConfig

- `strategy`: DistributedStrategy (NONE, DDP, FSDP, DEEPSPEED, ACCELERATE)
- `backend`: DistributedBackend (NCCL, GLOO, MPI) - auto-detected if None
- `num_processes`: Number of processes per node - auto-detected if None
- `num_machines`: Number of machines/nodes (default: 1)
- `machine_rank`: Current machine rank (default: 0)
- `main_process_ip`: Master node IP
- `main_process_port`: Master node port (default: 29500)
- `mixed_precision`: MixedPrecision (NO, FP16, BF16)
- `gradient_accumulation_steps`: Gradient accumulation (default: 1)
- `fsdp_sharding_strategy`: FSDP sharding ("full_shard", "shard_grad_op", "no_shard")
- `fsdp_offload`: Enable FSDP CPU offload (default: False)
- `deepspeed_config`: DeepSpeed configuration dict or file path

## Best Practices

1. **Start Simple**: Begin with single-GPU, then scale to multi-GPU, then multi-node
2. **Use Accelerate**: For most cases, Accelerate provides the best balance
3. **FSDP for Large Models**: Use FSDP when model doesn't fit in GPU memory
4. **DeepSpeed for Maximum Scale**: Use DeepSpeed ZeRO-3 for extreme scale
5. **Monitor Health**: Always enable health monitoring in production
6. **Save Checkpoints**: Save checkpoints only on main process
7. **Synchronize Workers**: Use barriers before critical operations
8. **Handle Failures**: Implement recovery hooks for production deployments

## Troubleshooting

### NCCL Errors
- Check CUDA versions match across nodes
- Verify network connectivity between nodes
- Set `NCCL_DEBUG=INFO` for detailed logs

### Out of Memory
- Reduce batch size
- Enable gradient checkpointing
- Use FSDP with CPU offload
- Enable DeepSpeed ZeRO optimization

### Communication Timeouts
- Increase `barrier_timeout_seconds`
- Check network bandwidth
- Verify all workers are responding

### Worker Failures
- Check health monitoring logs
- Verify GPU health with `nvidia-smi`
- Review fault tolerance settings

## Integration with Training Executor

The distributed engine integrates seamlessly with the existing Training Executor:

```python
from app.training_executor import training_executor
from app.distributed import distributed_service

# Training executor automatically uses distributed service
# when distributed config is provided in training request
```

## Performance Tips

1. **Batch Size**: Scale batch size with number of GPUs
2. **Communication**: Minimize cross-node communication
3. **Gradient Accumulation**: Use for effective larger batches
4. **Mixed Precision**: Enable FP16/BF16 for speedup
5. **Data Loading**: Use multiple data loader workers
6. **Profiling**: Monitor GPU utilization and communication overhead

## Support

For issues or questions:
- Check logs in `logs/` directory
- Review health status via REST API
- Enable debug logging with `LOG_LEVEL=DEBUG`

## Version

Phase: 4.4.4.5.7
Version: 1.0.0
