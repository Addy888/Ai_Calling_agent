# Distributed Training Quickstart Guide

## Phase 4.4.4.5.7 - Enterprise Distributed Training Engine

This quickstart guide helps you get started with distributed training in 5 minutes.

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
cd apps/training-engine
pip install -r requirements.txt
```

### Step 2: Verify Installation

```python
python -c "import torch; import accelerate; print(f'PyTorch: {torch.__version__}'); print(f'Accelerate: {accelerate.__version__}'); print(f'CUDA Available: {torch.cuda.is_available()}')"
```

### Step 3: Check Available Devices

```python
from app.distributed import device_manager

# Detect devices
devices = device_manager.detect_devices()
for device in devices:
    print(f"Device: {device.device_name} ({device.device_type.value})")

# Get recommendations
print(f"Recommended Backend: {device_manager.get_recommended_backend().value}")
print(f"Recommended Precision: {device_manager.get_recommended_precision().value}")
```

### Step 4: Single-GPU Training (1 Minute)

```python
from app.distributed import distributed_service
from app.distributed.schemas import DistributedConfig, DistributedStrategy

# Configure for single GPU
config = DistributedConfig(
    strategy=DistributedStrategy.NONE,
    num_processes=1,
)

# Initialize
status = distributed_service.initialize(config)
print(f"Status: {status.is_distributed}")

# Your training code here...

# Cleanup
distributed_service.shutdown()
```

### Step 5: Multi-GPU Training (2 Minutes)

```python
from app.distributed import distributed_service
from app.distributed.schemas import (
    DistributedConfig, 
    DistributedStrategy,
    MixedPrecision
)

# Configure for 4 GPUs
config = DistributedConfig(
    strategy=DistributedStrategy.ACCELERATE,
    num_processes=4,
    mixed_precision=MixedPrecision.FP16,
)

# Initialize
status = distributed_service.initialize(config)

# Prepare model for distributed training
model, optimizer, train_dataloader, _, _ = distributed_service.prepare_for_training(
    model=your_model,
    optimizer=your_optimizer,
    train_dataloader=your_dataloader,
)

# Training loop
for batch in train_dataloader:
    outputs = model(**batch)
    loss = outputs.loss
    
    distributed_service.backward(loss)
    optimizer.step()
    optimizer.zero_grad()

# Cleanup
distributed_service.shutdown()
```

---

## 📋 Common Use Cases

### Use Case 1: Fine-tune LLM on Single GPU

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
from app.distributed import distributed_service
from app.distributed.schemas import DistributedConfig, DistributedStrategy

# Load model
model = AutoModelForCausalLM.from_pretrained("gpt2")
tokenizer = AutoTokenizer.from_pretrained("gpt2")

# Configure (auto-detects single GPU)
config = DistributedConfig(strategy=DistributedStrategy.NONE)
distributed_service.initialize(config)

# Train...
```

### Use Case 2: Fine-tune Large Model with FSDP

```python
config = DistributedConfig(
    strategy=DistributedStrategy.FSDP,
    num_processes=8,
    fsdp_sharding_strategy="full_shard",
    fsdp_offload=True,  # Offload to CPU for memory
    mixed_precision=MixedPrecision.BF16,
)
```

### Use Case 3: Scale Training with DeepSpeed

```python
config = DistributedConfig(
    strategy=DistributedStrategy.DEEPSPEED,
    num_processes=8,
    deepspeed_config={
        "zero_optimization": {
            "stage": 3,
            "offload_optimizer": {"device": "cpu"},
        },
        "fp16": {"enabled": True},
    },
)
```

### Use Case 4: Multi-Node Training

```python
# Node 0 (master)
config = DistributedConfig(
    strategy=DistributedStrategy.ACCELERATE,
    num_processes=8,
    num_machines=4,
    machine_rank=0,
    main_process_ip="192.168.1.100",
)

# Node 1, 2, 3 (workers) - same config but change machine_rank
```

---

## 🎯 REST API Quick Reference

### Start Distributed Training

```bash
curl -X POST http://localhost:8000/api/v1/distributed/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "job_id": "job_001",
    "config": {
      "strategy": "accelerate",
      "num_processes": 4,
      "mixed_precision": "fp16"
    }
  }'
```

### Get Status

```bash
curl -X GET http://localhost:8000/api/v1/distributed/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Devices

```bash
curl -X GET http://localhost:8000/api/v1/distributed/devices \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Health

```bash
curl -X GET http://localhost:8000/api/v1/distributed/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Stop Training

```bash
curl -X POST http://localhost:8000/api/v1/distributed/stop \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "job_id": "job_001",
    "graceful": true
  }'
```

---

## 🔧 Configuration Cheat Sheet

### Strategies

| Strategy | Use Case | Memory | Speed |
|----------|----------|--------|-------|
| NONE | Single GPU | Low | Fast |
| ACCELERATE | Multi-GPU (auto) | Medium | Fast |
| DDP | Multi-GPU (manual) | Medium | Fast |
| FSDP | Large models | Low (sharded) | Medium |
| DEEPSPEED | Extreme scale | Very Low | Fast |

### Mixed Precision

| Precision | Hardware | Speed | Accuracy |
|-----------|----------|-------|----------|
| NO | Any | 1x | Highest |
| FP16 | Volta+ | 2-3x | High |
| BF16 | Ampere+ | 2-3x | Higher |

### FSDP Sharding

| Strategy | Memory | Communication |
|----------|--------|---------------|
| full_shard | Lowest | Highest |
| shard_grad_op | Medium | Medium |
| no_shard | Highest | Lowest |

### DeepSpeed ZeRO

| Stage | Partitions | Memory Savings |
|-------|------------|----------------|
| 1 | Optimizer | ~4x |
| 2 | Optimizer + Gradients | ~8x |
| 3 | Optimizer + Gradients + Parameters | ~Nx |

---

## 🐛 Troubleshooting

### Problem: "NCCL Error"

```bash
# Solution 1: Set NCCL debug
export NCCL_DEBUG=INFO

# Solution 2: Use Gloo backend
config.backend = DistributedBackend.GLOO
```

### Problem: "Out of Memory"

```python
# Solution 1: Reduce batch size
config.gradient_accumulation_steps = 4

# Solution 2: Enable FSDP with CPU offload
config.strategy = DistributedStrategy.FSDP
config.fsdp_offload = True

# Solution 3: Use DeepSpeed ZeRO-3
config.strategy = DistributedStrategy.DEEPSPEED
config.deepspeed_config = {"zero_optimization": {"stage": 3}}
```

### Problem: "Workers Not Syncing"

```python
# Solution: Increase timeout
config.barrier_timeout_seconds = 600

# Check health
from app.distributed.health import health_monitor
summary = health_monitor.get_cluster_health_summary()
print(summary)
```

### Problem: "Slow Training"

```python
# Check metrics
from app.distributed.runtime import metrics_collector
avg_metrics = metrics_collector.get_average_metrics()
print(f"Avg Sync Time: {avg_metrics['avg_gradient_sync_time_ms']}ms")

# Enable mixed precision
config.mixed_precision = MixedPrecision.FP16
```

---

## 📊 Monitoring

### Enable Health Monitoring

```python
from app.distributed.health import health_monitor

# Register workers
for rank in range(num_workers):
    health_monitor.register_worker(rank)

# Check health
is_healthy = health_monitor.check_worker_health(rank=0)
summary = health_monitor.get_cluster_health_summary()
```

### Collect Metrics

```python
from app.distributed.runtime import metrics_collector

# Start collection
metrics_collector.start_collection("job_id")

# Collect step metrics
metrics = metrics_collector.collect_metrics(
    job_id="job_id",
    global_step=100,
    rank=0,
    local_rank=0,
    loss=0.5,
    learning_rate=1e-4,
)

# Get averages
avg = metrics_collector.get_average_metrics(last_n_steps=100)
print(f"Avg Loss: {avg['avg_loss']}")
```

---

## 🎓 Best Practices

1. **Start Simple**: Begin with single GPU, then scale
2. **Use Accelerate**: Default choice for most cases
3. **Enable Mixed Precision**: 2-3x speedup with minimal accuracy loss
4. **Monitor Health**: Essential for production
5. **Save Checkpoints**: Only on main process
6. **Test Locally**: Before deploying to cluster
7. **Use Barriers**: Before critical operations
8. **Handle Failures**: Implement recovery hooks

---

## 📚 Next Steps

1. Read full documentation: `app/distributed/README.md`
2. Review examples: `examples/distributed_training_example.py`
3. Check API docs: http://localhost:8000/api/docs
4. Run tests: `pytest tests/test_distributed/`
5. Review phase summary: `PHASE_4_4_4_5_7_COMPLETE.md`

---

## 💡 Pro Tips

- **Batch Size**: Scale with number of GPUs
- **Gradient Accumulation**: For effective larger batches
- **Communication**: Use NCCL for GPUs, Gloo for CPU
- **Debugging**: Set `LOG_LEVEL=DEBUG` for detailed logs
- **Profiling**: Monitor GPU utilization with `nvidia-smi`

---

## ✅ Verification

```python
# Quick verification script
from app.distributed import distributed_service, device_manager

# Check devices
devices = device_manager.detect_devices()
print(f"✅ Found {len(devices)} device(s)")

# Test initialization
from app.distributed.schemas import DistributedConfig, DistributedStrategy
config = DistributedConfig(strategy=DistributedStrategy.NONE)
status = distributed_service.initialize(config)
print(f"✅ Distributed service initialized")

distributed_service.shutdown()
print(f"✅ All systems operational!")
```

---

**Ready to scale your training!** 🚀

For detailed documentation, see `app/distributed/README.md`
