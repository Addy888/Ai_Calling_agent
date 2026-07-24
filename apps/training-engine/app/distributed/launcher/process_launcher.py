"""Process launcher for distributed training."""

import os
import sys
import subprocess
from typing import List, Dict, Optional, Any
from pathlib import Path

try:
    import torch
    import torch.multiprocessing as mp
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None
    mp = None

from app.logger import training_logger
from app.distributed.schemas import DistributedConfig
from app.distributed.exceptions import DistributedInitializationError


class ProcessLauncher:
    """
    Launches distributed training processes.
    
    Supports multiple launch methods:
    - torch.multiprocessing (single node)
    - torchrun/torch.distributed.launch (multi-node)
    - Custom subprocess spawning
    """

    def __init__(self):
        """Initialize process launcher."""
        self.logger = training_logger
        self._processes: List[Any] = []

    def launch_local(
        self,
        fn: callable,
        args: tuple = (),
        nprocs: Optional[int] = None,
        start_method: str = "spawn",
    ) -> None:
        """
        Launch training on a single node using multiprocessing.
        
        Args:
            fn: Training function to execute
            args: Arguments to pass to the function
            nprocs: Number of processes (default: number of GPUs)
            start_method: Process start method (spawn, fork, forkserver)
            
        Raises:
            DistributedInitializationError: If launch fails
        """
        if not TORCH_AVAILABLE:
            raise DistributedInitializationError("PyTorch is not available")
        
        try:
            # Determine number of processes
            if nprocs is None:
                nprocs = torch.cuda.device_count() if torch.cuda.is_available() else 1
            
            self.logger.info(
                f"Launching local training: "
                f"nprocs={nprocs}, start_method={start_method}"
            )
            
            # Set start method
            mp.set_start_method(start_method, force=True)
            
            # Spawn processes
            mp.spawn(
                fn=fn,
                args=args,
                nprocs=nprocs,
                join=True,
            )
            
            self.logger.info("Local training completed")
            
        except Exception as e:
            self.logger.error(f"Failed to launch local training: {e}")
            raise DistributedInitializationError(f"Local launch failed: {e}")

    def launch_torchrun(
        self,
        script_path: str,
        config: DistributedConfig,
        script_args: Optional[List[str]] = None,
    ) -> subprocess.Popen:
        """
        Launch training using torchrun.
        
        Args:
            script_path: Path to training script
            config: Distributed configuration
            script_args: Additional script arguments
            
        Returns:
            Process handle
            
        Raises:
            DistributedInitializationError: If launch fails
        """
        try:
            # Build torchrun command
            cmd = [
                sys.executable,
                "-m",
                "torch.distributed.run",
                "--nproc_per_node",
                str(config.num_processes or 1),
                "--nnodes",
                str(config.num_machines),
                "--node_rank",
                str(config.machine_rank),
            ]
            
            if config.main_process_ip:
                cmd.extend(["--master_addr", config.main_process_ip])
            
            cmd.extend(["--master_port", str(config.main_process_port)])
            
            # Add script and its arguments
            cmd.append(script_path)
            
            if script_args:
                cmd.extend(script_args)
            
            self.logger.info(f"Launching with torchrun: {' '.join(cmd)}")
            
            # Launch process
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            
            self._processes.append(process)
            
            return process
            
        except Exception as e:
            self.logger.error(f"Failed to launch with torchrun: {e}")
            raise DistributedInitializationError(f"Torchrun launch failed: {e}")

    def launch_custom(
        self,
        config: DistributedConfig,
        command: str,
        env: Optional[Dict[str, str]] = None,
    ) -> subprocess.Popen:
        """
        Launch custom distributed training command.
        
        Args:
            config: Distributed configuration
            command: Command to execute
            env: Environment variables
            
        Returns:
            Process handle
        """
        try:
            # Setup environment
            proc_env = os.environ.copy()
            
            # Add distributed environment variables
            proc_env.update({
                "WORLD_SIZE": str(config.num_processes * config.num_machines),
                "LOCAL_WORLD_SIZE": str(config.num_processes),
                "RANK": str(config.machine_rank),
                "LOCAL_RANK": "0",  # Will be set by each process
                "MASTER_ADDR": config.main_process_ip or "127.0.0.1",
                "MASTER_PORT": str(config.main_process_port),
            })
            
            if env:
                proc_env.update(env)
            
            self.logger.info(f"Launching custom command: {command}")
            
            # Launch process
            process = subprocess.Popen(
                command,
                shell=True,
                env=proc_env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            
            self._processes.append(process)
            
            return process
            
        except Exception as e:
            self.logger.error(f"Failed to launch custom command: {e}")
            raise DistributedInitializationError(f"Custom launch failed: {e}")

    def wait_for_processes(self, timeout: Optional[int] = None) -> List[int]:
        """
        Wait for all launched processes to complete.
        
        Args:
            timeout: Timeout in seconds
            
        Returns:
            List of return codes
        """
        return_codes = []
        
        for process in self._processes:
            try:
                return_code = process.wait(timeout=timeout)
                return_codes.append(return_code)
            except subprocess.TimeoutExpired:
                self.logger.warning(f"Process {process.pid} timed out")
                process.kill()
                return_codes.append(-1)
        
        return return_codes

    def terminate_all(self) -> None:
        """Terminate all launched processes."""
        self.logger.info("Terminating all processes")
        
        for process in self._processes:
            try:
                process.terminate()
                process.wait(timeout=10)
            except:
                try:
                    process.kill()
                except:
                    pass
        
        self._processes.clear()

    def cleanup(self) -> None:
        """Cleanup launcher resources."""
        self.terminate_all()


# Global instance
process_launcher = ProcessLauncher()
