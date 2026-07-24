"""
Enterprise Distributed Training Example

This example demonstrates distributed training using the AI Training Engine's
distributed training capabilities with multiple strategies.
"""

import torch
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer

from app.distributed import distributed_service
from app.distributed.schemas import (
    DistributedConfig,
    DistributedStrategy,
    MixedPrecision,
)
from app.logger import training_logger


# Example dataset
class DummyDataset(Dataset):
    """Dummy dataset for demonstration."""
    
    def __init__(self, size=1000, seq_length=128):
        self.size = size
        self.seq_length = seq_length
    
    def __len__(self):
        return self.size
    
    def __getitem__(self, idx):
        return {
            "input_ids": torch.randint(0, 1000, (self.seq_length,)),
            "labels": torch.randint(0, 1000, (self.seq_length,)),
        }


def example_single_gpu():
    """Example: Single GPU training."""
    print("\n=== Example 1: Single GPU Training ===")
    
    # Configure for single GPU
    config = DistributedConfig(
        strategy=DistributedStrategy.NONE,
        num_processes=1,
    )
    
    # Initialize
    status = distributed_service.initialize(config)
    print(f"Initialized: {status.num_processes} process(es)")
    
    # Your training code here
    print("Training on single GPU...")
    
    # Cleanup
    distributed_service.shutdown()
    print("Training complete!")


def example_multi_gpu_accelerate():
    """Example: Multi-GPU training with Accelerate."""
    print("\n=== Example 2: Multi-GPU with Accelerate ===")
    
    # Configure for multi-GPU
    config = DistributedConfig(
        strategy=DistributedStrategy.ACCELERATE,
        num_processes=4,  # 4 GPUs
        mixed_precision=MixedPrecision.FP16,
        gradient_accumulation_steps=2,
    )
    
    # Initialize
    status = distributed_service.initialize(config, project_dir="./output")
    print(f"Initialized: {status.num_processes} GPUs")
    print(f"Mixed Precision: {config.mixed_precision.value}")
    
    # Create model and optimizer
    print("Loading model...")
    model = AutoModelForCausalLM.from_pretrained("gpt2")
    optimizer = torch.optim.AdamW(model.parameters(), lr=5e-5)
    
    # Create dataloader
    dataset = DummyDataset(size=1000)
    dataloader = DataLoader(dataset, batch_size=8, shuffle=True)
    
    # Prepare for distributed training
    print("Preparing for distributed training...")
    model, optimizer, dataloader, _, _ = distributed_service.prepare_for_training(
        model=model,
        optimizer=optimizer,
        train_dataloader=dataloader,
    )
    
    # Training loop
    print("Starting training...")
    model.train()
    
    for epoch in range(2):
        for step, batch in enumerate(dataloader):
            # Forward pass
            outputs = model(**batch)
            loss = outputs.loss
            
            # Backward pass (handles distributed synchronization)
            distributed_service.backward(loss)
            
            # Optimizer step
            optimizer.step()
            optimizer.zero_grad()
            
            if step % 10 == 0 and distributed_service.is_main_process():
                print(f"Epoch {epoch}, Step {step}, Loss: {loss.item():.4f}")
            
            if step >= 50:  # Short demo
                break
        
        # Save checkpoint (only main process)
        if distributed_service.is_main_process():
            print(f"Saving checkpoint for epoch {epoch}")
            distributed_service.save_checkpoint(
                output_dir=f"./checkpoints/epoch_{epoch}",
                model=model,
                optimizer=optimizer,
            )
    
    # Cleanup
    distributed_service.shutdown()
    print("Multi-GPU training complete!")


def example_fsdp_large_model():
    """Example: FSDP for large model training."""
    print("\n=== Example 3: FSDP for Large Models ===")
    
    # Configure for FSDP
    config = DistributedConfig(
        strategy=DistributedStrategy.FSDP,
        num_processes=8,
        fsdp_sharding_strategy="full_shard",
        fsdp_offload=True,  # Offload to CPU for memory savings
        fsdp_auto_wrap=True,
        mixed_precision=MixedPrecision.BF16,
    )
    
    # Initialize
    status = distributed_service.initialize(config)
    print(f"Initialized FSDP: {status.num_processes} GPUs")
    print(f"Sharding: {config.fsdp_sharding_strategy}")
    print(f"CPU Offload: {config.fsdp_offload}")
    
    # Note: In real scenario, you'd load a large model here
    print("FSDP is configured for large model training")
    print("Model parameters are sharded across GPUs")
    
    distributed_service.shutdown()
    print("FSDP setup complete!")


def example_deepspeed_zero():
    """Example: DeepSpeed ZeRO optimization."""
    print("\n=== Example 4: DeepSpeed ZeRO ===")
    
    # Configure DeepSpeed
    config = DistributedConfig(
        strategy=DistributedStrategy.DEEPSPEED,
        num_processes=8,
        deepspeed_config={
            "train_batch_size": 128,
            "train_micro_batch_size_per_gpu": 16,
            "gradient_accumulation_steps": 1,
            "gradient_clipping": 1.0,
            "zero_optimization": {
                "stage": 3,  # ZeRO-3 for maximum memory savings
                "offload_optimizer": {
                    "device": "cpu",
                    "pin_memory": True
                },
                "offload_param": {
                    "device": "cpu",
                    "pin_memory": True
                },
                "overlap_comm": True,
                "contiguous_gradients": True,
                "reduce_bucket_size": 2e8,
                "allgather_bucket_size": 2e8,
            },
            "fp16": {
                "enabled": True,
                "loss_scale": 0,
                "initial_scale_power": 16,
            },
            "steps_per_print": 100,
        },
    )
    
    # Initialize
    status = distributed_service.initialize(config)
    print(f"Initialized DeepSpeed: {status.num_processes} GPUs")
    print("ZeRO Stage 3: Parameters, gradients, and optimizer states are partitioned")
    print("CPU Offloading: Enabled for optimizer and parameters")
    
    distributed_service.shutdown()
    print("DeepSpeed setup complete!")


def example_multi_node():
    """Example: Multi-node training configuration."""
    print("\n=== Example 5: Multi-Node Training ===")
    
    # Master node configuration
    master_config = DistributedConfig(
        strategy=DistributedStrategy.ACCELERATE,
        num_processes=8,  # 8 GPUs per node
        num_machines=4,   # 4 nodes total
        machine_rank=0,   # This is the master node
        main_process_ip="192.168.1.100",
        main_process_port=29500,
        mixed_precision=MixedPrecision.FP16,
    )
    
    print("Master Node Configuration:")
    print(f"  Total Machines: {master_config.num_machines}")
    print(f"  GPUs per Machine: {master_config.num_processes}")
    print(f"  Total GPUs: {master_config.num_machines * master_config.num_processes}")
    print(f"  Master IP: {master_config.main_process_ip}")
    print(f"  Master Port: {master_config.main_process_port}")
    
    # Worker node configuration (for nodes 1, 2, 3)
    print("\nWorker Node Configuration:")
    for rank in range(1, 4):
        worker_config = DistributedConfig(
            strategy=DistributedStrategy.ACCELERATE,
            num_processes=8,
            num_machines=4,
            machine_rank=rank,  # Rank 1, 2, or 3
            main_process_ip="192.168.1.100",
            main_process_port=29500,
            mixed_precision=MixedPrecision.FP16,
        )
        print(f"  Node {rank}: Rank={rank}, connects to {worker_config.main_process_ip}")
    
    print("\nMulti-node setup configured!")
    print("Run the same training script on each node with appropriate machine_rank")


def example_with_monitoring():
    """Example: Training with health monitoring and metrics."""
    print("\n=== Example 6: Training with Monitoring ===")
    
    from app.distributed.health import health_monitor
    from app.distributed.runtime import metrics_collector
    
    # Configure
    config = DistributedConfig(
        strategy=DistributedStrategy.ACCELERATE,
        num_processes=2,
        mixed_precision=MixedPrecision.FP16,
    )
    
    # Initialize
    status = distributed_service.initialize(config)
    
    # Start monitoring
    for rank in range(config.num_processes):
        health_monitor.register_worker(rank)
    
    metrics_collector.start_collection("demo_job")
    
    # Simulate training steps
    print("Training with monitoring...")
    for step in range(10):
        # Update heartbeat
        health_monitor.update_heartbeat(0)
        
        # Collect metrics
        metrics = metrics_collector.collect_metrics(
            job_id="demo_job",
            global_step=step,
            rank=0,
            local_rank=0,
            loss=0.5 - step * 0.01,
            learning_rate=5e-5,
            batch_size=32,
            gradient_sync_time_ms=10.5,
            communication_time_ms=5.2,
        )
        
        if step % 5 == 0:
            print(f"Step {step}: Loss={metrics.loss:.4f}, Sync Time={metrics.gradient_sync_time_ms:.2f}ms")
    
    # Get summary
    print("\nTraining Summary:")
    health_summary = health_monitor.get_cluster_health_summary()
    print(f"  Healthy Workers: {health_summary['healthy_workers']}/{health_summary['total_workers']}")
    
    avg_metrics = metrics_collector.get_average_metrics(last_n_steps=10)
    print(f"  Avg Loss: {avg_metrics['avg_loss']:.4f}")
    print(f"  Avg Sync Time: {avg_metrics['avg_gradient_sync_time_ms']:.2f}ms")
    print(f"  Avg Throughput: {avg_metrics['avg_samples_per_second']:.2f} samples/s")
    
    # Cleanup
    distributed_service.shutdown()
    print("Monitoring demo complete!")


def main():
    """Run all examples."""
    print("=" * 70)
    print("Enterprise Distributed Training Examples")
    print("=" * 70)
    
    # Run examples
    try:
        example_single_gpu()
        
        # Note: Multi-GPU examples require actual GPUs
        # Uncomment when running on multi-GPU systems
        # example_multi_gpu_accelerate()
        # example_fsdp_large_model()
        # example_deepspeed_zero()
        
        example_multi_node()  # Just shows configuration
        example_with_monitoring()
        
    except Exception as e:
        training_logger.error(f"Example failed: {e}")
        raise
    
    print("\n" + "=" * 70)
    print("All examples completed!")
    print("=" * 70)


if __name__ == "__main__":
    main()
